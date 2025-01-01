/** @format */

import express from "express";
import https from "https";
import { query, validationResult, body, matchedData } from "express-validator";
import mongoose from "mongoose";
import session from "express-session";
import { EventEmitter } from "events";
import dotenv from "dotenv";
import weatherRouter from "./weather.js";
import facilitiesRouter from "./facilities.js";
import transportRouter from "./transport.js";

// load environment variables
dotenv.config({ path: "../.env" });
const DOMAIN = process.env.DUCKDNS_DOMAIN;
const TOKEN = process.env.DUCKDNS_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

const app = express(); // create an express app
app.use(express.json()); // use the express.json middleware
const Port = 8880; // set the port

// connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(`Error: ${err}`));

app.use("/weather", weatherRouter); // use the weather router
app.use("/facilities", facilitiesRouter); // use the facilities router
app.use("/transport", transportRouter); // use the transport router

// const resolveIndexByUserId = (req, res, next) => {
//   const {
//     body,
//     params: { id },
//   } = req;
//   const parsedID = parseInt(id);
//   if (isNaN(parsedID)) {
//     res.status(400).send({ msg: "Invalid ID" });
//   }
//   const findUserIndex = users.findIndex((user) => user.id === parsedID);
//   if (findUserIndex === -1) {
//     res.status(404).send({ msg: "User not found" });
//   }
//   req.findUserIndex = findUserIndex;
//   next();
// };

// const users = [
//   { id: 1, username: "dsds", msg: "Hello World" },
//   { id: 2, username: "dsds", msg: "Hello World" },
//   { id: 3, username: "dsds", msg: "Hello World" },
// ];

// app.get("/api/users/:id", resolveIndexByUserId, (req, res) => {
//   const { findUserIndex } = req;
//   const findUser = users[findUserIndex];
//   if (!findUser) {
//     return res.status(404).send({ msg: "User not found" });
//   }
//   return res.send(findUser);
// });

app.put("/api/users/:id", (req, res) => {
  const {
    body,
    params: { id },
  } = req;
  const parsedID = parseInt(id);
  if (isNaN(parsedID)) {
    res.status(400).send({ msg: "Invalid ID" });
  }
  const findUserIndex = users.findIndex((user) => user.id === parsedID);
  if (findUserIndex === -1) {
    res.status(404).send({ msg: "User not found" });
  }

  users[findUserIndex] = { id: parsedID, ...body };
  return res.send({ msg: "User updated successfully" });
});

async function saveToDatabase(filteredPosts) {
  try {
    await DataModel.insertMany(filteredPosts);
    console.log("Data saved successfully");
  } catch (error) {
    console.error("Error saving data: ", error);
  }
}

app.listen(Port, () => {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);
  console.log(`Server is running on Port ${Port}`);
});
