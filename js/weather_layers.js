// js/weather_layers.js
let weatherCanvasLayer = null;

const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/ecmwf";

const BOUNDS = {
  west: 5.5,
  east: 16.5,
  south: 47.0,
  north: 55.5,
};

const STEP = 0.75; // 1.0 = schneller, 0.75 = schöner

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
  if (!Array.isArray(times) || !times.length) return 0;

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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getGridInfo(points) {
  const lats = [...new Set(points.map((p) => p.lat))].sort((a, b) => a - b);
  const lons = [...new Set(points.map((p) => p.lon))].sort((a, b) => a - b);

  const byKey = new Map();
  for (const p of points) {
    byKey.set(`${p.lat}|${p.lon}`, p);
  }

  return { lats, lons, byKey };
}

function sampleBilinear(grid, lat, lon, field) {
  const { lats, lons, byKey } = grid;

  const latMin = lats[0];
  const latMax = lats[lats.length - 1];
  const lonMin = lons[0];
  const lonMax = lons[lons.length - 1];

  const clat = clamp(lat, latMin, latMax);
  const clon = clamp(lon, lonMin, lonMax);

  const lat0 = Math.floor((clat - latMin) / STEP) * STEP + latMin;
  const lon0 = Math.floor((clon - lonMin) / STEP) * STEP + lonMin;

  const aLat = +lat0.toFixed(3);
  const aLon = +lon0.toFixed(3);
  const bLat = +(aLat + STEP).toFixed(3);
  const bLon = +(aLon + STEP).toFixed(3);

  const p00 = byKey.get(`${aLat}|${aLon}`);
  const p10 = byKey.get(`${bLat}|${aLon}`) || p00;
  const p01 = byKey.get(`${aLat}|${bLon}`) || p00;
  const p11 = byKey.get(`${bLat}|${bLon}`) || p00;

  if (!p00) return 0;

  const tx = STEP === 0 ? 0 : clamp((clon - aLon) / STEP, 0, 1);
  const ty = STEP === 0 ? 0 : clamp((clat - aLat) / STEP, 0, 1);

  const v00 = p00[field] ?? 0;
  const v10 = p10?.[field] ?? v00;
  const v01 = p01?.[field] ?? v00;
  const v11 = p11?.[field] ?? v00;

  const v0 = lerp(v00, v01, tx);
  const v1 = lerp(v10, v11, tx);
  return lerp(v0, v1, ty);
}

function cloudColor(v) {
  if (v < 8) return null;

  if (v < 20) return [220, 220, 220, 22];
  if (v < 40) return [185, 185, 185, 36];
  if (v < 60) return [145, 145, 145, 54];
  if (v < 80) return [110, 110, 110, 72];
  return [80, 80, 80, 92];
}

function precipColor(v) {
  if (v < 0.08) return null;

  if (v < 0.4) return [120, 180, 255, 38];
  if (v < 1.5) return [50, 130, 255, 58];
  if (v < 4) return [0, 70, 210, 82];
  return [170, 0, 255, 100];
}

const WeatherCanvasLayer = L.Layer.extend({
  initialize(points) {
    this._points = points;
    this._grid = getGridInfo(points);
  },

  onAdd(map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "leaflet-weather-layer");
    this._canvas.style.position = "absolute";
    this._canvas.style.pointerEvents = "none";

    const pane = map.getPanes().overlayPane;
    pane.appendChild(this._canvas);

    map.on("moveend zoomend resize", this._redraw, this);
    this._redraw();
  },

  onRemove(map) {
    map.off("moveend zoomend resize", this._redraw, this);
    if (this._canvas?.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
  },

  _redraw() {
    if (!this._map || !this._canvas) return;

    const size = this._map.getSize();
    const bounds = this._map.getBounds();
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);

    this._canvas.width = size.x;
    this._canvas.height = size.y;
    L.DomUtil.setPosition(this._canvas, topLeft);

    const ctx = this._canvas.getContext("2d");
    ctx.clearRect(0, 0, size.x, size.y);

    const img = ctx.createImageData(size.x, size.y);
    const data = img.data;

    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    for (let y = 0; y < size.y; y++) {
      const lat = lerp(north, south, y / Math.max(1, size.y - 1));

      for (let x = 0; x < size.x; x++) {
        const lon = lerp(west, east, x / Math.max(1, size.x - 1));

        const cloud = sampleBilinear(this._grid, lat, lon, "cloud");
        const precip = sampleBilinear(this._grid, lat, lon, "precip");

        const cc = cloudColor(cloud);
        const pc = precipColor(precip);

        const i = (y * size.x + x) * 4;

        let r = 0, g = 0, b = 0, a = 0;

        if (cc) {
          r = cc[0]; g = cc[1]; b = cc[2]; a = cc[3];
        }

        if (pc) {
          // Niederschlag überlagert Wolken
          r = pc[0];
          g = pc[1];
          b = pc[2];
          a = Math.max(a, pc[3]);
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = a;
      }
    }

    ctx.putImageData(img, 0, 0);
  }
});

export async function createWeatherLayers(map) {
  const points = await fetchWeatherGrid();
  weatherCanvasLayer = new WeatherCanvasLayer(points);
  map._weatherLayer = weatherCanvasLayer;
}

export function setWeatherVisible(map, isOn) {
  const layer = map._weatherLayer;
  if (!layer) return;

  if (isOn) {
    if (!map.hasLayer(layer)) layer.addTo(map);
  } else {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  }
}