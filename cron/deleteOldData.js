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

// Schedule the task to run every day at midnight
cron.schedule("0 0 * * *", () => {
  deleteOldData();
});

console.log("Cron job scheduled");
