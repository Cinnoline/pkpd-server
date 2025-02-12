/** @format */

import cron from "node-cron";
import GPSData from "../models/gpsData.js";

// delete the GPS data older than two weeks
async function deleteOldData() {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  try {
    const result = await GPSData.deleteMany({
      timestamp: { $lt: twoWeeksAgo },
    });
    console.log(`Delete ${result.deletedCount} old GPS records`);
  } catch (err) {
    console.error("Error deleting old GPS records: ", err.message);
  }
}

// run the function immediately to delete old data once running the server
deleteOldData();

// Schedule the task to run every day at midnight
cron.schedule("0 0 * * *", () => {
  // console.log("Running scheduled task to delete old GPS data...");
  deleteOldData();
});

console.log("Cron job scheduled");
