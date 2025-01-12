/** @format */

import nodemailer from "nodemailer";
import dotenv from "dotenv";

// load environment variables
dotenv.config();

// Configure the transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // normally use smtp
  port: 465, // 465 if connection will use TLS and set its secure to true
  secure: true, // true for port 465, false for others (normally port 587 or 25)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // google app password if using gmail, 2FA must be enabled
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Function to send email with HTML content
export const sendEmail = async (to, subject, html = []) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};
