/** @format */

import mongoose from "mongoose";

const waterStationSchema = new mongoose.Schema(
  {
    geometry: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
    TYPE_OF_VENUE_EN: { type: String },
    ADDRESS_EN: { type: String },
    TYPE_OF_WATER_DISPENSER_EN: { type: String },
    FACILITY_NAME_EN: { type: String },
    WATER_TEMPERATURE_EN: { type: String },
    COUNTRY_PARK_EN: { type: String },
    SERVICE_HOUR_EN: { type: String },
  },
  { strict: false }
);

waterStationSchema.index({ geometry: "2dsphere" });

const WaterStation = mongoose.model(
  "facilities_water_station",
  waterStationSchema
);

export default WaterStation;
