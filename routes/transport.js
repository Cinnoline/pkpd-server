/** @format */

import express from "express";
import https from "https";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";
import dotenv from "dotenv";

// load environment variables
dotenv.config({ path: "../.gitignore/.env" });
const DOMAIN = process.env.DUCKDNS_DOMAIN;
const TOKEN = process.env.DUCKDNS_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

// create an express app
const app = express();
// use the express.json middleware
app.use(express.json());
// set the port
const Port = 8880;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(`Error: ${err}`));

// app.get("/transport")

// the code to store the data in the database
app.put("/transport/kmbStops", async (req, res) => {
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

// get kmb bus stop data
app.get("/transportation", (req, res) => {
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

app.listen(Port, () => {
  console.log(`Server is running on Port ${Port}`);
});
