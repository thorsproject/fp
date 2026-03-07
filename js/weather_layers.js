let weatherOverlay = null;
let weatherLoaded = false;

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/ecmwf";

const BOUNDS = {
  west: 5.5,
  east: 16.5,
  south: 47.0,
  north: 55.5,
};

const STEP = 0.75;

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
    throw new Error(`Weather fetch failed ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : [data];

  return list.map((item) => {
    const h = item.hourly || {};
    const idx = findNearestTimeIndex(h.time || []);

    return {
      lat: +item.latitude.toFixed(3),
      lon: +item.longitude.toFixed(3),
      cloud: Array.isArray(h.cloud_cover) ? h.cloud_cover[idx] : 0,
      precip: Array.isArray(h.precipitation) ? h.precipitation[idx] : 0,
    };
  });
}

function cloudStyle(v) {
  if (typeof v !== "number" || v < 10) return null;
  if (v < 25) return "rgba(220,220,220,0.12)";
  if (v < 50) return "rgba(180,180,180,0.18)";
  if (v < 75) return "rgba(130,130,130,0.24)";
  return "rgba(90,90,90,0.30)";
}

function precipStyle(v) {
  if (typeof v !== "number" || v < 0.1) return null;
  if (v < 0.5) return "rgba(120,180,255,0.18)";
  if (v < 2) return "rgba(40,120,255,0.28)";
  if (v < 5) return "rgba(0,60,200,0.36)";
  return "rgba(180,0,255,0.44)";
}

function drawCell(ctx, x, y, w, h, color) {
  if (!color) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

async function buildWeatherOverlay(map) {
  const points = await fetchWeatherGrid();

  const lats = [...new Set(points.map((p) => p.lat))].sort((a, b) => b - a);
  const lons = [...new Set(points.map((p) => p.lon))].sort((a, b) => a - b);

  const cols = lons.length;
  const rows = lats.length;

  const cellPx = 32;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellPx;
  canvas.height = rows * cellPx;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const latIndex = new Map(lats.map((v, i) => [v, i]));
  const lonIndex = new Map(lons.map((v, i) => [v, i]));

  for (const p of points) {
    const row = latIndex.get(p.lat);
    const col = lonIndex.get(p.lon);
    if (row == null || col == null) continue;

    const x = col * cellPx;
    const y = row * cellPx;

    drawCell(ctx, x, y, cellPx, cellPx, cloudStyle(p.cloud));
    drawCell(ctx, x, y, cellPx, cellPx, precipStyle(p.precip));
  }

  const url = canvas.toDataURL("image/png");

  weatherOverlay = L.imageOverlay(
    url,
    [
      [BOUNDS.south, BOUNDS.west],
      [BOUNDS.north, BOUNDS.east],
    ],
    {
      opacity: 1,
      interactive: false,
    }
  );

  map._weatherOverlay = weatherOverlay;
  weatherLoaded = true;
}

export async function ensureWeatherOverlay(map) {
  if (weatherLoaded && map._weatherOverlay) return;
  await buildWeatherOverlay(map);
}

export function setWeatherVisible(map, isOn) {
  const layer = map._weatherOverlay;
  if (!layer) return;

  if (isOn) {
    if (!map.hasLayer(layer)) layer.addTo(map);
  } else {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  }
}