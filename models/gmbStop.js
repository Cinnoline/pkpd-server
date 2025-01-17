/** @format */

import mongoose from "mongoose";

const gmbStopSchema = new mongoose.Schema(
  {
    stop_id: Number,
    stop_name: String,
    geometry: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
  },
  { strict: false }
);

gmbStopSchema.index({ geometry: "2dsphere" });

const GMBStop = mongoose.model("transport_gmb_stops", gmbStopSchema);

export default GMBStop;
