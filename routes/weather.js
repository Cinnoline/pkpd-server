/** @format */

import express from "express";
import { Router } from "express";
import https from "https";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";

// function to update the IP address on DuckDNS
const updateDuckDNS = async () => {
  try {
    const response = await axios.get(
      `https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&verbose=true&clear=true`
    );
    console.log("DuckDNS response: " + response.data);
  } catch {
    console.error(error);
  }
};
// update the IP address on DuckDNS every time the server starts
// updateDuckDNS();

// create a router
const router = Router();

const WeatherForecastSchema = new mongoose.Schema({}, { strict: false });
const WeatherForecast = mongoose.model(
  "weather_forecast",
  WeatherForecastSchema
);

router.get("/weather_forecast", async (req, res) => {
  try {
    const response = await axios.get(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=en"
    );
    const weatherForecastData = response.data;
    console.log(weatherForecastData);
    const forecast = createWeatherForecast(weatherForecastData);
    res.send(forecast);
    console.log("Weather forecast data fetched successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

router.get("/warning_info", async (req, res) => {
  try {
    const response = await axios.get(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=en"
    );
    const warningInfo = response.data;
    res.send(warningInfo.details);
    console.log("Warning info fetched successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

function createWeatherForecast(data) {
  let forecast = `${data.generalSituation}\n${data.forecastPeriod}:\n${data.forecastDesc}\n`;
  if (data.tcInfo) {
    forecast += `Tropical Cyclone Information: ${data.tcInfo}\n`;
  }
  if (data.fireDangerWarning) {
    forecast += `Fire Danger Warning: ${data.fireDangerWarning}\n`;
  }
  forecast += `Outlook: ${data.outlook}\n`;
  forecast += `Update Time: ${data.updateTime}`;
  return forecast;
}

function createWarningInfo(data) {
  let warningInfo = ``;
  data.forEach((detail) => {
    warningInfo += [...detail.contents];
    warningInfo += `Update Time: ${detail.updateTime}`;
  });
  if (warningInfo === "") {
    warningInfo = "No warning information available";
  }
  return warningInfo;
}

async function updateWeatherForecast() {
  try {
    const response = await axios.get(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=en"
    );

    const weatherForecastData = response.data;
    // const weatherForecastInfo = await WeatherForecast.find();
    await WeatherForecast.updateMany({}, weatherForecastData);
    console.log("Weather forecast data updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
}

// once run the function to fetch the weather report
// updateWeatherForecast();

// run the function to fetch the weather forecast every minute for testing
// cron.schedule("* * * * *", fetchWeatherForecast);

export default router;
