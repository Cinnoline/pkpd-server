/** @format */

import { Router } from "express";
import mongoose from "mongoose";
import axios from "axios";
import WeatherStation from "../models/autoWeatherStation.js";

// create a router
const router = Router();

const warningCodeMap = {
  WFIREY: "firey",
  WFIRER: "firer",
  WFROST: "frost",
  WHOT: "vhot",
  WCOLD: "cold",
  WMSGNL: "sms",
  WRAINA: "raina",
  WRAINR: "rainr",
  WRAINB: "rainb",
  WFNTSA: "ntfl",
  WL: "landslip",
  TC1: "tc1",
  TC3: "tc3",
  TC8NE: "tc8ne",
  TC8SE: "tc8se",
  TC8NW: "tc8nw",
  TC8SW: "tc8sw",
  TC9: "tc9",
  TC10: "tc10",
  WTMW: "tsunami-warn",
  WTS: "ts",
};

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
    const warningInfoData = response.data;
    const warningInfo = createWarningInfo(warningInfoData);
    res.send(warningInfo);
    console.log("Warning info fetched successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

router.get("/warning_sum", async (req, res) => {
  try {
    const response = await axios.get(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=en"
    );
    const warningSumData = response.data;
    const warningSum = createWarningIcon(warningSumData);
    res.send(warningSum);
    console.log("Warning Sum fetched successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the router to get the weather report
router.get("/weather_report", async (req, res) => {
  const { lat, long } = req.query;
  // test request:
  // http://localhost:8880/weather/weather_report?lat=22.3244127&long=114.2109974 // HKUSPACE CC KEC
  try {
    const response = await axios.get(
      `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en`
    );
    const weatherReportData = response.data;
    const closestStation = await WeatherStation.findOne({
      geometry: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [long, lat],
          },
        },
      },
    });
    const temperatureData = weatherReportData.temperature.data.find(
      (entry) => entry.place === closestStation.name
    );
    const humidity = weatherReportData.humidity.data[0].value;
    const result = {
      stationName: closestStation.name,
      temperature: temperatureData.value,
      humidity: humidity,
      updateTime: weatherReportData.updateTime,
      icon: weatherReportData.icon, // the icon code is an array
    };
    const report = createWeatherReport(result);
    res.send(report);
    console.log("Weather report data fetched successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the router to get the weather report, used by the mobile application only
router.get("/weather_report_app", async (req, res) => {
  const { lat, long } = req.query;
  // test request:
  // http://localhost:8880/weather/weather_report?lat=22.3244127&long=114.2109974 // HKUSPACE CC KEC
  try {
    const response = await axios.get(
      `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en`
    );
    const weatherReportData = response.data;
    const closestStation = await WeatherStation.findOne({
      geometry: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [long, lat],
          },
        },
      },
    });
    const temperatureData = weatherReportData.temperature.data.find(
      (entry) => entry.place === closestStation.name
    );
    const humidity = weatherReportData.humidity.data[0].value;
    const result = {
      stationName: closestStation.name,
      temperature: temperatureData.value,
      humidity: humidity,
      updateTime: weatherReportData.updateTime,
      icon: weatherReportData.icon, // the icon code is an array
    };
    const report = createWeatherReportHTML(result);
    res.send(report);
    console.log("Weather report data fetched successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// the code to store the auto weather station data(coordinates) in the database, wrapped in a PUT request
router.put("/auto_weather_station", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.csdi.gov.hk/apim/dataquery/api/?id=hko_rcd_1634957986804_49802&layer=latest_past24_temperature_diff&bbox-crs=WGS84&bbox=113.8,22.1,114.7,23.0&limit=39&offset=0"
    );
    const autoWeatherStationData = response.data;
    const filteredAutoWeatherStationData = autoWeatherStationData.features.map(
      (feature) => ({
        name: feature.properties.AutomaticWeatherStation_en,
        geometry: feature.geometry,
      })
    );
    await WeatherStation.insertMany(filteredAutoWeatherStationData);
    console.log("Auto weather station data fetched successfully");
    res.send("Auto weather station data stored successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

function createWeatherForecast(data) {
  // original data always contains internal line breaks, remove them by hard coding the replacement ("@")
  const cleanText = (text) => text.replace(/\s+/g, "@");
  // construct the forecast message
  let forecast = `${cleanText(data.generalSituation)}\n\n${
    data.forecastPeriod
  }:\n${cleanText(data.forecastDesc)}\n\n`;
  if (data.tcInfo) {
    forecast += `Tropical Cyclone Information: ${cleanText(data.tcInfo)}\n\n`;
  }
  if (data.fireDangerWarning) {
    forecast += `Fire Danger Warning: ${cleanText(data.fireDangerWarning)}\n\n`;
  }
  forecast += `Outlook: ${cleanText(data.outlook)}\n\n`;
  forecast += `Update Time: ${data.updateTime}`;
  return forecast;
}

function createWarningInfo(data) {
  if (data.details === undefined) {
    return "There is no special announcement";
  }
  const cleanText = (text) => text.replace(/\s+/g, "@");
  let warningInfo = ``;
  data.details.forEach((detail) => {
    warningInfo += cleanText([...detail.contents]);
    warningInfo += `\nUpdate Time: ${cleanText(detail.updateTime)}\n`;
  });
  return addNewlinesByWord(warningInfo, 66);
}

function createWarningIcon(data) {
  if (!data) {
    return;
  }
  let warningIcon = [];
  for (const key in data) {
    if (data[key] && data[key].code && data[key].code != "CANCEL") {
      warningIcon.push(
        `https://www.hko.gov.hk/tc/wxinfo/dailywx/images/${
          warningCodeMap[data[key].code]
        }.gif`
      );
    }
  }
  return warningIcon;
}

function createWeatherReport(data) {
  let info = `Weather report from ${data.stationName} Automatic Weather Station:\n`;
  info += `Temperature: ${data.temperature}°C\t`;
  info += `Humidity: ${data.humidity}%\n`;
  let markers = [];
  // transform the icon code to the image link
  data.icon.forEach((code) => {
    markers.push(
      `https://www.hko.gov.hk/images/HKOWxIconOutline/pic${code}.png`
    );
  });
  info += `Update Time: ${data.updateTime}`;
  return { info, markers };
}

function createWeatherReportHTML(data) {
  let report = `Weather report from ${data.stationName} Automatic Weather Station:<br>`;
  report += `Temperature: ${data.temperature}°C<br>`;
  report += `Humidity: ${data.humidity}%<br>`;
  // transform the icon code to the image link
  data.icon.forEach((code) => {
    report += `<img src="https://www.hko.gov.hk/images/HKOWxIconOutline/pic${code}.png" width="200px" height="200px"></img>`;
  });
  report += `<br>Update Time: ${data.updateTime}`;
  return report;
}

function addNewlinesByWord(input, maxLineLength) {
  let words = input.split(" "); // Split the string into words
  let result = "";
  let line = "";

  for (let word of words) {
    if ((line + word).length > maxLineLength) {
      result += line.trim() + "\n"; // Add the current line and start a new one
      line = ""; // Reset the line
    }
    line += word + " "; // Add the word to the current line
  }

  // Add the last line
  result += line.trim();

  return result;
}

export default router;
