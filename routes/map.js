/** @format */

import dotenv from "dotenv";

dotenv.config();

const iconMapping = {
  waterFillingStation: "https://localhost:8880/img/vending-machine.png",
  kmbStop: "https://localhost:8880/img/double-decker-bus.png",
  gmbStop: "https://localhost:8880/img/GREEN-MINIBUS_STAND_HK.svg",
  location: "https://localhost:8880/img/location_orange.png",
};

// alternatives of marker on its color
const colorMapping = {
  waterFillingStation: "blue",
  kmbStop: "red",
  gmbStop: "green",
  location: "orange",
};

// generate a map image URL with markers for the current location, data, with a specified zoom level
// ** Note: the function only makes the map display one type of data (marker/position) at a time.
//    To display multiple types of data, it is necessary to reconstruct routers and transform this function to a middleware.
function generateMapUrl(currentLocation, data, type, zoom = 12) {
  const baseUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${currentLocation[0]},${currentLocation[1]}&zoom=${zoom}&size=400x400&maptype=roadmap`;
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
        .toUpperCase()}|${item.coordinates[1]},${item.coordinates[0]}`;
    }
  });
  // add a marker for the current location
  if (currentLocation) {
    markers += `&markers=icon:${currentLocationMarker}|${currentLocation[0]},${currentLocation[1]}`;
  } else {
    markers += `&markers=color:white|label:L|${currentLocation[0]},${currentLocation[1]}`;
  }

  // add the path for the route, need to generate the polyline first
  // const path = `&path=color:0x5cf|weight:5|enc:${polyline}`;

  // add the API key to the URL
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return `${baseUrl}${markers}&key=${apiKey}`;
  // return markers;
}

export default generateMapUrl;
