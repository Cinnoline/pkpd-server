/** @format */

import express from "express";
import { EventEmitter } from "events";
import weatherRouter from "./weather.js";
import facilitiesRouter from "./facilities.js";
import transportRouter from "./transport.js";
import locationRouter from "./location.js";

const app = express(); // create an express app
const PORT = 8880; // set the port

app.use("/weather", weatherRouter); // use the weather router
app.use("/facilities", facilitiesRouter); // use the facilities router
app.use("/transport", transportRouter); // use the transport router
app.use("/location", locationRouter); // use the location router

app.listen(PORT, () => {
  console.log(`Server is running on Port ${PORT}`);
});

export default app;
