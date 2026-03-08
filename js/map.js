// ------------------ LEAFLET MAP ------------------
function initTileToggle({ map, buttonId, layer, storageKey }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  const isOn = false;
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

  // ---------- Panes ----------
  map.createPane("cloudPane");
  map.getPane("cloudPane").style.zIndex = 320;

  map.createPane("radarPane");
  map.getPane("radarPane").style.zIndex = 330;

  map.createPane("windPane");
  map.getPane("windPane").style.zIndex = 340;

  // ---------- Base ----------
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(map);

  // ---------- Clouds ----------
  const cloudTiles = L.tileLayer(
    "https://fp-weather-proxy.thors-project.workers.dev/clouds/{z}/{x}/{y}.png",
    {
      pane: "cloudPane",
      opacity: 0.75,
      attribution: "Weather © OpenWeatherMap",
    }
  );

  // ---------- Radar ----------
  const radarTiles = L.tileLayer(
    "https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png",
    {
      pane: "radarPane",
      opacity: 0.42,
      attribution: "Radar © RainViewer",
    }
  );

  initTileToggle({
    map,
    buttonId: "toggleWeather",
    layer: cloudTiles,
  });

  initTileToggle({
    map,
    buttonId: "toggleRadar",
    layer: radarTiles,
  });

  return map;
}