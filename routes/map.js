/** @format */

import dotenv from "dotenv";
import { Router } from "express";
import express from "express";
import axios from "axios";

dotenv.config({ path: "../.env" });

// create a router
const router = Router();

// use the express.json middleware
router.use(express.json());
// icon for each type of data, the Google Static Maps API requires the icon image to be accessible via a URL
// ** Note: the icon images are stored in a DigitalOcean Spaces bucket
const iconMapping = {
  waterFillingStation:
    "https://pkpd-assets.sgp1.digitaloceanspaces.com/vending-machine.png",
  kmbStop:
    "https://pkpd-assets.sgp1.digitaloceanspaces.com/double-decker-bus.png",
  gmbStop:
    "https://pkpd-assets.sgp1.digitaloceanspaces.com/GREEN_MINIBUS_STAND_HK.png",
  location: "https://pkpd-assets.sgp1.digitaloceanspaces.com/location.png",
};

// alternatives of marker on its color
const colorMapping = {
  waterFillingStation: "blue",
  kmbStop: "red",
  gmbStop: "green",
};

// generate a map image URL with markers for the current location, data, with a specified zoom level
// ** Note: the function only makes the map display one type of data (marker/position) at a time.
//    To display multiple types of data, it is necessary to reconstruct routers and transform this function to a middleware.
function generateMapUrl(currentLocation, data, type, zoom = 15) {
  const baseUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${currentLocation[0]},${currentLocation[1]}&zoom=${zoom}&size=280x280&format=jpg-baseline&maptype=roadmap`;
  let markers = "";
  const customIconUrl = iconMapping[type];
  const currentLocationMarker = iconMapping["location"];
  // loop through the data array and add markers for each item
  data.forEach((item, index) => {
    const color = colorMapping[type];
    // if custom icon is provided, use it; otherwise, use the default marker
    if (customIconUrl) {
      markers += `&markers=icon:${customIconUrl}|${item.geometry[1]},${item.geometry[0]}`; // icon cannot be used with label or color
    } else {
      // distinguish the markers by color and label
      markers += `&markers=color:${color}|label:${type
        .charAt(0)
        .toUpperCase()}|${item.geometry[1]},${item.geometry[0]}`;
    }
  });
  // add a marker for the current location
  if (currentLocation) {
    markers += `&markers=icon:${currentLocationMarker}|${currentLocation[0]},${currentLocation[1]}`;
  } else {
    markers += `&markers=color:orange|label:L|${currentLocation[0]},${currentLocation[1]}`;
  }

  // add the API key to the URL
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  return encodeURI(`${baseUrl}${markers}&language=en&key=${apiKey}`);
}

router.get("/", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    const currentLocation = [latitude, longitude];
    const root = process.env.HOST;
    const kmbResponse = await axios.get(
      `${root}/transport/kmbStops/coordinates?lat=${latitude}&long=${longitude}`
    );
    console.log(kmbResponse);
    // get the string
    const kmbData = kmbResponse.data;
    console.log(kmbData);
    const baseUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${currentLocation[0]},${currentLocation[1]}&zoom=${zoom}&size=280x280&format=jpg-baseline&maptype=roadmap`;
    let markers = "";
    const customIconUrl = iconMapping[type];
    const currentLocationMarker = iconMapping["location"];
    // loop through the data array and add markers for each item
    kmbData.forEach((item, index) => {
      const color = colorMapping[type];
      // if custom icon is provided, use it; otherwise, use the default marker
      if (customIconUrl) {
        markers += `&markers=icon:${customIconUrl}|${item.geometry[1]},${item.geometry[0]}`; // icon cannot be used with label or color
      } else {
        // distinguish the markers by color and label
        markers += `&markers=color:${color}|label:${type
          .charAt(0)
          .toUpperCase()}|${item.geometry[1]},${item.geometry[0]}`;
      }
    });
    // add a marker for the current location
    if (currentLocation) {
      markers += `&markers=icon:${currentLocationMarker}|${currentLocation[0]},${currentLocation[1]}`;
    } else {
      markers += `&markers=color:orange|label:L|${currentLocation[0]},${currentLocation[1]}`;
    }

    // add the API key to the URL
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    res
      .status(200)
      .send(encodeURI(`${baseUrl}${markers}&language=en&key=${apiKey}`));
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// export default generateMapUrl;

export default router;
