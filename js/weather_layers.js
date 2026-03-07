let cloudLayerGroup = null;
let precipLayerGroup = null;

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/ecmwf";

// Deutschland grob
const BOUNDS = {
  west: 5.5,
  east: 16.5,
  south: 47.0,
  north: 55.5,
};

// Für schöne Darstellung auf der Karte
const STEP = 0.25; // 1.0 = wenig Zellen, 0.5 = schöner aber mehr Layer

function makePoints() {
  const pts = [];
  for (let lat = BOUNDS.south; lat <= BOUNDS.north + 1e-9; lat += STEP) {
    for (let lon = BOUNDS.west; lon <= BOUNDS.east + 1e-9; lon += STEP) {
      pts.push({
        lat: +lat.toFixed(3),
        lon: +lon.toFixed(3),
      });
    }
  }
  return pts;
}

function findNearestTimeIndex(times) {
  if (!Array.isArray(times) || times.length === 0) return 0;

  const now = Date.now();
  let bestIdx = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const t = Date.parse(times[i]);
    if (!Number.isFinite(t)) continue;

    const diff = Math.abs(t - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx;
}

async function fetchWeatherGrid() {
  const pts = makePoints();
  const lats = pts.map((p) => p.lat).join(",");
  const lons = pts.map((p) => p.lon).join(",");

  const url =
    `${WEATHER_ENDPOINT}?latitude=${encodeURIComponent(lats)}` +
    `&longitude=${encodeURIComponent(lons)}` +
    `&hourly=cloud_cover,precipitation` +
    `&timezone=GMT`;

  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Weather layer fetch failed ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : [data];

  return list.map((item) => {
    const h = item.hourly || {};
    const idx = findNearestTimeIndex(h.time || []);

    return {
      lat: +item.latitude.toFixed(3),
      lon: +item.longitude.toFixed(3),
      cloud: Array.isArray(h.cloud_cover) ? h.cloud_cover[idx] : null,
      precip: Array.isArray(h.precipitation) ? h.precipitation[idx] : null,
    };
  });
}

function cloudStyle(v) {
  if (typeof v !== "number" || v < 10) return null;
  if (v < 25) return { fillColor: "rgba(220,220,220,0.18)" };
  if (v < 50) return { fillColor: "rgba(180,180,180,0.28)" };
  if (v < 75) return { fillColor: "rgba(130,130,130,0.40)" };
  return { fillColor: "rgba(90,90,90,0.52)" };
}

function precipStyle(v) {
  if (typeof v !== "number" || v < 0.1) return null;
  if (v < 0.5) return { fillColor: "rgba(120,180,255,0.28)" };
  if (v < 2) return { fillColor: "rgba(40,120,255,0.40)" };
  if (v < 5) return { fillColor: "rgba(0,60,200,0.52)" };
  return { fillColor: "rgba(180,0,255,0.62)" };
}

function makeCell(lat, lon, style) {
  const half = STEP / 2;

  return L.rectangle(
    [
      [lat - half, lon - half],
      [lat + half, lon + half],
    ],
    {
      color: "transparent",
      weight: 0,
      fillOpacity: 1,
      ...style,
    }
  );
}

export async function createWeatherLayers(map) {
  const data = await fetchWeatherGrid();

  cloudLayerGroup = L.layerGroup();
  precipLayerGroup = L.layerGroup();

  for (const p of data) {
    const cStyle = cloudStyle(p.cloud);
    if (cStyle) {
      makeCell(p.lat, p.lon, cStyle).addTo(cloudLayerGroup);
    }

    const rStyle = precipStyle(p.precip);
    if (rStyle) {
      makeCell(p.lat, p.lon, rStyle).addTo(precipLayerGroup);
    }
  }

  // Start aus
  map._weatherCloudLayer = cloudLayerGroup;
  map._weatherPrecipLayer = precipLayerGroup;
}

export function setWeatherVisible(map, isOn) {
  const cloud = map._weatherCloudLayer;
  const precip = map._weatherPrecipLayer;

  if (!cloud || !precip) return;

  if (isOn) {
    cloud.addTo(map);
    precip.addTo(map);
  } else {
    map.removeLayer(cloud);
    map.removeLayer(precip);
  }
}