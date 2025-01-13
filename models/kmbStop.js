/** @format */

import mongoose from "mongoose";

const kmbStopSchema = new mongoose.Schema(
  {
    stop: String,
    name: String,
    geometry: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
  },
  { strict: false }
);

kmbStopSchema.index({ geometry: "2dsphere" });

const KMBStop = mongoose.model("transport_kmb_stops", kmbStopSchema);

export default KMBStop;
