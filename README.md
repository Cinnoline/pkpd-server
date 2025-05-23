# pkpd-server

## Overview
This project is the backend part of a project named Solo Hiker SmartSync System, which consists of hardware, mobile app (unfinished due to time constaint) and backend. It is developed with Express.js, Mongoose, as well as MongoDB. 

All API endpoints and data sets used come from the following two open data platforms:
1. [DATA.GOV.HK](https://data.gov.hk/en/)
2. [Common Spatial Data Infrastructure](https://portal.csdi.gov.hk/csdi-webpage/)

The project will be hosted on DigitalOcean until 2025 July 31<sup>st</sup>.

## For developers

### Prerequisites
Make sure you have installed all of the following prerequisites on your development machine:

- Git - [Download & Install Git](https://git-scm.com/downloads). MacOS and Linux machines typically have this already installed.
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager. If you encounter any problems, you can also use this [GitHub Gist](https://gist.github.com/isaacs/579814) to install Node.js.
- MongoDB - [Download & Install MongoDB](https://www.mongodb.org/downloads). If you are not using MongoDB Atlas, make sure it's running on the default port (27017).
- Express.js - Assuming you've installed Node.js and npm, you are advised to use install Express.js by the steps in [Express.js Official Website](https://expressjs.com/en/starter/installing.html):

Use npm, yarn, or other package manager to install required modules listed in `package.json` locally.\
For example, use npm:
```
npm install dotenv
```
Use yarn:
```
yarn add dotenv
```
### Use

Use `npm start`, or `yarn start` to run the server.
Express.js is normally run on Node.js. 
Alternatively, [bun](https://bun.sh/) can run Express.js, you can change the `start` script in `package.json` file:
```
  "scripts": {
    "start": "node app.js" // You can use bun if you prefer 
  },
```

## For users
You can access the following endpoints:

| Endpoints | Description |
| ------------- |-------------|
| /weather/weather_forecast | weather forecast  |
| /weather/warning_info | warning information |
| /weather/weather_report?lat=${latitude}&long=${longitude}| the weather report from the nearest weather station, as well as weather icons, current latitude and longitude should be provided  |
| /weather/weather_report_app?lat=${latitude}&long=${longitude}| the weather report (in HTML) from the nearest weather station, as well as weather icons, current latitude and longitude should be provided |
| /weather/warning_sum | warning icon (in gif format) |
| /facilities/waterStation/nearest?lat=${latitude}&long=${longitude} | nearest water filling station information(map and string), current latitude and longitude should be provided |
| /facilities/waterStation/coordinates?lat=${latitude}&long=${longitude} | nearest water filling station information(only the name, the coordinates and the distance), current latitude and longitude should be provided, used by map.js only in our project |
| /facilities/bbq/coordinates?lat=${latitude}&long=${longitude} | nearest BBQ facility's coordiantes, current latitude and longitude should be provided, only used by map.js |
| /transport/kmbStops/nearest?lat=${latitude}&long=${longitude} | nearby KMB stops information (string), current latitude and longitude should be provided |
| /transport/kmbStops/coordinates?lat=${latitude}&long=${longitude} | nearby KMB stops coordinates, current latitude and longitude should be provided, only used by map.js |
| /transport/gmbStops/nearest?lat=${latitude}&long=${longitude} | nearby Green Minibus stops information (string), current latitude and longitude should be provided |
| /transport/gmbStops/coordinates?lat=${latitude}&long=${longitude} | nearby Green Minibus stops coordinates, current latitude and longitude should be provided, only used by map.js |
| /location/placeName?lat=${latitude}&long=${longitude} | nearby place name, current latitude and longitude should be provided |
| /location/track | get the latest GPS data from the database |
|/map?lat={latitude}&long={longitude}| the route to generate a map image URL with markers for the current location, KMB stops, GMB stops, water filling stations, and BBQ facilities|

For example, you can access
```
https://pkpd-server-zil3m.ondigitalocean.app/transport/gmbStops/nearest?lat=22.384522841&long=114.143778736
```
to get a string with nearby GMB stops routes information. 

The above endpoints should be sent by a **GET** request,\
and the following request should be by a **POST** with a **request body**:

| Endpoints | Description |
| ------------- |-------------|
| /location/track | save track into DB, and handle the condition that the user stands stationary for too long |

Request body example:

```
{
    "time": 1702362000, // epoch time
    "location": [
      114.237695502,
      22.384904081
    ]
}
```

## Acknowledgement

Our group would like to express our gratitude to DATA.GOV.HK and Common Spatial Data Infrastructure 
for providing access to the data utilized in this project. 
Most of the data were requested programmatically via multiple endpoints and seamlessly integrated into our MongoDB database using Express.js. 
Additionally, we appreciate the data directly downloaded from their websites, which further enriched our project.

We would also like to acknowledge the various libraries and tools that were essential in developing this project:
- Libraries: mongoose, nodemailer, axios, node-cron and dotenv.
- Tools: MongoDB, Thunder Client (VS Code extension), Arduino IDE and Git.

Moreover, we would like to thank the authors who provided us with the assets used in our map marker icon. 
They are: [bsd](https://www.flaticon.com/authors/bsd), [meaicon](https://www.flaticon.com/authors/meaicon), [Freepik](https://www.freepik.com/), [Icongeek26](https://www.flaticon.com/authors/icongeek26).
Your continuous support and dedication to open-source projects have made a significant impact on our work.
