const DEFAULT_LOCATION = {
  name: "Villa Pehuenia",
  admin: "Neuquén",
  country: "Argentina",
  latitude: -38.884,
  longitude: -71.171
};

let selectedLocation = { ...DEFAULT_LOCATION };
let weatherData = null;
let chart = null;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  $("footerYear").textContent = new Date().getFullYear();

  const saved = localStorage.getItem("meteo-location");
  if (saved) {
    try { selectedLocation = JSON.parse(saved); } catch (_) {}
  }

  setCoordinateInputs();
  updateLocationHeader();
  loadWeather();

  $("btnRefresh").addEventListener("click", loadWeather);
  $("chartMode").addEventListener("change", renderChart);
  $("searchForm").addEventListener("submit", handleSearch);
  $("coordsForm").addEventListener("submit", handleCoords);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".hero")) {
      $("searchResults").classList.add("hidden");
    }
  });
});

async function loadWeather() {
  setStatus("Consultando pronóstico...");
  $("btnRefresh").disabled = true;

  try {
    const params = new URLSearchParams({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m"
      ].join(","),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "snowfall",
        "weather_code",
        "cloud_cover",
        "visibility",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m"
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "apparent_temperature_max",
        "apparent_temperature_min",
        "sunrise",
        "sunset",
        "uv_index_max",
        "precipitation_sum",
        "rain_sum",
        "snowfall_sum",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "wind_direction_10m_dominant"
      ].join(","),
      timezone: "auto",
      forecast_days: "7",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm"
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

    weatherData = await response.json();
    renderAll();
    hideStatus();
  } catch (error) {
    console.error(error);
    setStatus("No se pudo obtener el pronóstico. Revisá tu conexión e intentá nuevamente.", true);
  } finally {
    $("btnRefresh").disabled = false;
  }
}

function renderAll() {
  renderCurrent();
  renderActivity();
  renderHourlyCards();
  renderDaily();
  renderSun();
  renderChart();
}

function renderCurrent() {
  const c = weatherData.current;
  const h = weatherData.hourly;
  const idx = nearestHourlyIndex(c.time, h.time);

  $("currentTemp").textContent = round(c.temperature_2m);
  $("currentFeels").textContent = `${round(c.apparent_temperature)} °C`;
  $("currentDescription").textContent = weatherCodeInfo(c.weather_code).label;
  $("currentWeatherIcon").textContent = weatherCodeInfo(c.weather_code).icon;

  $("windSpeed").textContent = round(c.wind_speed_10m);
  $("windGust").textContent = round(c.wind_gusts_10m);
  $("windDirection").textContent = `${degreesToCompass(c.wind_direction_10m)} · ${round(c.wind_direction_10m)}°`;
  $("windLevel").textContent = windDescription(c.wind_gusts_10m);

  $("humidity").textContent = round(c.relative_humidity_2m);
  $("dewPoint").textContent = `P. rocío: ${round(h.dew_point_2m[idx])} °C`;

  $("precipitation").textContent = format1(c.precipitation);
  $("precipProbability").textContent = `Prob.: ${round(h.precipitation_probability[idx])}%`;
  $("snowfall").textContent = format1(h.snowfall[idx]);

  $("cloudCover").textContent = round(c.cloud_cover);
  $("visibility").textContent = `Visib.: ${formatVisibility(h.visibility[idx])}`;
  $("pressure").textContent = round(c.pressure_msl);

  $("updatedTime").textContent = formatTime(c.time);
  $("elevation").textContent = `${round(weatherData.elevation)} m`;
}

function renderActivity() {
  const c = weatherData.current;
  const h = weatherData.hourly;
  const idx = nearestHourlyIndex(c.time, h.time);

  const gust = Number(c.wind_gusts_10m || 0);
  const precip = Number(c.precipitation || 0);
  const visibility = Number(h.visibility[idx] || 0);
  const temp = Number(c.temperature_2m || 0);
  const snow = Number(h.snowfall[idx] || 0);

  let severity = 0;
  const reasons = [];

  if (gust >= 70) { severity += 3; reasons.push(`ráfagas muy fuertes (${round(gust)} km/h)`); }
  else if (gust >= 50) { severity += 2; reasons.push(`ráfagas fuertes (${round(gust)} km/h)`); }
  else if (gust >= 35) { severity += 1; reasons.push(`viento con ráfagas moderadas (${round(gust)} km/h)`); }

  if (precip >= 5) { severity += 2; reasons.push("precipitación intensa"); }
  else if (precip >= 1) { severity += 1; reasons.push("precipitación presente"); }

  if (snow >= 1) { severity += 2; reasons.push("nevada"); }
  else if (snow > 0) { severity += 1; reasons.push("posible nieve"); }

  if (visibility > 0 && visibility < 2000) { severity += 2; reasons.push("visibilidad reducida"); }
  else if (visibility > 0 && visibility < 5000) { severity += 1; reasons.push("visibilidad limitada"); }

  if (temp <= -5) { severity += 1; reasons.push("temperatura muy baja"); }

  const badge = $("activityBadge");
  badge.className = "activity-badge";

  if (severity >= 4) {
    badge.textContent = "Precaución alta";
    badge.classList.add("bad");
    $("activityText").textContent = `Hay factores meteorológicos que requieren especial atención: ${reasons.join(", ")}. Verificá alertas oficiales y estado de caminos antes de salir.`;
  } else if (severity >= 2) {
    badge.textContent = "Con precaución";
    badge.classList.add("caution");
    $("activityText").textContent = `Las condiciones presentan algunos factores a considerar: ${reasons.join(", ")}. Conviene revisar la evolución horaria antes de una salida.`;
  } else {
    badge.textContent = "Sin señales severas";
    badge.classList.add("good");
    $("activityText").textContent = reasons.length
      ? `No se detectan condiciones severas en este momento, aunque se observa ${reasons.join(", ")}.`
      : "No se detectan, en los datos actuales, viento, precipitación o visibilidad en niveles especialmente adversos.";
  }
}

function renderHourlyCards() {
  const h = weatherData.hourly;
  const nowIdx = nearestHourlyIndex(weatherData.current.time, h.time);
  const container = $("hourlyCards");
  container.innerHTML = "";

  for (let i = nowIdx; i < Math.min(nowIdx + 16, h.time.length); i++) {
    const info = weatherCodeInfo(h.weather_code[i]);
    const card = document.createElement("article");
    card.className = "hour-card";
    card.innerHTML = `
      <div class="time">${i === nowIdx ? "Ahora" : formatTime(h.time[i])}</div>
      <div class="icon">${info.icon}</div>
      <div class="temp">${round(h.temperature_2m[i])}°</div>
      <div class="mini">
        💨 ${round(h.wind_speed_10m[i])} km/h<br>
        🌬️ ${round(h.wind_gusts_10m[i])} km/h<br>
        🌧️ ${round(h.precipitation_probability[i])}%
      </div>
    `;
    container.appendChild(card);
  }
}

function renderDaily() {
  const d = weatherData.daily;
  const container = $("dailyForecast");
  container.innerHTML = "";

  d.time.forEach((time, i) => {
    const date = new Date(`${time}T12:00:00`);
    const info = weatherCodeInfo(d.weather_code[i]);

    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day">${i === 0 ? "Hoy" : capitalize(date.toLocaleDateString("es-AR", { weekday: "short" }))}</div>
      <div class="date">${date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}</div>
      <div class="icon" title="${info.label}">${info.icon}</div>
      <div class="range">${round(d.temperature_2m_max[i])}° <span>/ ${round(d.temperature_2m_min[i])}°</span></div>
      <div class="rain">
        🌧️ ${round(d.precipitation_probability_max[i])}% · ${format1(d.precipitation_sum[i])} mm<br>
        🌬️ ráf. ${round(d.wind_gusts_10m_max[i])} km/h
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSun() {
  const d = weatherData.daily;
  $("sunrise").textContent = formatTime(d.sunrise[0]);
  $("sunset").textContent = formatTime(d.sunset[0]);
  $("uvIndex").textContent = format1(d.uv_index_max[0]);
}

function renderChart() {
  if (!weatherData || typeof Chart === "undefined") return;

  const h = weatherData.hourly;
  const idx = nearestHourlyIndex(weatherData.current.time, h.time);
  const end = Math.min(idx + 48, h.time.length);
  const labels = h.time.slice(idx, end).map((x) => {
    const d = new Date(x);
    return d.toLocaleString("es-AR", { weekday: "short", hour: "2-digit" });
  });

  const mode = $("chartMode").value;
  let datasets = [];

  if (mode === "wind") {
    datasets = [
      {
        label: "Viento (km/h)",
        data: h.wind_speed_10m.slice(idx, end),
        borderWidth: 2,
        tension: .3,
        pointRadius: 0
      },
      {
        label: "Ráfagas (km/h)",
        data: h.wind_gusts_10m.slice(idx, end),
        borderWidth: 2,
        tension: .3,
        pointRadius: 0
      }
    ];
  } else if (mode === "precip") {
    datasets = [
      {
        type: "bar",
        label: "Precipitación (mm)",
        data: h.precipitation.slice(idx, end),
        borderWidth: 1
      },
      {
        label: "Probabilidad (%)",
        data: h.precipitation_probability.slice(idx, end),
        borderWidth: 2,
        tension: .3,
        pointRadius: 0,
        yAxisID: "y1"
      }
    ];
  } else {
    datasets = [
      {
        label: "Temperatura (°C)",
        data: h.temperature_2m.slice(idx, end),
        borderWidth: 2,
        tension: .3,
        pointRadius: 0
      },
      {
        label: "Sensación (°C)",
        data: h.apparent_temperature.slice(idx, end),
        borderWidth: 2,
        tension: .3,
        pointRadius: 0
      }
    ];
  }

  if (chart) chart.destroy();

  const scales = {
    x: {
      ticks: { color: "#91a4b8", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
      grid: { color: "rgba(255,255,255,.04)" }
    },
    y: {
      ticks: { color: "#91a4b8" },
      grid: { color: "rgba(255,255,255,.06)" }
    }
  };

  if (mode === "precip") {
    scales.y1 = {
      position: "right",
      min: 0,
      max: 100,
      ticks: { color: "#91a4b8" },
      grid: { drawOnChartArea: false }
    };
  }

  chart = new Chart($("weatherChart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#c8d6e2", usePointStyle: true } },
        tooltip: {
          backgroundColor: "#07111c",
          borderColor: "rgba(255,255,255,.12)",
          borderWidth: 1
        }
      },
      scales
    }
  });
}

async function handleSearch(event) {
  event.preventDefault();
  const query = $("searchInput").value.trim();
  if (query.length < 2) return;

  setStatus("Buscando localidad...");

  try {
    const params = new URLSearchParams({
      name: query,
      count: "8",
      language: "es",
      format: "json"
    });

    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!response.ok) throw new Error("Error al buscar");

    const data = await response.json();
    renderSearchResults(data.results || []);
    hideStatus();
  } catch (error) {
    setStatus("No se pudo realizar la búsqueda.", true);
  }
}

function renderSearchResults(results) {
  const box = $("searchResults");
  box.innerHTML = "";

  if (!results.length) {
    box.innerHTML = `<div class="search-result"><strong>Sin resultados</strong><small>Probá con otro nombre.</small></div>`;
    box.classList.remove("hidden");
    return;
  }

  results.forEach((result) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-result";
    btn.innerHTML = `
      <strong>${escapeHtml(result.name)}</strong>
      <small>${escapeHtml([result.admin1, result.country].filter(Boolean).join(", "))}</small>
    `;
    btn.addEventListener("click", () => {
      selectedLocation = {
        name: result.name,
        admin: result.admin1 || "",
        country: result.country || "",
        latitude: result.latitude,
        longitude: result.longitude
      };
      saveLocation();
      updateLocationHeader();
      setCoordinateInputs();
      box.classList.add("hidden");
      $("searchInput").value = "";
      loadWeather();
    });
    box.appendChild(btn);
  });

  box.classList.remove("hidden");
}

function handleCoords(event) {
  event.preventDefault();
  const lat = Number($("latInput").value);
  const lon = Number($("lonInput").value);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    setStatus("Ingresá coordenadas válidas.", true);
    return;
  }

  selectedLocation = {
    name: "Ubicación personalizada",
    admin: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    country: "",
    latitude: lat,
    longitude: lon
  };

  saveLocation();
  updateLocationHeader();
  loadWeather();
}

function updateLocationHeader() {
  $("locationTitle").textContent = selectedLocation.name;
  $("locationSubtitle").textContent =
    [selectedLocation.admin, selectedLocation.country].filter(Boolean).join(", ") ||
    `${selectedLocation.latitude}, ${selectedLocation.longitude}`;
}

function setCoordinateInputs() {
  $("latInput").value = selectedLocation.latitude;
  $("lonInput").value = selectedLocation.longitude;
}

function saveLocation() {
  localStorage.setItem("meteo-location", JSON.stringify(selectedLocation));
}

function setStatus(message, isError = false) {
  const box = $("statusBox");
  box.textContent = message;
  box.className = `status${isError ? " error" : ""}`;
}

function hideStatus() {
  $("statusBox").classList.add("hidden");
}

function nearestHourlyIndex(currentTime, hourlyTimes) {
  const target = new Date(currentTime).getTime();
  let best = 0;
  let diff = Infinity;

  for (let i = 0; i < hourlyTimes.length; i++) {
    const d = Math.abs(new Date(hourlyTimes[i]).getTime() - target);
    if (d < diff) {
      diff = d;
      best = i;
    }
  }
  return best;
}

function weatherCodeInfo(code) {
  const table = {
    0: ["Despejado", "☀️"],
    1: ["Mayormente despejado", "🌤️"],
    2: ["Parcialmente nublado", "⛅"],
    3: ["Cubierto", "☁️"],
    45: ["Niebla", "🌫️"],
    48: ["Niebla con escarcha", "🌫️"],
    51: ["Llovizna leve", "🌦️"],
    53: ["Llovizna", "🌦️"],
    55: ["Llovizna intensa", "🌧️"],
    56: ["Llovizna helada leve", "🌧️"],
    57: ["Llovizna helada intensa", "🌧️"],
    61: ["Lluvia leve", "🌦️"],
    63: ["Lluvia", "🌧️"],
    65: ["Lluvia intensa", "🌧️"],
    66: ["Lluvia helada leve", "🌧️"],
    67: ["Lluvia helada intensa", "🌧️"],
    71: ["Nevada leve", "🌨️"],
    73: ["Nevada", "🌨️"],
    75: ["Nevada intensa", "❄️"],
    77: ["Granos de nieve", "❄️"],
    80: ["Chaparrones leves", "🌦️"],
    81: ["Chaparrones", "🌧️"],
    82: ["Chaparrones intensos", "⛈️"],
    85: ["Chaparrones de nieve leves", "🌨️"],
    86: ["Chaparrones de nieve intensos", "❄️"],
    95: ["Tormenta", "⛈️"],
    96: ["Tormenta con granizo", "⛈️"],
    99: ["Tormenta fuerte con granizo", "⛈️"]
  };
  const item = table[code] || ["Condiciones variables", "🌤️"];
  return { label: item[0], icon: item[1] };
}

function degreesToCompass(deg) {
  if (!Number.isFinite(Number(deg))) return "--";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  return dirs[Math.round((Number(deg) % 360) / 22.5) % 16];
}

function windDescription(kmh) {
  const v = Number(kmh);
  if (v < 20) return "Ráfagas débiles";
  if (v < 35) return "Ráfagas moderadas";
  if (v < 50) return "Ráfagas fuertes";
  if (v < 70) return "Ráfagas muy fuertes";
  return "Ráfagas severas";
}

function formatVisibility(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m)) return "--";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${round(m)} m`;
}

function formatTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function round(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "--";
}

function format1(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "--";
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
