/** @format */

import mongoose from "mongoose";

const placeNameSchema = new mongoose.Schema(
  {
    geometry: {
      type: { type: String },
      coordinates: [Number], // [longitude, latitude]
    },
    GEO_NAME_ID: String,
    NAME_EN: String,
    NAME_ALIAS: String,
    PLACE_TYPE: String,
    DISTRICT: String,
    PLACE_CLASS: String,
  },
  { strict: false }
);

placeNameSchema.index({ geometry: "2dsphere" });

const PlaceName = mongoose.model("location_place_names", placeNameSchema);

export default PlaceName;
