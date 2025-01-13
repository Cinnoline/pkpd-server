/** @format */

import { Router } from "express";
import https from "https";
import axios from "axios";
import KMBStop from "../models/kmbStop.js";

// create a router
const router = Router();

router.get("/kmbStops/nearest", async (req, res) => {
  const { lat, long } = req.query;

  // test query
  // http://localhost:8880/transport/kmbStops/nearest?lat=22.345130521&long=114.158208553

  try {
    const nearestStops = await KMBStop.aggregate([
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
        $limit: 16,
      },
    ]).exec();

    const result = await Promise.all(
      nearestStops.map(async (stop) => {
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

// the code to store the data in the database, only map location by property, wrapped in a PUT request
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
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// legacy code to get kmb bus stop data by native http get request, wrapped in a router
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
