/** @format */

import mongoose from "mongoose";

const placeNameSchema = new mongoose.Schema(
  {
    type: String,
    geometry: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: [Number],
    },
    properties: {}, // tbh, I don't know what to put here
  },
  { strict: false }
);

const PlaceName = mongoose.model("location_place_names", placeNameSchema);

export default PlaceName;
