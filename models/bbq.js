/** @format */

import mongoose from "mongoose";

const bbqSchema = new mongoose.Schema(
  {
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { strict: false }
);

bbqSchema.index({ coordinates: "2dsphere" });

const BBQ = mongoose.model("facilities_bbq", bbqSchema);

export default BBQ;
