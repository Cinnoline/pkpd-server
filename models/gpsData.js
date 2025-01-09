/** @format */

import mongoose from "mongoose";

const gpsDataSchema = new mongoose.Schema(
  {
    timestamp: Date,
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { strict: false }
);

const GPSData = mongoose.model("location_tracks", gpsDataSchema);

export default GPSData;
