/** @format */
import { Router } from "express";
import axios from "axios";
import DistancePost from "../models/distancePosts.js";
import WaterStation from "../models/waterStation.js";
import BBQ from "../models/bbq.js";
import generateMapUrl from "./map.js";

// create a router
const router = Router();

// DO NOT WRITE USELESS API ENDPOINTS LIKE ME
router.get("/distancePosts/nearest", async (req, res) => {
  const { lat, long, limit = 1 } = req.query;
  // test request: http://localhost:8880/facilities/distancePosts/nearest?lat=22.3247157&long=114.2109974
  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    console.log("Query parameters:", { latitude, longitude, limit });
    const closestPost = await DistancePost.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          spherical: true,
          // maxDistance: 3000, // 3km
        },
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          _id: 0,
          FAC_ID: 1,
          REMARK: 1,
          coordinates: 1,
          distance: 1,
        },
      },
    ]);
    res.json(closestPost[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// get the nearest water filling station, not used in the project
router.get("/waterStation/nearest", async (req, res) => {
  const { lat, long, limit = 1 } = req.query;
  // test request: http://localhost:8880/facilities/waterStation/nearest?lat=22.3738157&long=114.264019
  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    const closestStation = await WaterStation.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 3000, // 3km
        },
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          _id: 0,
          geometry: "$geometry.coordinates",
          ADDRESS_EN: 1,
          FACILITY_NAME_EN: 1,
          COUNTRY_PARK_EN: 1,
          distance: 1,
        },
      },
    ]);
    const formattedResult = formatWaterFillingStationData(closestStation[0]);
    res.status(200).send(formattedResult);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// get the nearest water filling station, only return the name, the coordinates and the distance
router.get("/waterStation/coordinates", async (req, res) => {
  const { lat, long, limit = 1 } = req.query;
  // test request: http://localhost:8880/facilities/waterStation/coordinates?lat=22.3738157&long=114.264019
  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    const closestStation = await WaterStation.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 4000, // 4km
        },
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          _id: 0,
          geometry: "$geometry.coordinates",
          ADDRESS_EN: 1,
          FACILITY_NAME_EN: 1,
          COUNTRY_PARK_EN: 1,
          distance: 1,
        },
      },
    ]);

    if (!closestStation[0]) {
      res.status(200).send({ info: "" });
    } else {
      const formattedResult = formatWaterFillingStationInfo(closestStation[0]);
      res.json({ geometry: closestStation[0].geometry, info: formattedResult });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

router.get("/bbq/coordinates", async (req, res) => {
  const { lat, long } = req.query;
  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    const closestBBQ = await BBQ.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 4000, // 4km
        },
      },
      {
        $limit: 1,
      },
      {
        $project: {
          _id: 0,
          geometry: "$geometry.coordinates",
        },
      },
    ]);
    if (!closestBBQ[0]) {
      res.status(200).send({ geometry: null });
    }
    res.send({ geometry: closestBBQ[0].geometry });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store the data in the database, wrapped in a PUT request
router.put("/distance_posts", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.csdi.gov.hk/apim/dataquery/api/?id=afcd_rcd_1635136039113_86105&layer=distance_posts&bbox-crs=WGS84&bbox=113.8,22.1,114.7,23.0&limit=10000&offset=0"
    );

    const posts = response.data;
    const filteredPosts = posts.features.map((post) => {
      return {
        coordinates: post.geometry.coordinates,
        FAC_ID: post.properties.FAC_ID,
        REMARK: post.properties.REMARK,
      };
    });

    console.log(filteredPosts);
    await distancePostsSchema.insertMany(filteredPosts);
    console.log("Data saved successfully");
    res.json(filteredPosts);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store the data in the database, wrapped in a PUT request
router.put("/water_station", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.csdi.gov.hk/apim/dataquery/api/?id=afcd_rcd_1635133835075_48993&layer=cpwdl&bbox-crs=WGS84&bbox=113.8,22.1,114.7,23.0&limit=37&offset=0"
    );
    const station = response.data;
    const filteredStation = station.features.map((feature) => {
      const properties = feature.properties;
      const filteredProperties = Object.keys(properties).reduce((acc, key) => {
        // only keep the properties in English
        if (key.endsWith("_EN")) {
          acc[key] = properties[key];
        }
        return acc;
      }, {});
      return {
        geometry: feature.geometry,
        ...filteredProperties,
      };
    });
    await WaterStation.insertMany(filteredStation);
    console.log("Data saved successfully");
    res.json(filteredStation);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store the data in the database, wrapped in a PUT request
router.put("/bbq", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.csdi.gov.hk/apim/dataquery/api/?id=afcd_rcd_1635132752214_22438&layer=bbq&bbox-crs=WGS84&bbox=113.8,22.1,114.7,23.0&limit=155&offset=0"
    );
    const bbq = response.data;
    const filteredBBQ = bbq.features.map((feature) => feature.geometry); // only keep the coordinates
    await BBQ.insertMany(filteredBBQ);
    console.log("Data saved successfully");
    res.json(filteredBBQ);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

function formatWaterFillingStationData(waterStation) {
  return `\t\t${waterStation.COUNTRY_PARK_EN.toUpperCase()}\n
  ${waterStation.FACILITY_NAME_EN} in ${waterStation.ADDRESS_EN}\n
Location: ${waterStation.geometry[1]},   ${waterStation.geometry[0]}\n
Distance: ${waterStation.distance.toFixed(1)} meters\n`;
}

function formatWaterFillingStationInfo(waterStation) {
  return `${waterStation.FACILITY_NAME_EN}\n in ${
    waterStation.ADDRESS_EN
  } is ${waterStation.distance.toFixed(1)}m away from you,\nlocated at ${
    waterStation.geometry
  }`;
}

export default router;
