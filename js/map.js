// ------------------ LEAFLET MAP ------------------
const OWM_API_KEY = "fa312700068b80ce4efac1751a51b543";

const LS_WEATHER_TOGGLE = "fp.map.weather.v1";
const LS_RADAR_TOGGLE = "fp.map.radar.v1";

function setBtnState(btn, onState) {
  if (!btn) return;
  btn.textContent = onState ? "ON" : "OFF";
  btn.classList.toggle("is-on", !!onState);
}

function initTileToggle({ map, buttonId, layer, storageKey }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  const isOn = false;

  if (isOn) {
    layer.addTo(map);
  }

  setBtnState(btn, isOn);

  btn.addEventListener("click", () => {
    const nextOn = btn.textContent !== "ON";

    if (nextOn) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }

    setBtnState(btn, nextOn);
  });
}

export async function createMap() {
  const map = L.map("map").setView([51, 10], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(map);

  // ---------- Clouds ----------
  const cloudTiles = L.tileLayer(
    `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    {
      opacity: 0.45,
      attribution: "Weather © OpenWeatherMap",
    }
  );

  // ---------- Radar ----------
  const radarTiles = L.tileLayer(
    "https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png",
    {
      opacity: 0.5,
      attribution: "Radar © RainViewer",
    }
  );

  initTileToggle({
    map,
    buttonId: "toggleWeather",
    layer: cloudTiles,
    storageKey: LS_WEATHER_TOGGLE,
  });

  initTileToggle({
    map,
    buttonId: "toggleRadar",
    layer: radarTiles,
    storageKey: LS_RADAR_TOGGLE,
  });

  return map;
}