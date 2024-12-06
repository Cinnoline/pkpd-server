/** @format */
import express from "express";
import { Router } from "express";
import https from "https";
import mongoose from "mongoose";
import axios from "axios";
import cron from "node-cron";
import dotenv from "dotenv";

// create a router
const router = Router();

// the code to store the data in the database
router.put("/distance_posts", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.csdi.gov.hk/apim/dataquery/api/?id=afcd_rcd_1635136039113_86105&layer=distance_posts&bbox-crs=WGS84&bbox=113.8,22.1,114.7,23.0&limit=10000&offset=0"
    );

    const posts = response.data;
    const filteredPosts = posts.features.map((post) => {
      return {
        coordinates: post.geometry.coordinates,
        FAC_ID: post.properties.FAC_ID,
        REMARK: post.properties.REMARK,
      };
    });

    console.log(filteredPosts);
    saveToDatabase(filteredPosts);
    // res.json({ message: "Data stored" }); // respond with the posts
    res.send(filteredPosts);
    // res.send(posts);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

const dataScheme = new mongoose.Schema({
  coordinates: Array,
  FAC_ID: String,
  REMARK: String,
});

const DataModel = mongoose.model("facilities_distance_post", dataScheme);

async function saveToDatabase(filteredPosts) {
  try {
    await DataModel.insertMany(filteredPosts);
    console.log("Data saved successfully");
  } catch (error) {
    console.error("Error saving data: ", error);
  }
}

router.get("/fetch-posts/:id", async (req, res) => {
  const { id } = req.params;
  const product = await DataModel.find({ FAC_ID: id });
  res.send(product);
});

export default router;
