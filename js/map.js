// map.js
// ------------------ LEAFLET MAP ------------------
import { createWeatherLayers, setWeatherVisible } from "./weather_layers.js";

const LS_WEATHER_TOGGLE = "fp.map.weather.v1";

function applyWeatherToggleUI(btn, isOn) {
  if (!btn) return;

  btn.dataset.state = isOn ? "on" : "off";
  btn.textContent = isOn ? "ON" : "OFF";
  btn.classList.toggle("is-active", isOn);
}

function setWeatherVisible(map, isOn) {
  // Platzhalter für späteren echten Wetterlayer
  // Beispiel später:
  // map._weatherLayer?.setOpacity(isOn ? 1 : 0);

  map._weatherEnabled = isOn;
}

function initWeatherToggle(map) {

  const btn = document.getElementById("toggleWeather");

  btn.addEventListener("click", () => {

    const on = btn.textContent === "OFF";

    btn.textContent = on ? "ON" : "OFF";

    setWeatherVisible(map, on);
  });
}

export function createMap() {
  const map = L.map("map").setView([51, 10], 6);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(map);

  createWeatherLayers(map);
  initWeatherToggle(map);

  return map;
}