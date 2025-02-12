/** @format */

import mongoose from "mongoose";

const weatherStationSchema = new mongoose.Schema(
  {
    name: String,
    geometry: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
  },
  { strict: false }
);

weatherStationSchema.index({ geometry: "2dsphere" });

const WeatherStation = mongoose.model("weather_stations", weatherStationSchema);

export default WeatherStation;
