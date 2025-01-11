/** @format */

import mongoose from "mongoose";

const gpsDataSchema = new mongoose.Schema(
  {
    timestamp: Date,
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number], // [longitude, latitude]
    },
  },
  { strict: false }
);

gpsDataSchema.index({ location: "2dsphere" });

const GPSData = mongoose.model("location_tracks", gpsDataSchema);

export default GPSData;
