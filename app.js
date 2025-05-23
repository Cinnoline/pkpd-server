/** @format */

import createError from "http-errors";
import express, { json, urlencoded, static as serveStatic } from "express";
import { join, dirname } from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import "./cron/deleteOldData.js";

import indexRouter from "./routes/index.js";

// load environment variables
dotenv.config({ path: "./.env" });
const MONGO_URI = process.env.MONGO_URI;

// connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(`Error: ${err}`));

const app = express();

// define the __filename and __dirname
const __filename = dirname(fileURLToPath(import.meta.url));
const __dirname = dirname(__filename);

// view engine setup
app.set("views", join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(serveStatic(join(__dirname, "public")));

app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;
