/** @format */
import { Router } from "express";
import axios from "axios";
import DistancePost from "../models/distancePosts.js";
import WaterStation from "../models/waterStation.js";

// create a router
const router = Router();

router.get("/distancePosts/nearest", async (req, res) => {
  const { lat, long, limit = 1 } = req.query;
  // test query: http://localhost:8880/facilities/distancePosts/nearest?lat=22.3247157&long=114.2109974
  try {
    const latitude = parseFloat(lat);
    const longtitude = parseFloat(long);
    console.log("Query parameters:", { latitude, longtitude, limit });
    const closestPost = await DistancePost.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longtitude, latitude],
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
    res.json(closestPost);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

router.get("/waterStation/nearest", async (req, res) => {
  const { lat, long, limit = 1 } = req.query;
  try {
    const latitude = parseFloat(lat);
    const longtitude = parseFloat(long);
    console.log("Query parameters:", { latitude, longtitude, limit });
    const closestStation = await WaterStation.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longtitude, latitude],
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
    res.json(closestStation);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store the data in the database
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

// the code to store the data in the database
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

export default router;
