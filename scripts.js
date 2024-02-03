function loadCSSBasedOnUserAgent() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    document.getElementById('CSS-source').href = 'mobile.css'; // Load mobile.css for mobile devices
  } else {
    document.getElementById('CSS-source').href = 'styles.css'; // Load default.css for other devices
  }
}

loadCSSBasedOnUserAgent();

const apiKey = '49b0abfbcd72adcfc70fc7f555198b19';

localStorage.setItem('popupClosed', false);

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const modeSlider = document.getElementById('modeSlider');
const modeText = document.getElementById('modeText');
const MODE_KEY = 'websiteMode';

function updateMode(mode) {
  switch (mode) {
    case 'Light':
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      document.body.classList.remove('default-mode');
      break;
    case 'Default':
      document.body.classList.remove('dark-mode', 'light-mode');
      document.body.classList.add('default-mode');
      break;
    case 'Dark':
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      document.body.classList.remove('default-mode');
      break;
    default:
      break;
  }
  modeText.textContent = mode;
  localStorage.setItem(MODE_KEY, mode);
}

if (localStorage.getItem(MODE_KEY)) {
  const savedMode = localStorage.getItem(MODE_KEY);
  modeSlider.value = savedMode === 'Light' ? '1' : savedMode === 'Dark' ? '3' : '2';
  updateMode(savedMode);
} else {
  updateMode('Default'); // Set default mode if no saved mode is found
}

// Function to fetch location suggestions from MapBox API
async function getLocationSuggestions(query) {
  try {

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      throw new Error('Request timed out.');
    }, 5000);

    const response = await fetch(`https://weather-app-api-handler.glitch.me/mapboxSuggestions?suggestQuery=${query}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to fetch location suggestions.');
    }

    const data = await response.json();
    return data.features.map(feature => {
      return {
        place_name: feature.place_name,
        coordinates: feature.center
      };
    });
  } catch (error) {
    console.error('Error:', error.message);
    alert('An error occurred while fetching location suggestions.');
  }
}

// Function to display location suggestions
function displayLocationSuggestions(suggestions) {
  const suggestionsList = document.getElementById('suggestions-list');
  suggestionsList.style.display = 'block';
  suggestionsList.innerHTML = '';

  suggestions.forEach(suggestion => {
    const listItem = document.createElement('li');
    listItem.textContent = suggestion.place_name;
    listItem.onclick = () => selectLocation(suggestion.coordinates, suggestion.place_name);
    suggestionsList.appendChild(listItem);
  });
}

// Function to handle the selection of a location from suggestions
async function selectLocation(coordinates, place_name) {
  [longitude, latitude] = coordinates;

  try {
  
    const weatherData = await getWeatherData(latitude, longitude);

    const mapContainer = document.getElementById('map-container');
    mapContainer.style.display = 'grid';
    const mapBoxTemperature = document.getElementById('map-box-temperature');
    mapBoxTemperature.style.display = 'block';
    const mapBoxPrecipitation = document.getElementById('map-box-precipitation');
    mapBoxPrecipitation.style.display = 'block';
    const mapBoxWind = document.getElementById('map-box-wind');
    mapBoxWind.style.display = 'block';

    displayWeatherData(weatherData, place_name);

    displayMapData();

    // Update the input field value
    const locationInput = document.getElementById('location-input-field');
    locationInput.value = `${place_name}`;

    // Clear suggestions list
    const suggestionsList = document.getElementById('suggestions-list');
    suggestionsList.innerHTML = '';
    
    // Hide the suggestions list and move cursor out of the input field
    suggestionsList.style.display = 'none';
    locationInput.blur(); 

  } catch (error) {
    console.error('Error fetching weather data:', error);
  }
}

// Function to handle user input for location autocomplete
async function handleInput() {
  const locationInput = document.getElementById('location-input-field').value;
  const suggestionsList = document.getElementById('suggestions-list');
  
  if (locationInput.length >= 3) {
    const suggestions = await getLocationSuggestions(locationInput);
    displayLocationSuggestions(suggestions);
  } else {
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';
  }
}

// Functions to fetch weather data from OpenWeatherMap API
async function getWeatherData(latitude, longitude) {
  try {
    displayPopupWaiting();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      closePopupWaiting();
      throw new Error('Request timed out.');
    }, 5000);

    const response = await fetch(`https://weather-app-api-handler.glitch.me/One-Call-API?latitude=${latitude}&longitude=${longitude}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    closePopupWaiting();

    if (!response.ok) {
      throw new Error('Failed to fetch weather data.');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    closePopupWaiting();
    console.error('Error:', error.message);
    alert('An error occurred while fetching weather data.');
  }
}

// Functions to fetch map data from OpenWeatherMap API add OpenStreetMap tiles and bind them to the map
async function getTA2MapData(latitude, longitude) {
  const mapContainer = document.getElementById('map-box-temperature');
  if (mapContainer && mapContainer._leaflet_id) {
    mapContainer._leaflet_id = null;
  }

  mapContainer.innerHTML = '';

  const TA2Map = L.map('map-box-temperature', {dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false}).setView([latitude, longitude], 10);

  const mapLayer =  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

  const weatherLayer = L.tileLayer('http://maps.openweathermap.org/maps/2.0/weather/{op}/{z}/{x}/{y}?appid={apiKey}&opacity=0.6&fill_bound=true', {
    apiKey: apiKey,
    maxZoom: 18,
    attribution: 'Weather &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>',
    op: 'TA2',
  })

  // Add the layers to TA2Map
  mapLayer.addTo(TA2Map);
  weatherLayer.addTo(TA2Map);
}

async function getPR0MapData(latitude, longitude) {
  const mapContainer = document.getElementById('map-box-precipitation');
  if (mapContainer && mapContainer._leaflet_id) {
    mapContainer._leaflet_id = null;
  }

  mapContainer.innerHTML = '';

  const PR0Map = L.map('map-box-precipitation', {dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false}).setView([latitude, longitude], 7);
  
  const mapLayer =  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

  const weatherLayer = L.tileLayer('http://maps.openweathermap.org/maps/2.0/weather/{op}/{z}/{x}/{y}?appid={apiKey}&opacity=0.6&fill_bound=true', {
    apiKey: apiKey,
    maxZoom: 18,
    attribution: 'Weather &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>',
    op: 'PR0',
  })

  // Add the layers to PR0Map
  mapLayer.addTo(PR0Map);
  weatherLayer.addTo(PR0Map);
}
async function getWNDMapData(latitude, longitude) {
  const mapContainer = document.getElementById('map-box-wind');
  if (mapContainer && mapContainer._leaflet_id) {
    mapContainer._leaflet_id = null;
  }

  mapContainer.innerHTML = '';

  const WNDMap = L.map('map-box-wind', {dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false}).setView([latitude, longitude], 10);
  
  const mapLayer =  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

  const weatherLayer = L.tileLayer('http://maps.openweathermap.org/maps/2.0/weather/{op}/{z}/{x}/{y}?appid={apiKey}&opacity=0.6&fill_bound=true', {
    apiKey: apiKey,
    maxZoom: 18,
    attribution: 'Weather &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>',
    op: 'WND',
  })

  // Add the layers to WNDMap
  mapLayer.addTo(WNDMap);
  weatherLayer.addTo(WNDMap);
}

// Function to handle and display weather data
function displayWeatherData(weatherData, place_name) {
  const currentWeatherTitle = document.getElementById('current-weather-title');
  currentWeatherTitle.innerHTML = `<h2>Current Weather in ${place_name}</h2>`;

  const browserTime = new Date();
  const timezoneOffset = browserTime.getTimezoneOffset() * 60;

  const sunrise = new Date(weatherData.current.sunrise * 1000);
  const sunset = new Date(weatherData.current.sunset * 1000);

  sunrise.setTime(sunrise.getTime() + weatherData.timezone_offset * 1000 + timezoneOffset * 1000);
  sunset.setTime(sunset.getTime() + weatherData.timezone_offset * 1000 + timezoneOffset * 1000);

  const currentWeatherElement = document.getElementById('current-weather');
  currentWeatherElement.innerHTML = `
    <p class="current-weather-description">Weather: ${capitalizeFirstLetter(weatherData.current.weather[0].description)}</p>
    <p class="current-weather-temperature">Temperature: ${Math.round(weatherData.current.temp)}°C</p>
    <p class="current-weather-feels-like">Feels Like: ${Math.round(weatherData.current.feels_like)}°C</p>
    <p class="current-weather-humidity">Humidity: ${Math.round(weatherData.current.humidity)}%</p>
    <p class="current-weather-pressure">Pressure: ${Math.round(weatherData.current.pressure)}hPa</p>
    <p class="current-weather-visibility">Visibility: ${Math.round(weatherData.current.visibility / 1000 * 10) / 10}km</p>
    <p class="current-weather-wind">Wind Speed: ${Math.round(weatherData.current.wind_speed * 10) / 10}m/s</p>
    <p class="current-weather-sunrise">Sunrise: ${sunrise.toLocaleTimeString()}</p>
    <p class="current-weather-sunset">Sunset: ${sunset.toLocaleTimeString()}</p>
  `;

  const currentWeatherIcon = document.getElementById('current-weather-icon');
  const weatherIconID = weatherData.current.weather[0].icon;

  if (weatherIconID === '01d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/01d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#f5e7b9');
  } else if (weatherIconID === '01n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/01n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#7791c2');
  } else if (weatherIconID === '02d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/02d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#a7d6df');
  } else if (weatherIconID === '02n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/02n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#90a5cc');
  } else if (weatherIconID === '03d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/03d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#cccccc');
  } else if (weatherIconID === '03n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/03n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#cccccc');
  } else if (weatherIconID === '04d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/04d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#a3a2a2');
  } else if (weatherIconID === '04n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/04n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#a3a2a2');
  } else if (weatherIconID === '09d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/09d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#9bc7d4');
  } else if (weatherIconID === '09n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/09n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#9bc7d4');
  } else if (weatherIconID === '10d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/10d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#72afc2');
  } else if (weatherIconID === '10n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/10n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#72afc2');
  } else if (weatherIconID === '11d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/11d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#787b9b');
  } else if (weatherIconID === '11n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/11n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#787b9b');
  } else if (weatherIconID === '13d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/13d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#c0fdff');
  } else if (weatherIconID === '13n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/13n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#c0fdff');
  } else if (weatherIconID === '50d') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/50d.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#f4ffff');
  } else if (weatherIconID === '50n') {
    currentWeatherIcon.innerHTML = `<img src="images/icons/50n.png" alt="Current Weather Icon">`;
    document.documentElement.style.setProperty('--default-background-color-body', '#f4ffff');
  } else {
    currentWeatherIcon.innerHTML = `<img src="images/001-meteorology.png" alt="Current Weather Icon">`;
  }

  // Memes
  const memeBoxElement = document.getElementById('meme-box');
  if (Math.round(weatherData.current.temp) <= -10) {
    memeBoxElement.innerHTML = `<img src="images/memes/Jack-Nicholson-The-Shining-Snow.jpg" alt="Meme">`;
  } else if (Math.round(weatherData.current.temp) >= 20 && weatherData.current.temp <= 25) {
    memeBoxElement.innerHTML = `<img src="images/memes/0_ZjYSm_q36J4KChdn.jpg" alt="Meme">`;
  } else if (Math.round(weatherData.current.temp) > 25 && weatherData.current.temp <= 30) {
    memeBoxElement.innerHTML = `<img src="images/memes/5d018c085cf9819634dee6572fb5dd79.jpg" alt="Meme">`;
  } else if (Math.round(weatherData.current.temp) > 30) { 
    memeBoxElement.innerHTML = `<img src="images/memes/Heat_wave.jpg" alt="Meme">`;
  } else if (Math.round(weatherData.current.temp) >= -9 && weatherData.current.temp < 19) {
    if (weatherData.current.weather[0].main === 'Rain' || weatherData.current.weather[0].main === 'Drizzle' || weatherData.current.weather[0].main === 'Thunderstorm') {
      memeBoxElement.innerHTML = `<img src="images/memes/8d37f35ff717b6691ab1acf90dce6c83.jpg" alt="Meme">`;
    } else if (weatherData.current.weather[0].main === 'Snow') {
      memeBoxElement.innerHTML = `<img src="images/memes/Snowing.jpg" alt="Meme">`;
    } else if (weatherData.current.weather[0].main === 'Clouds') {
      memeBoxElement.innerHTML = `<img src="images/memes/Clouds.jpg" alt="Meme">`; 
    } else if (weatherIconID === '50d') {
      memeBoxElement.innerHTML = `<img src="images/memes/Mist.jpg" alt="Meme">`;
    } else { // Clear weather
      memeBoxElement.innerHTML = `<img src="images/memes/bbd.gif" alt="Meme">`;
    }
  } else {
    memeBoxElement.innerHTML = `<img src="images/memes/bbd.gif" alt="Meme">`; 
  }

  // Display the popup if it hasn't been closed
  if (localStorage.getItem('popupClosed') === 'true') {
  } else {
    setTimeout(displayPopupOnDesktop, 5000);
  }

  // Display the current weather container
  const currentWeatherContainer = document.getElementById('current-weather-container');
  currentWeatherContainer.style.display = 'grid';

  // Display Forecast Hourly data
  const forecastHourlyDataElement = document.getElementById('forecast-hourly-box');
  forecastHourlyDataElement.innerHTML = '';

  weatherData.hourly.slice(1, 25).forEach(hour => {
    const date = new Date(hour.dt * 1000 + weatherData.timezone_offset * 1000 + timezoneOffset * 1000); // Convert Unix timestamp to JavaScript date object
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    const weather = hour.weather[0];
    const temperature = Math.round(hour.temp);
    const feelsLike = Math.round(hour.feels_like);
    const humidity = Math.round(hour.humidity);
    const description = capitalizeFirstLetter(weather.description);
    const iconUrl = `images/icons/${weather.icon}.png`;

    const forecastItem = `
      <div class="forecast-hourly-item">
        <div class="forecast-hourly-time"><p>${time}</p></div>
        <div class="forecast-hourly-icon"><img src="${iconUrl}" alt="${description}"></div>
        <div class="forecast-hourly-temperature"><p>${temperature}/${feelsLike}°C</p></div>
        <div class="forecast-hourly-humidity"><p>${humidity}%</p></div>
        <div class="forecast-hourly-description"><p>${description}</p></div>
      </div>
    `;
    forecastHourlyDataElement.innerHTML += forecastItem;
  });

  // Display the forecast title and table
  const forecastHourlyContainer = document.getElementById('forecast-hourly-container');
  forecastHourlyContainer.style.display = 'grid';

  // Display Forecast Daily data
  const forecastDailyDataElement = document.getElementById('forecast-daily-box');
  forecastDailyDataElement.innerHTML = '';

  weatherData.daily.slice(0, 7).forEach(day => {
    const date = new Date(day.dt * 1000 + weatherData.timezone_offset * 1000 + timezoneOffset * 1000);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const weather = day.weather[0];
    const temperatureDay = Math.round(day.temp.day);
    const temperatureNight = Math.round(day.temp.night);
    const humidity = Math.round(day.humidity);
    const pressure = Math.round(day.pressure);
    const speed = Math.round(day.wind_speed * 10) / 10;
    const description = capitalizeFirstLetter(weather.description);
    const iconUrl = `images/icons/${weather.icon}.png`;

    const forecastItem = `
      <div class="forecast-daily-item">
        <div class="forecast-daily-day"><p>${dayOfWeek}</p></div>
        <div class="forecast-daily-temperature-day"><p>Day: ${temperatureDay}°C</p></div>
        <div class="forecast-daily-temperature-night"><p>Night: ${temperatureNight}°C</p></div>
        <div class="forecast-daily-humidity"><p>Humidity: ${humidity}%</p></div>
        <div class="forecast-daily-pressure"><p>Pressure: ${pressure}hPa</p></div>
        <div class="forecast-daily-wind"><p>Wind: ${speed}m/s</p></div>
        <div class="forecast-daily-icon"><img src="${iconUrl}" alt="${description}"></div>
        <div class="forecast-daily-description"><p>${description}</p></div>        
      </div>
    `;
    forecastDailyDataElement.innerHTML += forecastItem;
  });

  // Display the forecast title and table
  const forecastDailyContainer = document.getElementById('forecast-daily-container');
  forecastDailyContainer.style.display = 'grid';
}

// Function to display map data
function displayMapData() {
  const mapDataElement = document.getElementById('map-container');
  mapDataElement.style.display = 'grid';
  const mapTitle = document.getElementById('map-title');
  mapTitle.innerHTML = `<h2>Temperature Map</h2>`;
  const mapBoxTemperature = document.getElementById('map-box-temperature');
  mapBoxTemperature.style.display = 'block';
  const mapBoxPrecipitation = document.getElementById('map-box-precipitation');
  mapBoxPrecipitation.style.display = 'none';
  const mapBoxWind = document.getElementById('map-box-wind');
  mapBoxWind.style.display = 'none';
  getTA2MapData(latitude, longitude);
}

// Function to handle search when button is clicked or Enter is pressed
function searchWeatherOnClick() {
  const locationInput = document.getElementById('location-input-field').value;

  if (locationInput.length > 0) {
    // Fetch suggestions from MapBox API
    getLocationSuggestions(locationInput)
      .then(suggestions => {
        if (suggestions.length > 0) {
          const coordinates = suggestions[0].coordinates;
          const place_name = suggestions[0].place_name;
          selectLocation(coordinates, place_name);
        }
      })
      .catch(error => {
        console.error('Error fetching location suggestions:', error);
      });
  }
  else {
    alert('Please enter a location to search for weather data.');
  }
}

// Function to clear the input field
function clearInputField() {
  const locationInput = document.getElementById('location-input-field');
  locationInput.value = '';
}

// Function to display the popup on desktop
function displayPopupOnDesktop() {
  localStorage.setItem('popupClosed', false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) {
    const popup = document.getElementById('popup');
    popup.style.display = 'block';
    localStorage.setItem('popupClosed', true);
  }
}

// Function to close the popup
function closePopup() {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';
}

// Function to display the popup-waiting
function displayPopupWaiting() {
  const popupWaiting = document.getElementById('popup-waiting');
  popupWaiting.innerHTML = `<p>Waiting for server response...</p>`;
  popupWaiting.style.display = 'block';
}

// Function to close the popup-waiting
function closePopupWaiting() {
  const popupWaiting = document.getElementById('popup-waiting');
  popupWaiting.style.display = 'none';
}

// Function to start Node.js server
function startNodeServer() {
  const response = fetch(`https://weather-app-api-handler.glitch.me/startServer`);
  if (!response.ok) {
    throw new Error('Failed to start Node.js server.');
  }
  // console.log('Node.js server started.');
}

// Function to display the meme container
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiCodeIndex = 0;

function checkKonamiCode(event) {
  const key = event.key;
  const requiredKey = konamiCode[konamiCodeIndex];

  if (key === requiredKey) {
    konamiCodeIndex++;

    if (konamiCodeIndex === konamiCode.length) {
      
      // Display the meme container
      const memeContainer = document.getElementById('meme-container');
      memeContainer.style.display = 'grid';
      
      konamiCodeIndex = 0;
    }
  } else {
    konamiCodeIndex = 0;
  }
}

// Attach an event listener to the input field for real-time suggestions, search button for search, and location input for clearing the input field
const inputField = document.getElementById('location-input-field');
inputField.addEventListener('input', handleInput);

const searchButton = document.getElementById('search-button');
searchButton.addEventListener('click', searchWeatherOnClick);

const locationInput = document.getElementById('location-input-field');
locationInput.addEventListener('click', clearInputField);

// Reload the page when the weather app icon is clicked
const weatherAppIcon = document.getElementById('weather-app-icon');
weatherAppIcon.addEventListener('click', () => {
  location.reload();
});

// Function to display the map data
const mapTemperature = document.getElementById('map-temperature');
mapTemperature.addEventListener('click', () => {
  const mapTitle = document.getElementById('map-title');
  mapTitle.innerHTML = `<h2>Temperature Map</h2>`;
  const mapBoxTemperature = document.getElementById('map-box-temperature');
  mapBoxTemperature.style.display = 'block';
  const mapBoxPrecipitation = document.getElementById('map-box-precipitation');
  mapBoxPrecipitation.style.display = 'none';
  const mapBoxWind = document.getElementById('map-box-wind');
  mapBoxWind.style.display = 'none';
  getTA2MapData(latitude, longitude);
  window.scrollTo(0, document.body.scrollHeight);
});

const mapPrecipitation = document.getElementById('map-precipitation');
mapPrecipitation.addEventListener('click', () => {
  const mapTitle = document.getElementById('map-title');
  mapTitle.innerHTML = `<h2>Precipitation Map</h2>`;
  const mapBoxTemperature = document.getElementById('map-box-temperature');
  mapBoxTemperature.style.display = 'none';
  const mapBoxPrecipitation = document.getElementById('map-box-precipitation');
  mapBoxPrecipitation.style.display = 'block';
  const mapBoxWind = document.getElementById('map-box-wind');
  mapBoxWind.style.display = 'none';
  getPR0MapData(latitude, longitude);
  window.scrollTo(0, document.body.scrollHeight);
});

const mapWind = document.getElementById('map-wind');
mapWind.addEventListener('click', () => {
  const mapTitle = document.getElementById('map-title');
  mapTitle.innerHTML = `<h2>Wind Map</h2>`;
  const mapBoxTemperature = document.getElementById('map-box-temperature');
  mapBoxTemperature.style.display = 'none';
  const mapBoxPrecipitation = document.getElementById('map-box-precipitation');
  mapBoxPrecipitation.style.display = 'none';
  const mapBoxWind = document.getElementById('map-box-wind');
  mapBoxWind.style.display = 'block';
  getWNDMapData(latitude, longitude);
  window.scrollTo(0, document.body.scrollHeight);
});

// Handle Enter key press in input field
inputField.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    searchWeatherOnClick();
    const searchButton = document.getElementById('search-button');
    searchButton.addEventListener('click', searchWeatherOnClick);
  }
});

// Event listener for key presses
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    konamiCodeIndex = 0;
  } else {
    checkKonamiCode(event);
  }
});

// Event listener for mode slider change
modeSlider.addEventListener('input', () => {
  let mode = 'Default';
  switch (parseInt(modeSlider.value)) {
    case 1:
      mode = 'Light';
      break;
    case 2:
      mode = 'Default';
      break;
    case 3:
      mode = 'Dark';
      break;
    default:
      break;
  }
  updateMode(mode);
});
