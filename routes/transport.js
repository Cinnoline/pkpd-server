/** @format */

import { Router } from "express";
import https from "https";
import axios from "axios";
import KMBStop from "../models/kmbStop.js";
import GMBStop from "../models/gmbStop.js";
import GMBRoute from "../models/gmbRoute.js";

// create a router
const router = Router();

router.get("/kmbStops/nearest", async (req, res) => {
  // test query
  // http://localhost:8880/transport/kmbStops/nearest?lat=22.345130521&long=114.158208553
  try {
    const { lat, long } = req.query;
    const nearbyStops = await KMBStop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance: 4000, // 4km
          spherical: true,
        },
      },
      {
        $limit: 6,
      },
    ]).exec();

    const result = await Promise.all(
      nearbyStops.map(async (stop) => {
        const etaResponse = await axios.get(
          `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stop.stopId}`
        );
        const etaData = etaResponse.data.data;
        const formattedETA = {};

        etaData.forEach((item) => {
          const routeDestKey = `${item.route} - ${item.dest_en}`;
          // if the route-destination key does not exist, create it
          if (!formattedETA[routeDestKey]) {
            formattedETA[routeDestKey] = {
              route: item.route,
              destination: item.dest_en,
              eta: [],
              etaSeqSet: new Set(), // prevent duplicate eta due to multiple eta_seq with different service types
            };
          }
          // if in service, calculate the ETA
          if (
            item.eta &&
            !formattedETA[routeDestKey].etaSeqSet.has(item.eta_seq)
          ) {
            const etaTime = new Date(item.eta).getTime();
            const currentTime = new Date().getTime();
            const diffMinutes = Math.ceil((etaTime - currentTime) / 60000) + 1; // convert to minutes
            formattedETA[routeDestKey].eta.push(diffMinutes);
            formattedETA[routeDestKey].etaSeqSet.add(item.eta_seq);
          }
        });
        Object.values(formattedETA).forEach((item) => delete item.etaSeqSet);
        return {
          name: stop.name,
          geometry: stop.geometry.coordinates,
          eta: Object.values(formattedETA),
        };
      })
    );
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

router.get("/gmbStops/nearest", async (req, res) => {
  // test query
  // http://localhost:8880/transport/gmbStops/nearest?lat=22.331636331&long=114.168526503
  try {
    const { lat, long } = req.query;
    const nearbyStops = await GMBStop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance: 4000, // 4km
          spherical: true,
        },
      },
      {
        $limit: 1, // limit the number of stops to 3
      },
    ]).exec();
    const result = await Promise.all(
      nearbyStops.map(async (stop) => {
        const etaResponse = await axios.get(
          `https://data.etagmb.gov.hk/eta/stop/${stop.stop_id}`
        );
        const etaData = etaResponse.data.data;
        const formattedETA = [];
        for (const route of etaData) {
          //  findOne() in Mongoose must be async, or it will return a query object
          const routeInfo = await GMBRoute.findOne({
            route_id: route.route_id,
          }); // find the document of the route in DB
          const destination = routeInfo.directions[route.route_seq - 1]; // get the destination name by route_seq
          // get the ETA data of the route
          formattedETA.push({
            route: routeInfo.route_name, // name of the route
            destination: destination, // name of its destination
            eta: route.eta.map((etaItem) => etaItem.diff), // array of ETA in minutes of the route
          });
        }
        return {
          name: stop.stop_name,
          geometry: stop.geometry.coordinates,
          distance: stop.distance,
          etaDetails: Object.values(formattedETA),
        };
      })
    );
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store KMB stop coordinates data in the database, wrapped in a PUT request
router.put("/kmbStops", async (req, res) => {
  try {
    const response = await axios.get(
      "https://data.etabus.gov.hk/v1/transport/kmb/stop"
    );
    const stops = response.data;
    const mappedStops = stops.data.map((stops) => {
      return {
        stopId: stops.stop,
        name: stops.name_en,
        geometry: {
          type: "Point",
          coordinates: [parseFloat(stops.long), parseFloat(stops.lat)],
        },
      };
    });
    await KMBStop.insertMany(mappedStops);
    res.send("KMB stop data stored successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store Green Minibus stop coordinates data in the database, wrapped in a PUT request
// ** Note: The structure is awful because the request fetches data from multiple endpoints to
//          aggregate the stop data, and the request needs some time to run
router.put("/gmbStops", async (req, res) => {
  try {
    const regions = ["HKI", "KLN", "NT"];
    const fetchedStops = new Set();
    // fetch stop data from multiple endpoints
    for (const region of regions) {
      const response = await axios.get(
        `https://data.etagmb.gov.hk/route/${region}`
      );
      const routes = response.data.data.routes;
      // fetch data of each route
      for (const route of routes) {
        const routeDetailsResponse = await axios.get(
          `https://data.etagmb.gov.hk/route/${region}/${route}`
        );
        const routeDetails = routeDetailsResponse.data.data;
        // one route may have multiple details (actually special departures if applicable)
        for (const routeDetail of routeDetails) {
          // fetch stop data for each direction in one route detail
          for (const direction of routeDetail.directions) {
            const stopResponse = await axios.get(
              `https://data.etagmb.gov.hk/route-stop/${routeDetail.route_id}/${direction.route_seq}`
            );
            // store stop data
            for (const stop of stopResponse.data.data.route_stops) {
              // prevent duplicate stops, although they may appear in different routes with different names
              // ** Note: Completely accurate stop names can be realized, but it needs more time to process data
              if (!fetchedStops.has(stop.stop_id)) {
                fetchedStops.add(stop.stop_id);
                // get stop coordinates
                const stopDetailsResponse = await axios.get(
                  `https://data.etagmb.gov.hk/stop/${stop.stop_id}`
                );
                const stopCoordinates =
                  stopDetailsResponse.data.data.coordinates.wgs84;
                const stopData = {
                  stop_id: stop.stop_id,
                  stop_name: stop.name_en,
                  geometry: {
                    type: "Point",
                    coordinates: [
                      stopCoordinates.longitude,
                      stopCoordinates.latitude,
                    ],
                  },
                };
                await GMBStop.create(stopData);
              }
            }
          }
        }
      }
    }
    res.send("Green Minibus stop data stored successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store Green Minibus route data in the database, wrapped in a PUT request
// ** Note: The request needs some time to run
router.put("/gmbRoutes", async (req, res) => {
  try {
    const regions = ["HKI", "KLN", "NT"];
    // fetch stop data from multiple endpoints
    for (const region of regions) {
      const response = await axios.get(
        `https://data.etagmb.gov.hk/route/${region}`
      );
      const routes = response.data.data.routes;
      // fetch data of each route
      for (const route of routes) {
        const routeDetailsResponse = await axios.get(
          `https://data.etagmb.gov.hk/route/${region}/${route}`
        );
        const routeDetails = routeDetailsResponse.data.data;
        for (const routeDetail of routeDetails) {
          let destinations = [];
          // construct route name with region suffix, route code, and description
          const routeName = `${region} GMB Route ${routeDetail.route_code} (${routeDetail.description_en})`;
          // store destinations for each route to simplify the request for nearest stops
          for (const direction of routeDetail.directions) {
            destinations.push(direction.dest_en);
          }
          const routeDoc = {
            route_id: routeDetail.route_id,
            route_name: routeName,
            directions: destinations,
          };
          await GMBRoute.create(routeDoc);
        }
      }
    }
    res.send("Green Minibus route data stored successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// legacy code to get kmb bus stop data by native http GET request, wrapped in a router
router.get("/transportation", (req, res) => {
  const url = "https://data.etabus.gov.hk/v1/transport/kmb/stop";

  https.get(url, (response) => {
    let data = "";
    response.on("data", (chunk) => {
      data += chunk;
    });

    response.on("end", () => {
      const parsedData = JSON.parse(data);
      const filteredData = parsedData.data.map((item) => {
        return {
          stop: item.stop,
          name: item.name_en,
          lat: item.lat,
          long: item.long,
        };
      });

      res.send(filteredData);
    });
  });
});

export default router;
