/** @format */

import express from "express";
import { Router } from "express";
import axios from "axios";
import GeoName from "../models/geoName.js";
import fs from "fs";
import PlaceName from "../models/placeName.js";
import GPSData from "../models/gpsData.js";
import dotenv from "dotenv";
import { sendEmailAlert } from "./sendEmailAlert.js";

dotenv.config();

// create a router
const router = Router();
router.use(express.json());

let stationaryStartTimestamp = null;
let lastEmailSent = null;

const districtNames = {
  SK: "Sai Kung",
  STH: "Southern",
  ST: "Sha Tin",
  NTH: "North",
  YL: "Yuen Long",
  WC: "Wan Chai",
  TP: "Tai Po",
  TW: "Tsuen Wan",
  ILD: "Islands",
  KC: "Kwai Tsing",
  KT: "Kwun Tong",
  KLC: "Kowloon City",
  EST: "Eastern",
  CW: "Central and Western",
  SSP: "Sham Shui Po",
  WTS: "Wong Tai Sin",
  YTM: "Yau Tsim Mong",
  TM: "Tuen Mun",
};

const distanceThresholds = {
  Cape: 144,
  Cave: 18,
  Hill: 1110,
  Island: 1680,
  Pass: 56,
  Peninsula: 840,
  Rock: 36,
  Valley: 260,
  Area: 1170,
  Town: 1860,
  Village: 400,
  Islands: 1800,
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
    // http://localhost:8880/location/placeName?lat=22.4153040&long=114.3011849 // Maclehose Trail Section 3 near M061 post
    // http://localhost:8880/location/placeName?lat=22.2009033&long=114.0175582 // Cheung Po Tsai Cave
    if (!long || !lat) {
      return res.status(400).send("Missing query parameters");
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    console.log("Query parameters:", { latitude, longitude, limit });
    const results = [];
    const allPlaces = [];
    let closestPlace = null;

    // query the closest one for all place types
    for (const placeType of sortedPlaceTypes) {
      const places = await PlaceName.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            distanceField: "distance",
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
        allPlaces.push(place);

        if (!closestPlace || place.distance < closestPlace.distance) {
          closestPlace = place;
        }
      }
    }
    const closestDistrictCode = closestPlace ? closestPlace.DISTRICT : null;
    const closestDistrict = closestDistrictCode
      ? districtNames[closestDistrictCode]
      : null;

    // only display place names within corresponding threshold
    allPlaces.forEach((place) => {
      const placeType = place.PLACE_TYPE;
      const distanceThreshold = distanceThresholds[placeType];
      console.log(place.NAME_EN, place.distance);
      if (place.distance <= distanceThreshold) {
        const name = place.NAME_ALIAS
          ? `${place.NAME_EN} (${place.NAME_ALIAS})`
          : place.NAME_EN;
        results.push(name);
      }
    });
    res.status(200).json({ district: closestDistrict, places: results });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to save track data in request body and handle the condition that the user stands stationary for too long
router.post("/track", async (req, res) => {
  // request body example:
  // {
  //   "time": 1702362000,
  //   "location": [
  //     114.237695502
  //     22.384904081
  //   ]
  // }
  try {
    const { time, location } = req.body;
    const [longitude, latitude] = location;
    if (!time || !latitude || !longitude) {
      return res.status(400).send("Invalid data");
    }
    // transfer time from Epoch & Unix time to ISO 8601 String
    const date = new Date(time * 1000);
    const timestamp = new Date(date.getTime());
    const isoString = timestamp.toISOString();
    console.log("ISO String:" + isoString);

    // store in the database
    const gpsData = new GPSData({
      timestamp: isoString,
      location: { type: "Point", coordinates: [longitude, latitude] },
    });
    await gpsData.save();

    const requiredEntries = (4 * 60) / 2; // tracking every 2 minutes
    const stationaryThreshold = 100; // define stationary threshold (100m)
    // get time four hours ago
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    // get all points within the last four hours
    const points = await GPSData.find({
      timestamp: { $gte: fourHoursAgo },
    });

    // if last four hours were recorded consecutively
    if (points.length >= requiredEntries - 1) {
      // get the most distant entry
      const result = await GPSData.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [longitude, latitude] },
            distanceField: "distance",
            query: {
              timestamp: { $gte: fourHoursAgo }, // within the latest 4 hours
            },
            spherical: true,
          },
        },
        { $sort: { distance: -1 } }, // sort by distance in descending order
        { $limit: 1 }, // get the most distant point
      ]);

      const maxDistance = result[0]?.distance || 0;

      // determine whether the user is stationary in the last four hours
      if (maxDistance < stationaryThreshold) {
        const emailInterval = 60 * 60 * 1000; // send an email hourly
        const now = Date.now();
        // if the user has been stationary for the first time in the last four hours
        if (!stationaryStartTimestamp) {
          stationaryStartTimestamp = fourHoursAgo; // set the start time of stationary
        }
        // if the last email was not sent or the last email was sent more than an hour ago
        if (!lastEmailSent || now - lastEmailSent >= emailInterval) {
          const intervalHours = Math.floor(
            (now - stationaryStartTimestamp) / emailInterval
          ); // calculate the interval in hours
          // if the user has been stationary for more than 4 hours, send an email hourly
          await sendEmailAlert(latitude, longitude, intervalHours);
          lastEmailSent = now; // set the last email sent time
        }
      } else {
        // reset the start time of stationary if the user is no longer stationary
        stationaryStartTimestamp = null;
        lastEmailSent = null; // reset the last email sent time
      }
    }
    res.status(200).send("GPS data saved");
  } catch (err) {
    res.status(500).send("err.message");
  }
});

// the code to store the GEO_PLACE_NAME data in the database, wrapped in a PUT request
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

// the code to aggregate PLACE_NAME data with GEO_PLACE_NAME data and store them in the database, wrapped in a PUT request
router.put("/placeName", async (req, res) => {
  try {
    // Download: https://portal.csdi.gov.hk/geoportal/?datasetId=landsd_rcd_1648571595120_89752#metadataInfoPanel
    // read the json file
    const data = JSON.parse(
      fs.readFileSync(
        "./Your/Path/PlaceName_GEOJSON/GeoName_PlaceName_20241106.gdb_GEO_PLACE_NAME_converted.json",
        "utf8"
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
          NAME_ALIAS: aliasFeature?.properties?.NAME_EN ?? null,
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
