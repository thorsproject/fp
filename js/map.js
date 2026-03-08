// ------------------ LEAFLET MAP ------------------
import { createWeatherLayers, setWeatherVisible } from "./weather_layers.js";

function applyWeatherToggleUI(btn, isOn) {
  if (!btn) return;

  btn.dataset.state = isOn ? "on" : "off";
  btn.textContent = isOn ? "ON" : "OFF";
  btn.classList.toggle("is-active", isOn);
}

function initWeatherToggle(map) {
  const btn = document.getElementById("toggleWeather");
  if (!btn) return;

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  // immer OFF starten, kein Auto-Reload des Layers
  applyWeatherToggleUI(btn, false);
  setWeatherVisible(map, false);

  let weatherLoaded = false;

  btn.addEventListener("click", async () => {
    const nextOn = btn.dataset.state !== "on";

    if (nextOn) {
      try {
        btn.disabled = true;

        if (!weatherLoaded) {
          await createWeatherLayers(map);
          weatherLoaded = true;
        }

        setWeatherVisible(map, true);
        applyWeatherToggleUI(btn, true);
      } catch (err) {
        console.error("Weather layer fetch failed:", err);
        setWeatherVisible(map, false);
        applyWeatherToggleUI(btn, false);
      } finally {
        btn.disabled = false;
      }

      return;
    }

    setWeatherVisible(map, false);
    applyWeatherToggleUI(btn, false);
  });
}

export async function createMap() {
  const map = L.map("map").setView([51, 10], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(map);

  initWeatherToggle(map);

  return map;
}