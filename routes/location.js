/** @format */

import { Router } from "express";
import axios from "axios";
import GeoName from "../models/geoName.js";
import fs from "fs";
import PlaceName from "../models/placeName.js";

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
          PlACE_TYPE: geoMatch.properties.PLACE_TYPE,
          PLACE_CLASS: geoMatch.properties.PLACE_CLASS,
        };
        placeNameData.push(placeName);
      }
    });
    res.json(placeNameData);
    await PlaceName.insertMany(transformedData);
    console.log("Data transformation and aggregation complete!");
  } catch (err) {
    console.error(err);
  }
});

export default router;
