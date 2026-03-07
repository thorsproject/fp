// map.js
// ------------------ LEAFLET MAP ------------------
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
  if (!btn) return;

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  const saved = localStorage.getItem(LS_WEATHER_TOGGLE);
  const isOn = saved === "1";

  applyWeatherToggleUI(btn, isOn);
  setWeatherVisible(map, isOn);

  btn.addEventListener("click", () => {
    const nextOn = btn.dataset.state !== "on";

    applyWeatherToggleUI(btn, nextOn);
    setWeatherVisible(map, nextOn);
    localStorage.setItem(LS_WEATHER_TOGGLE, nextOn ? "1" : "0");
  });
}

export function createMap() {
  const map = L.map("map").setView([51, 10], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(map);

  initWeatherToggle(map);

  return map;
}