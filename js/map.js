// ------------------ LEAFLET MAP ------------------

let mapInstance = null;

let cloudTiles = null;
let radarTiles = null;

function setBtnState(btn, onState) {
  if (!btn) return;
  btn.textContent = onState ? "ON" : "OFF";
  btn.classList.toggle("is-on", !!onState);
}

function initTileToggle({ map, buttonId, layer, defaultOn = false }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  if (defaultOn) {
    layer.addTo(map);
  }

  setBtnState(btn, defaultOn);

  btn.addEventListener("click", () => {
    const nextOn = !map.hasLayer(layer);

    if (nextOn) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }

    setBtnState(btn, nextOn);
  });
}

export async function createMap() {
  if (mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 0);
    return mapInstance;
  }

  mapInstance = L.map("map").setView([51, 10], 6);

  // ---------- Panes ----------
  mapInstance.createPane("cloudPane");
  mapInstance.getPane("cloudPane").style.zIndex = 320;

  mapInstance.createPane("radarPane");
  mapInstance.getPane("radarPane").style.zIndex = 330;

  mapInstance.createPane("windPane");
  mapInstance.getPane("windPane").style.zIndex = 340;

  // ---------- Base ----------
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(mapInstance);

  // ---------- Clouds ----------
  cloudTiles = L.tileLayer(
    "https://fp-weather-proxy.thors-project.workers.dev/clouds/{z}/{x}/{y}.png",
    {
      pane: "cloudPane",
      opacity: 0.75,
      attribution: "Weather © OpenWeatherMap",
    }
  );

  // ---------- Radar ----------
  radarTiles = L.tileLayer(
    "https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png",
    {
      pane: "radarPane",
      opacity: 0.42,
      attribution: "Radar © RainViewer",
    }
  );

  initTileToggle({
    map: mapInstance,
    buttonId: "toggleWeather",
    layer: cloudTiles,
    defaultOn: false,
  });

  initTileToggle({
    map: mapInstance,
    buttonId: "toggleRadar",
    layer: radarTiles,
    defaultOn: false,
  });

  setTimeout(() => mapInstance.invalidateSize(), 0);
  return mapInstance;
}