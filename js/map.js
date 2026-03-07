// ------------------ LEAFLET MAP ------------------
import { ensureWeatherOverlay, setWeatherVisible } from "./weather_layers.js";

const LS_WEATHER_TOGGLE = "fp.map.weather.v1";

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

  const saved = localStorage.getItem(LS_WEATHER_TOGGLE);
  const initialOn = saved === "1";
  applyWeatherToggleUI(btn, initialOn);

  btn.addEventListener("click", async () => {
    const nextOn = btn.dataset.state !== "on";

    applyWeatherToggleUI(btn, nextOn);
    localStorage.setItem(LS_WEATHER_TOGGLE, nextOn ? "1" : "0");

    if (nextOn) {
      try {
        btn.disabled = true;
        await ensureWeatherOverlay(map);
        setWeatherVisible(map, true);
      } catch (err) {
        console.error("Weather overlay failed:", err);
        applyWeatherToggleUI(btn, false);
        localStorage.setItem(LS_WEATHER_TOGGLE, "0");
      } finally {
        btn.disabled = false;
      }
    } else {
      setWeatherVisible(map, false);
    }
  });

  // falls beim letzten Mal ON gespeichert war
  if (initialOn) {
    (async () => {
      try {
        btn.disabled = true;
        await ensureWeatherOverlay(map);
        setWeatherVisible(map, true);
      } catch (err) {
        console.error("Weather overlay init failed:", err);
        applyWeatherToggleUI(btn, false);
        localStorage.setItem(LS_WEATHER_TOGGLE, "0");
      } finally {
        btn.disabled = false;
      }
    })();
  }
}

export function createMap() {
  const map = L.map("map").setView([51, 10], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(map);

  initWeatherToggle(map);

  return map;
}