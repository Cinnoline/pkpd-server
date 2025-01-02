/** @format */

import mongoose from "mongoose";

const geoNameSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    geometry: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
    properties: {
      PLACE_TYPE: { type: String },
      DISTRICT: { type: String },
      PLACE_CLASS: { type: String },
      GEO_NAME_ID: { type: String },
    },
  },
  { strict: false }
);

geoNameSchema.index({ geometry: "2dsphere" });

const GeoName = mongoose.model("location_geo_names", geoNameSchema);

export default GeoName;
