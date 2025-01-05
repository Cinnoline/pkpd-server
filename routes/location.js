/** @format */

import { Router } from "express";
import axios from "axios";
import GeoName from "../models/geoName.js";
import fs from "fs";
import PlaceName from "../models/placeName.js";

// create a router
const router = Router();

const distanceThresholds = {
  Cape: 144,
  Cave: 16,
  Hill: 1100,
  Island: 1000,
  Pass: 56,
  Peninsula: 480,
  Rock: 36,
  Valley: 260,
  Area: 1170,
  Town: 1680,
  Village: 400,
  Islands: 1280,
};
const sortedPlaceTypes = Object.keys(distanceThresholds).sort(
  (a, b) => distanceThresholds[b] - distanceThresholds[a]
);
router.get("/placeName", async (req, res) => {
  try {
    const { lat, long, limit = 1 } = req.query;
    // test request:
    // http://localhost:8880/location/placeName?lat=22.3244127&long=114.2109974 // HKUSPACE CC KEC
    // http://localhost:8880/location/placeName?lat=22.3352102&long=114.1959230 // San Po Kong Plaza
    // http://localhost:8880/location/placeName?lat=22.2573896&long=114.1994743 // Hong Kong Parkview
    // http://localhost:8880/location/placeName?lat=22.2150062&long=113.9896682 // Sea Ranch
    // http://localhost:8880/location/placeName?lat=22.3763815&long=114.0259942 // Tai Lam Chung Reservoir
    // http://localhost:8880/location/placeName?lat=22.2292117&long=114.2510047 // Shek O Beach
    // http://localhost:8880/location/placeName?lat=22.4313971&long=114.3762213 // Sharp Peak
    // http://localhost:8880/location/placeName?lat=22.4122522&long=114.1167129 // Tai Mo Shan Lookout
    // http://localhost:8880/location/placeName?lat=22.4250105&long=114.3535866 // Chek Keng Pier
    // http://localhost:8880/location/placeName?lat=22.4153040&long=114.3011849 // MacLehose Trail Section 3 near M061 post
    if (!long || !lat) {
      return res.status(400).send("Missing query parameters");
    }
    const latitude = parseFloat(lat);
    const longtitude = parseFloat(long);
    console.log("Query parameters:", { latitude, longtitude, limit });
    const results = [];
    for (const placeType of sortedPlaceTypes) {
      const distanceThreshold = distanceThresholds[placeType];
      const places = await PlaceName.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longtitude, latitude],
            },
            distanceField: "distance",
            maxDistance: distanceThreshold,
            spherical: true,
            query: { PLACE_TYPE: placeType },
          },
        },
        {
          $limit: parseInt(limit),
        },
      ]);
      if (places.length > 0) {
        const place = places[0];
        const name = place.NAME_ALIAS
          ? `${place.NAME_EN} (${place.NAME_ALIAS})`
          : place.NAME_EN;
        console.log(
          "Type:",
          placeType,
          "Name:",
          name,
          "Distance:",
          place.distance
        );
        results.push(name);
      }
    }
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store the GEO_PLACE_NAME data in the database
router.put("/geoName", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.csdi.gov.hk/apim/dataquery/api/?id=landsd_rcd_1648571595120_89752&layer=geo_place_name&bbox-crs=WGS84&bbox=113.8,22.1,114.7,23.0&limit=2690&offset=0"
    );
    const geoPlaceName = response.data;
    // filter out hydrographic place names
    const filteredGeoName = geoPlaceName.features
      .filter((feature) => feature.properties.PLACE_CLASS !== "Hydrographic")
      .map((feature) => {
        const { geometry, properties } = feature;
        const { OBJECTID: _id, ...restProperties } = properties;
        return {
          _id,
          geometry,
          properties: restProperties,
        };
      });
    await GeoName.insertMany(filteredGeoName);
    console.log("Data saved successfully");
    res.json(filteredGeoName);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to aggregate PLACE_NAME data with GEO_PLACE_NAME data and store them in the database
router.put("/placeName", async (req, res) => {
  try {
    // Download: https://portal.csdi.gov.hk/geoportal/?datasetId=landsd_rcd_1648571595120_89752#metadataInfoPanel
    // read the json file
    const data = JSON.parse(
      fs.readFileSync(
        "C:\\Users\\Cinnoline\\OneDrive\\Desktop\\S\\PKPD\\Download_data\\PlaceName_GEOJSON\\GeoName_PlaceName_20241106.gdb_PLACE_NAME_converted.json",
        "utf8"
        // "C:\\Your\\Path\\PlaceName_GEOJSON\\GeoName_PlaceName_20241106.gdb_GEO_PLACE_NAME_converted.json",
      )
    );
    const geoNames = await GeoName.find().exec();
    const geoNameIds = geoNames.map((doc) => doc.properties.GEO_NAME_ID);
    const filteredPlaceName = data.features.filter((feature) =>
      geoNameIds.includes(feature.properties.GEO_NAME_ID)
    );

    let placeNameData = [];

    // aggregate the data
    filteredPlaceName.forEach((feature) => {
      const geoNameId = feature.properties.GEO_NAME_ID;
      // find the matching geoName in the geoNames collection
      const geoMatch = geoNames.find(
        (doc) => doc.properties.GEO_NAME_ID === geoNameId
      );

      if (geoMatch) {
        // if the place name is an alias, skip it (all places have official names)
        if (feature.properties.NAME_STATUS === "Alias") {
          return;
        }
        // find if there is an alias
        const aliasFeature = filteredPlaceName.find(
          (doc) =>
            doc.properties.GEO_NAME_ID === geoNameId &&
            doc.properties.NAME_STATUS === "Alias"
        );
        const placeName = {
          geometry: geoMatch.geometry,
          GEO_NAME_ID: geoNameId,
          NAME_EN: feature.properties.NAME_EN,
          NAME_ALIAS: !aliasFeature ? null : aliasFeature.properties.NAME_EN,
          DISTRICT: geoMatch.properties.DISTRICT,
          PLACE_TYPE: geoMatch.properties.PLACE_TYPE,
          PLACE_CLASS: geoMatch.properties.PLACE_CLASS,
        };
        placeNameData.push(placeName);
      }
    });
    res.json(placeNameData);
    await PlaceName.insertMany(placeNameData);
    console.log("Data transformation and aggregation complete!");
  } catch (err) {
    console.error(err);
  }
});

export default router;
