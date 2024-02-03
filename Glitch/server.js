const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const { format, isToday, getMonth } = require('date-fns');

const app = express();
const port = process.env.PORT || 3000;

// API Keys
const OWMapiKey = process.env.OWMAPI
const mapboxToken = process.env.MAPBOX_API;

app.use(cors());

// Use bodyParser middleware to parse JSON requests
app.use(bodyParser.json());

const countOWMAPIFilePath = '.data/OWMAPICallCount.txt';
const countMapBoxFilePath = '.data/MapBoxAPICallCount.txt';
const dateFilePath = '.data/LastApiCallDate.txt';
let OWMAPICallCount = 0;
let MapBoxCallCount = 0;

// Read API call count and last API call date from file at the start of the server
(async () => {
  try {
    const [OWMAPIfileContent, MapBoxFileContent, dateContent] = await Promise.all([
      fs.readFile(countOWMAPIFilePath, 'utf-8'),
      fs.readFile(countMapBoxFilePath, 'utf-8'),
      fs.readFile(dateFilePath, 'utf-8')
    ]);

    OWMAPICallCount = parseInt(OWMAPIfileContent, 10) || 0;
    MapBoxCallCount = parseInt(MapBoxFileContent, 10) || 0;

    const lastApiCallDate = new Date(dateContent.trim());

    if (!isToday(lastApiCallDate)) {
      // If last API call date is not today, reset count and update date
      OWMAPICallCount = 0;
      await fs.writeFile(countOWMAPIFilePath, '0');
      await fs.writeFile(dateFilePath, format(new Date(), 'yyyy-MM-dd'));
    }
    
    if (getMonth(lastApiCallDate) !== getMonth(new Date())) {
      
      MapBoxCallCount = 0;
      await fs.writeFile(countMapBoxFilePath, '0');
    }

    // console.log('API call count initialized:', OWMAPICallCount);
  } catch (error) {
    console.error('Error reading API call count or date file:', error);
  }
})();

// Middleware to count OWMAPI  calls and save to file
const countMiddlewareOWMAPI = async (req, res, next) => {
  if (OWMAPICallCount >= 1000) {
    console.error('Error - Daily limit of OpenWeatherMap One Call API calls depleted');
    res.status(503).send('Error - Daily limit of OpenWeatherMap One Call API calls depleted');
  }
  OWMAPICallCount++;
  await fs.writeFile(countOWMAPIFilePath, `${OWMAPICallCount}`);
  await fs.writeFile(dateFilePath, format(new Date(), 'yyyy-MM-dd'));
  next();
};

// Apply countMiddlewareOWMAPI only to specific endpoints
app.use(['/currentWeather', '/forecastHourlyWeather', '/forecastDailyWeather', '/One-Call-API'], countMiddlewareOWMAPI);

// Endpoint to get the current OWMAPI call count
app.get('/OWMAPI-call-count', async (req, res) => {
  try {
    // Read the content of the count file
    const fileContent = await fs.readFile(countOWMAPIFilePath, 'utf-8');

    // Send the total API call count (including the current session count) as the response
    res.send(`${fileContent}`);
  } catch (error) {
    console.error('Error reading API call count file:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Middleware to count MapBox calls and save to file
const countMiddlewareMapBox = async (req, res, next) => {
  if (MapBoxCallCount == 100000) {
    console.error('Error - Monthly limit of Mapbox API calls depleted');
    res.status(503).send('Error - Monthly limit of Mapbox API calls depleted');
  }
  MapBoxCallCount++;
  await fs.writeFile(countMapBoxFilePath, `${MapBoxCallCount}`);
  next();
};

// Apply countMiddlewareOWMAPI only to specific endpoints
app.use(['/mapboxSuggestions'], countMiddlewareMapBox);

// Endpoint to get the current MapBox APi calls count
app.get('/MapBox-call-count', async (req, res) => {
  try {
    // Read the content of the count file
    const fileContent = await fs.readFile(countMapBoxFilePath, 'utf-8');

    // Send the total API call count (including the current session count) as the response
    res.send(`${fileContent}`);
  } catch (error) {
    console.error('Error reading API call count file:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/startServer', async (req, res) => {
  res.status(200).json({message: 'Server was started'})
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
    const response = await axios.get(apiUrl, { timeout: 5000 });
    res.json(response.data);
    
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
    // Send information to website about timeout
    res.status(500).json({ error: 'Timeout'});
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
    const response = await axios.get(apiUrl, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
    // Send information to website about timeout
    res.status(500).json({ error: 'Timeout'});
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
    const response = await axios.get(apiUrl, { timeout: 5000 });
    res.json(response.data);
    
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
    // Send information to website about timeout
    res.status(500).json({ error: 'Timeout'});
  }
});

app.get('/mapboxSuggestions', async (req, res) => {
  
  const suggestQuery = req.query.suggestQuery;
  
  if (!suggestQuery) {
    return res.status(400).json({ error: 'Suggestion_Query parameter is missing' });
  }
  
  console.log('Suggestion_Query parameter is properly handled');
  
  const mapboxapiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${suggestQuery}.json?access_token=${mapboxToken}`;
  
  try {
    const response = await axios.get(mapboxapiUrl, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching suggestion:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error'});
    // Send information to website about timeout
    res.status(500).json({ error: 'Timeout'});
  }
});

app.get('/One-Call-API', async (req, res) => {

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

  const OneCallapiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&appid=${OWMapiKey}&units=metric`;

  try {
    const response = await axios.get(OneCallapiUrl, { timeout: 5000 });
    res.json(response.data);
    
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
    // Send information to website about timeout
    res.status(500).json({ error: 'Timeout'});
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});