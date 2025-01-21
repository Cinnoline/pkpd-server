/** @format */

import dotenv from "dotenv";
import { Router } from "express";

dotenv.config();

const router = Router();

const iconMapping = {
  waterFillingStation: "https://localhost:8880/img/vending-machine.png",
  kmbStop: "https://localhost:8880/img/double-decker-bus.png",
  gmbStop: "https://localhost:8880/img/GREEN-MINIBUS_STAND_HK.svg",
};

// alternatives of marker
const colorMapping = {
  waterFillingStation: "blue",
  kmbStop: "red",
  gmbStop: "green",
};

function generateMapUrl(currentLocation, data, type) {
  const baseUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${currentLocation[0]},${currentLocation[1]}&zoom=12&size=400x400&maptype=roadmap`;
  let markers = "";
  const customIconUrl = iconMapping[type];
  // loop through the data array and add markers for each item
  data.forEach((item, index) => {
    const color = colorMapping[type];
    // if custom icon is provided, use it; otherwise, use the default marker
    if (customIconUrl) {
      markers += `&markers=icon:${customIconUrl}|${item.geometry[1]},${item.geometry[0]}`; // icon cannot be used with label or color
    } else {
      markers += `&markers=color:${color}|label:${type
        .charAt(0)
        .toUpperCase()}|${item.coordinates[1]},${item.coordinates[0]}`;
    }
  });
  // const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  // return `${baseUrl}${markers}&key=${apiKey}`;
  return markers;
}

router.get("/map/zoom-in", async (req, res) => {});

router.get("/map/zoom-out", async (req, res) => {});
export default generateMapUrl;
