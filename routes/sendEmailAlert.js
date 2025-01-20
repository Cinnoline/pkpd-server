/** @format */

import { sendEmail } from "../services/sendEmail.js";
import dotenv from "dotenv";

dotenv.config();

// function to send an email alert
export const sendEmailAlert = async (lat, long, interval) => {
  const to = process.env.EMAIL_RECIPIENT;
  const subject = `Warning: User has been in the same location for more than ${interval} hours`;
  const googleMapsLink = `https://www.google.com/maps?q=${lat},${long}`;
  const html = `
  <h2 style="text-align:center">Warning</h2>
  <p>The user has been in the same location for more than ${interval} hours. 
  Please contact the user to confirm their safety!</p>
  <p>Location: ${lat}, ${long}</p>
  <a href="${googleMapsLink}">View on Google Maps</a>
  `;
  await sendEmail(to, subject, html);
};
