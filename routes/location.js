/** @format */

import { Router } from "express";
import axios from "axios";
import GeoName from "../models/geoName.js";
import fs from "fs";

// create a router
const router = Router();

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
  // Download: https://portal.csdi.gov.hk/geoportal/?datasetId=landsd_rcd_1648571595120_89752#metadataInfoPanel
  // read the json file
  const data = JSON.parse(
    fs.readFileSync(
      "C:\\Users\\Cinnoline\\OneDrive\\Desktop\\S\\PKPD\\Download_data\\PlaceName_GEOJSON.json",
      "utf8"
    )
  );

  // const filteredPlaceName = data.features.map((feature) => {
  //   const { geometry, properties } = feature;
  //   const { OBJECTID: _id, ...restProperties } = properties;
  //   return {
  //     _id,
  //     geometry,
  //     properties: restProperties,
  //   };
  // });

  // await Name.insertMany(
  //   data.features.map((feature) => ({
  //     type: feature.type,
  //     geometry: feature.geometry,
  //     properties: feature.properties,
  //   }))
  // )
  //   .then(() => {
  //     console.log("Data inserted");
  //   })
  //   .catch((error) => {
  //     console.error("Error inserting data:", error);
  //   });
});

export default router;
