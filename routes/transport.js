/** @format */

import { Router } from "express";
import https from "https";
import mongoose from "mongoose";
import axios from "axios";

// create a router
const router = Router();

//
const kmbStopsSchema = new mongoose.Schema(
  {
    stop: String,
    name: String,
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
  },
  { strict: false }
);
kmbStopsSchema.index({
  location: "2dsphere",
});
const kmbStop = mongoose.model("transport_kmb_stops", kmbStopsSchema);

router.get("/kmbStops/nearest", async (req, res) => {
  const { lat, long, limit = 10 } = req.query;

  // test query
  // http://localhost:8880/transport/kmbStops/nearest?lat=22.345435&long=114.19264

  try {
    const kmbStops = await kmbStop
      .find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(long), parseFloat(lat)],
            },
            // $maxDistance: 8000, // 8km
          },
        },
      })
      .limit(parseInt(limit))
      .select("stop name");

    res.json(kmbStops);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

router.patch("/transport/kmbStops", async (req, res) => {
  try {
    const response = await axios.get(
      "https://data.etabus.gov.hk/v1/transport/kmb/stop"
    );
    const stops = response.data;
    const mappedStops = stops.data.map((stops) => {
      return {
        stop: stops.stop,
        name: stops.name_en,
        lat: parseFloat(stops.lat),
        long: parseFloat(stops.long),
      };
    });

    saveToDatabase(mappedStops);
    res.send(mappedStops);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store the data in the database, only map location by property
router.put("/transport/kmbStops", async (req, res) => {
  try {
    const response = await axios.get(
      "https://data.etabus.gov.hk/v1/transport/kmb/stop"
    );
    const stops = response.data;
    const mappedStops = stops.data.map((stops) => {
      return {
        stop: stops.stop,
        name: stops.name_en,
        lat: parseFloat(stops.lat),
        long: parseFloat(stops.long),
      };
    });

    saveToDatabase(mappedStops);
    res.send(mappedStops);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// get kmb bus stop data, http get request
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

      // res.json(filteredData);
      res.send(filteredData);
    });
  });
});

const DataSchema = new mongoose.Schema({
  stop: String,
  name: String,
  lat: Number,
  long: Number,
});

const DataModel = mongoose.model("transport_kmb_stop", DataSchema);

async function saveToDatabase(filteredData) {
  try {
    await DataModel.insertMany(filteredData);
    console.log("Data saved successfully");
  } catch (error) {
    console.error("Error saving data: ", error);
  }
}

// app.listen(Port, () => {
//   console.log(`Server is running on Port ${Port}`);
// });

export default router;
