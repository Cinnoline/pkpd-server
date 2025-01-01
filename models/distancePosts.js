/** @format */

import mongoose from "mongoose";

const distancePostsSchema = new mongoose.Schema(
  {
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    FAC_ID: { type: String },
    REMARK: { type: String },
  },
  { strict: false }
);

distancePostsSchema.index({ coordinates: "2dsphere" });

const DistancePost = mongoose.model(
  "facilities_distance_post",
  distancePostsSchema
);

export default DistancePost;
