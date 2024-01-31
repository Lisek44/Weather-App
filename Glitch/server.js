const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const { format, isToday } = require('date-fns');

const app = express();
const port = process.env.PORT || 3000;

// API Keys
const OWMapiKey = process.env.OWMAPI
const mapboxToken = process.env.MAPBOX_API;

app.use(cors());

// Use bodyParser middleware to parse JSON requests
app.use(bodyParser.json());

const countFilePath = '.data/APIcallCount.txt';
const dateFilePath = '.data/LastApiCallDate.txt';
let apiCallCount = 0;

// Read API call count and last API call date from file at the start of the server
(async () => {
  try {
    const [fileContent, dateContent] = await Promise.all([
      fs.readFile(countFilePath, 'utf-8'),
      fs.readFile(dateFilePath, 'utf-8')
    ]);

    apiCallCount = parseInt(fileContent, 10) || 0;

    const lastApiCallDate = new Date(dateContent.trim());

    if (!isToday(lastApiCallDate)) {
      // If last API call date is not today, reset count and update date
      apiCallCount = 0;
      await fs.writeFile(countFilePath, '0');
      await fs.writeFile(dateFilePath, format(new Date(), 'yyyy-MM-dd'));
    }

    console.log('API call count initialized:', apiCallCount);
  } catch (error) {
    console.error('Error reading API call count or date file:', error);
  }
})();
// TODO: counting as 2

// Middleware to count API calls and save to file
const countMiddleware = async (req, res, next) => {
  apiCallCount++;
  await fs.writeFile(countFilePath, `${apiCallCount}`);
  await fs.writeFile(dateFilePath, format(new Date(), 'yyyy-MM-dd'));
  next();
};

// Apply countMiddleware only to specific endpoints
app.use(['/currentWeather', '/forecastHourlyWeather', '/forecastDailyWeather'], countMiddleware);

// Endpoint to get the current API call count
app.get('/api-call-count', async (req, res) => {
  try {
    // Read the content of the count file
    const fileContent = await fs.readFile(countFilePath, 'utf-8');

    // Parse the content to a number
    const savedApiCallCount = parseInt(fileContent, 10);

    // Send the total API call count (including the current session count) as the response
    res.send(`${apiCallCount + savedApiCallCount}`);
  } catch (error) {
    console.error('Error reading API call count file:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/currentWeather', async (req, res) => {

  const latitude = req.query.latitude;
  const longitude = req.query.longitude;
  
  if (!latitude) {
    return res.status(400).json({ error: 'Latitude parameter is missing' });
  }
  
  console.log('Latitude parameter is properly handled');
  
  if (!longitude) {
    return res.status(400).json({ error: 'Longitude parameter is missing' });
  }
  
  console.log('Longitude parameter is properly handled');

  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OWMapiKey}&units=metric`;

  try {
    const response = await axios.get(apiUrl);
    res.json(response.data);
    
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/forecastHourlyWeather', async (req, res) => {

  const latitude = req.query.latitude;
  const longitude = req.query.longitude;
  
  if (!latitude) {
    return res.status(400).json({ error: 'Latitude parameter is missing' });
  }
  
  console.log('Latitude parameter is properly handled');
  
  if (!longitude) {
    return res.status(400).json({ error: 'Longitude parameter is missing' });
  }
  
  console.log('Longitude parameter is properly handled');

  const apiUrl = `https://pro.openweathermap.org/data/2.5/forecast/hourly?lat=${latitude}&lon=${longitude}&appid=${OWMapiKey}&units=metric&cnt=24`;

  try {
    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/forecastDailyWeather', async (req, res) => {

  const latitude = req.query.latitude;
  const longitude = req.query.longitude;
  
  if (!latitude) {
    return res.status(400).json({ error: 'Latitude parameter is missing' });
  }
  
  console.log('Latitude parameter is properly handled');
  
  if (!longitude) {
    return res.status(400).json({ error: 'Longitude parameter is missing' });
  }
  
  console.log('Longitude parameter is properly handled');

  const apiUrl = `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${latitude}&lon=${longitude}&appid=${OWMapiKey}&units=metric&cnt=7`;

  try {
    const response = await axios.get(apiUrl);
    res.json(response.data);
    
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});