/* Open-Meteo returns metric values; display conversions happen locally. */
const API = 'https://api.open-meteo.com/v1/forecast';
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const ASSETS = './';
const DEFAULT_CITY = { name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.41 };

const $ = (id) => document.getElementById(id);
const state = {
  city: DEFAULT_CITY,
  weather: null,
  selectedDay: 0,
  units: { temperature: 'celsius', wind: 'kmh', precipitation: 'mm' },
  searchController: null,
  weatherController: null,
  searchTimer: null
};

function localDate(value) { return new Date(`${value.slice(0, 10)}T12:00:00Z`); }
function formatDate(value) { return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(localDate(value)); }
function weekday(value, length = 'short') { return new Intl.DateTimeFormat('en', { weekday: length, timeZone: 'UTC' }).format(localDate(value)); }
function hourLabel(value) {
  const hour = Number(value.slice(11, 13));
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}
function weatherImage(code, isDay = true) {
  if (code === 0) return isDay ? 'icon-sunny.webp' : 'icon-partly-cloudy.webp';
  if ([1, 2].includes(code)) return 'icon-partly-cloudy.webp';
  if (code === 3) return 'icon-overcast.webp';
  if ([45, 48].includes(code)) return 'icon-fog.webp';
  if ([51, 53, 55, 56, 57].includes(code)) return 'icon-drizzle.webp';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'icon-rain.webp';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'icon-snow.webp';
  if ([95, 96, 99].includes(code)) return 'icon-storm.webp';
  return 'icon-overcast.webp';
}
function weatherDescription(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Cloudy';
}
function temperature(value) {
  if (value == null) return '--°';
  const converted = state.units.temperature === 'fahrenheit' ? value * 9 / 5 + 32 : value;
  return `${Math.round(converted)}°`;
}
function windSpeed(value) {
  if (value == null) return '--';
  return state.units.wind === 'mph' ? `${Math.round(value * 0.621371)} mph` : `${Math.round(value)} km/h`;
}
function precipitation(value) {
  if (value == null) return '--';
  return state.units.precipitation === 'inch' ? `${(value / 25.4).toFixed(2)} in` : `${Number(value.toFixed(1))} mm`;
}
async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.reason || 'API error');
  return data;
}
function displayCity(city) { return [city.name, city.country].filter(Boolean).join(', '); }
function setSearchMessage(message) { $('search-message').textContent = message; }
function closeSuggestions() { $('suggestions').hidden = true; $('city-input').setAttribute('aria-expanded', 'false'); }
function setBusy(busy) { $('dashboard').setAttribute('aria-busy', String(busy)); }

async function fetchWeather(city) {
  state.weatherController?.abort();
  const controller = new AbortController();
  state.weatherController = controller;
  state.city = city;
  setBusy(true);
  $('error-panel').hidden = true;
  $('dashboard').hidden = false;
  setSearchMessage('Loading weather…');
  const params = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm',
    timezone: 'auto', forecast_days: '7'
  });
  try {
    const data = await getJson(`${API}?${params}`, controller.signal);
    if (!data.current || !data.hourly || !data.daily?.time?.length) throw new Error('Incomplete forecast');
    state.weather = data;
    state.selectedDay = 0;
    render();
    setSearchMessage('');
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('dashboard').hidden = true;
    $('error-panel').hidden = false;
    $('error-text').textContent = 'We couldn’t load the weather. Please check your connection and try again.';
    setSearchMessage('');
  } finally {
    if (state.weatherController === controller) setBusy(false);
  }
}

function renderDaily() {
  const daily = state.weather.daily;
  const grid = $('daily-grid');
  grid.replaceChildren();
  daily.time.forEach((date, index) => {
    const card = document.createElement('div');
    card.className = 'daily-card';
    const label = document.createElement('span');
    label.className = 'day-name';
    label.textContent = weekday(date);
    const icon = document.createElement('img');
    icon.src = ASSETS + weatherImage(daily.weather_code[index]);
    icon.alt = weatherDescription(daily.weather_code[index]);
    const temperatures = document.createElement('div');
    temperatures.className = 'daily-temps';
    const high = document.createElement('span');
    high.textContent = temperature(daily.temperature_2m_max[index]);
    const low = document.createElement('span');
    low.textContent = temperature(daily.temperature_2m_min[index]);
    temperatures.append(high, low);
    card.append(label, icon, temperatures);
    grid.append(card);
  });
}

function renderHourly() {
  const data = state.weather;
  const date = data.daily.time[state.selectedDay];
  const list = $('hourly-list');
  list.replaceChildren();
  const nowHour = Number(data.current.time.slice(11, 13));
  data.hourly.time.forEach((time, index) => {
    if (!time.startsWith(date) || (state.selectedDay === 0 && Number(time.slice(11, 13)) < nowHour)) return;
    const row = document.createElement('div');
    row.className = 'hour-row';
    const icon = document.createElement('img');
    icon.src = ASSETS + weatherImage(data.hourly.weather_code[index], Boolean(data.hourly.is_day[index]));
    icon.alt = weatherDescription(data.hourly.weather_code[index]);
    const label = document.createElement('time');
    label.dateTime = time;
    label.textContent = hourLabel(time);
    const value = document.createElement('strong');
    value.textContent = temperature(data.hourly.temperature_2m[index]);
    row.append(icon, label, value);
    list.append(row);
  });
  list.scrollTop = 0;
}

function renderUnits() {
  document.querySelectorAll('.unit-option').forEach(button => {
    button.setAttribute('aria-pressed', String(state.units[button.dataset.unit] === button.dataset.value));
  });
  const isMetric = state.units.temperature === 'celsius' && state.units.wind === 'kmh' && state.units.precipitation === 'mm';
  $('unit-switch').textContent = isMetric ? 'Switch to Imperial' : 'Switch to Metric';
}
function render() {
  if (!state.weather) return;
  const { current, daily } = state.weather;
  $('place-name').textContent = displayCity(state.city);
  $('today-date').textContent = formatDate(current.time);
  $('today-icon').src = ASSETS + weatherImage(current.weather_code, Boolean(current.is_day));
  $('today-icon').alt = weatherDescription(current.weather_code);
  $('today-temp').textContent = temperature(current.temperature_2m);
  $('feels-like').textContent = temperature(current.apparent_temperature);
  $('humidity').textContent = current.relative_humidity_2m == null ? '--%' : `${Math.round(current.relative_humidity_2m)}%`;
  $('wind').textContent = windSpeed(current.wind_speed_10m);
  $('precipitation').textContent = precipitation(current.precipitation);
  renderDaily();
  const select = $('day-select');
  select.replaceChildren();
  daily.time.forEach((date, index) => {
    const option = new Option(weekday(date, 'long'), String(index));
    select.add(option);
  });
  select.value = String(state.selectedDay);
  renderHourly();
  renderUnits();
}

async function searchCities(query, showList = true) {
  state.searchController?.abort();
  const controller = new AbortController();
  state.searchController = controller;
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  try {
    const data = await getJson(`${GEO}?${params}`, controller.signal);
    const results = data.results || [];
    if (showList) {
      const container = $('suggestions');
      container.replaceChildren();
      results.forEach(city => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = displayCity(city);
        const region = document.createElement('small');
        region.textContent = city.admin1 && city.admin1 !== city.name ? city.admin1 : '';
        button.append(region);
        button.addEventListener('click', () => selectCity(city));
        container.append(button);
      });
      container.hidden = !results.length;
      $('city-input').setAttribute('aria-expanded', String(Boolean(results.length)));
      if (!results.length) setSearchMessage('No results found. Try another city.');
      else setSearchMessage('');
    }
    return results;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    setSearchMessage('Could not search cities. Please try again.');
    closeSuggestions();
    return [];
  }
}
function selectCity(city) {
  $('city-input').value = displayCity(city);
  closeSuggestions();
  fetchWeather(city);
}

$('search-form').addEventListener('submit', async event => {
  event.preventDefault();
  clearTimeout(state.searchTimer);
  const query = $('city-input').value.trim();
  if (query.length < 2) { setSearchMessage('Enter at least two characters.'); return; }
  closeSuggestions();
  setSearchMessage('Searching…');
  const results = await searchCities(query, false);
  if (results.length) selectCity(results[0]);
  else if (!$('search-message').textContent.includes('Could not')) setSearchMessage('No results found. Try another city.');
});
$('city-input').addEventListener('input', event => {
  clearTimeout(state.searchTimer);
  state.searchController?.abort();
  closeSuggestions();
  setSearchMessage('');
  const query = event.target.value.trim();
  if (query.length < 2) return;
  state.searchTimer = setTimeout(() => searchCities(query), 300);
});
$('city-input').addEventListener('keydown', event => {
  if (event.key === 'Escape') closeSuggestions();
  if (event.key === 'ArrowDown' && !$('suggestions').hidden) {
    event.preventDefault();
    $('suggestions').querySelector('button')?.focus();
  }
});
$('suggestions').addEventListener('keydown', event => {
  const buttons = [...$('suggestions').querySelectorAll('button')];
  const index = buttons.indexOf(document.activeElement);
  if (event.key === 'ArrowDown') { event.preventDefault(); buttons[Math.min(index + 1, buttons.length - 1)]?.focus(); }
  if (event.key === 'ArrowUp') { event.preventDefault(); index ? buttons[index - 1]?.focus() : $('city-input').focus(); }
  if (event.key === 'Escape') { closeSuggestions(); $('city-input').focus(); }
});
$('day-select').addEventListener('change', event => { state.selectedDay = Number(event.target.value); renderHourly(); });
$('units-button').addEventListener('click', () => {
  $('units-menu').hidden = !$('units-menu').hidden;
  $('units-button').setAttribute('aria-expanded', String(!$('units-menu').hidden));
});
document.querySelectorAll('.unit-option').forEach(button => button.addEventListener('click', () => {
  state.units[button.dataset.unit] = button.dataset.value;
  render();
}));
$('unit-switch').addEventListener('click', () => {
  const toImperial = state.units.temperature === 'celsius' && state.units.wind === 'kmh' && state.units.precipitation === 'mm';
  state.units = toImperial ? { temperature: 'fahrenheit', wind: 'mph', precipitation: 'inch' } : { temperature: 'celsius', wind: 'kmh', precipitation: 'mm' };
  render();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.units-wrap')) { $('units-menu').hidden = true; $('units-button').setAttribute('aria-expanded', 'false'); }
  if (!event.target.closest('.search-area')) closeSuggestions();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { $('units-menu').hidden = true; $('units-button').setAttribute('aria-expanded', 'false'); }
});
$('retry-button').addEventListener('click', () => fetchWeather(state.city));
renderUnits();
fetchWeather(DEFAULT_CITY);

