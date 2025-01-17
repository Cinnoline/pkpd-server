/** @format */

import mongoose from "mongoose";

const gmbRouteSchema = new mongoose.Schema(
  {
    route_id: Number,
    route_name: String,
    directions: [String],
  },
  { strict: false }
);

const GMBRoute = mongoose.model("transport_gmb_routes", gmbRouteSchema);

export default GMBRoute;
