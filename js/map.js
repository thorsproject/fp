// ------------------ LEAFLET MAP ------------------
const OWM_API_KEY = "fa312700068b80ce4efac1751a51b543";
const LS_WEATHER_TOGGLE = "fp.map.weather.v1";

function setBtnState(btn, onState) {
  if (!btn) return;
  btn.textContent = onState ? "ON" : "OFF";
  btn.classList.toggle("is-on", !!onState);
}

function initWeatherToggle(map, cloudTiles) {
  const btn = document.getElementById("toggleWeather");
  if (!btn) return;

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  const isOn = false;

  if (isOn) {
    cloudTiles.addTo(map);
  }

  setBtnState(btn, isOn);

  btn.addEventListener("click", () => {
    const nextOn = btn.textContent !== "ON";

    if (nextOn) {
      cloudTiles.addTo(map);
    } else {
      map.removeLayer(cloudTiles);
    }

    localStorage.setItem(LS_WEATHER_TOGGLE, nextOn ? "1" : "0");
    setBtnState(btn, nextOn);
  });
}

export async function createMap() {
  const map = L.map("map").setView([51, 10], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(map);

  const cloudTiles = L.tileLayer(
    `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    {
      opacity: 0.45,
      attribution: "Weather © OpenWeatherMap",
    }
  );

  initWeatherToggle(map, cloudTiles);

  return map;
}