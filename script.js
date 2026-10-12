const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status");
const weatherContent = document.querySelector("#weather-content");

const weatherDescriptions = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Heavy freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Severe thunderstorm", "⛈️"]
};

function weatherInfo(code, isDay = true) {
  const info = weatherDescriptions[code] || ["Weather unavailable", "🌡️"];
  if (code === 0 && !isDay) return ["Clear night", "🌙"];
  if (code === 1 && !isDay) return ["Mostly clear", "🌙"];
  return info;
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
  statusMessage.hidden = false;
  weatherContent.hidden = true;
}

function formatDate(dateString, options = { weekday: "short", month: "short", day: "numeric" }) {
  // Parse date-only strings in local time to avoid timezone shifting the day.
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
}

async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not search for that city. Please try again.");
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Check the spelling and try again.");
  }
  return data.results[0];
}

async function getForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    hourly: "uv_index,precipitation_probability",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    forecast_days: "7",
    timezone: "auto",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh"
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("Weather data could not be loaded. Please try again later.");
  return response.json();
}

function renderCurrent(place, data) {
  const current = data.current;
  const daily = data.daily;
  const info = weatherInfo(current.weather_code, current.is_day === 1);
  const today = current.time.slice(0, 10);
  const hourIndex = Math.max(0, data.hourly.time.findIndex(time => time.slice(0, 13) === current.time.slice(0, 13)));
  const uv = data.hourly.uv_index[hourIndex];
  const rainChance = daily.precipitation_probability_max[0];

  document.querySelector("#location-name").textContent =
    [place.name, place.admin1].filter((value, index, arr) => value && arr.indexOf(value) === index).join(", ");
  document.querySelector("#location-detail").textContent =
    [place.admin1, place.country].filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index).join(", ");
  document.querySelector("#current-date").textContent = formatDate(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  document.querySelector("#current-icon").textContent = info[1];
  document.querySelector("#current-temperature").textContent = `${Math.round(current.temperature_2m)}°`;
  document.querySelector("#current-description").textContent = info[0];
  document.querySelector("#feels-like").textContent = `${Math.round(current.apparent_temperature)}°C`;
  document.querySelector("#humidity").textContent = `${current.relative_humidity_2m}%`;
  document.querySelector("#wind-speed").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.querySelector("#uv-index").textContent = Number.isFinite(uv) ? uv.toFixed(1) : "N/A";
  document.querySelector("#rain-chance").textContent = Number.isFinite(rainChance) ? `${rainChance}%` : "N/A";
}

function renderForecast(data) {
  const daily = data.daily;
  const forecastGrid = document.querySelector("#forecast-grid");
  forecastGrid.replaceChildren();

  daily.time.forEach((date, index) => {
    const info = weatherInfo(daily.weather_code[index]);
    const card = document.createElement("article");
    card.className = "day-card";
    const dayName = index === 0 ? "Today" : formatDate(date, { weekday: "short" });
    const dateLabel = formatDate(date, { month: "short", day: "numeric" });
    const high = Math.round(daily.temperature_2m_max[index]);
    const low = Math.round(daily.temperature_2m_min[index]);
    const rain = daily.precipitation_probability_max[index];

    card.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-date">${dateLabel}</div>
      <div class="day-icon" aria-hidden="true">${info[1]}</div>
      <div class="day-condition">${info[0]}</div>
      <div class="day-high">${high}°</div>
      <div class="day-low">${low}° low</div>
      <div class="rain">💧 ${Number.isFinite(rain) ? rain + "%" : "—"}</div>
    `;
    forecastGrid.appendChild(card);
  });
}

async function loadWeather(city) {
  const trimmedCity = city.trim();
  if (!trimmedCity) {
    showStatus("Please enter a city name.", true);
    cityInput.focus();
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Loading…";
  showStatus(`Finding the forecast for ${trimmedCity}…`);

  try {
    const place = await getCoordinates(trimmedCity);
    const data = await getForecast(place.latitude, place.longitude);
    renderCurrent(place, data);
    renderForecast(data);
    statusMessage.hidden = true;
    weatherContent.hidden = false;
    cityInput.value = place.name;
  } catch (error) {
    showStatus(error.message || "Something went wrong. Please check your internet connection.", true);
  } finally {
    searchButton.disabled = false;
    searchButton.innerHTML = 'Search <span>→</span>';
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  loadWeather(cityInput.value);
});

loadWeather("Shimla");
