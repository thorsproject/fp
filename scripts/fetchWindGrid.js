const fs = require("fs");

// Deutschland grob (bei Bedarf anpassen)
const BOUNDS = { west: 5.5, east: 16.5, south: 47.0, north: 55.5 };
const STEP = 0.5;

// Aviation-Auswahl -> Open-Meteo Ebenen
// SFC = 10m. Die anderen mappen wir auf Druckflächen (ungefähr):
// 25 ~ 925 hPa, 50 ~ 850 hPa, 75 fehlt, 100 ~ 700 hPa, 180 ~ 500 hPa
// (Open-Meteo stellt Wind auf Druckflächen bereit, z.B. wind_speed_925hPa.) :contentReference[oaicite:1]{index=1}
const LEVEL_MAP = {
  "SFC": { spd: "wind_speed_10m",  dir: "wind_direction_10m" },
  "25":  { spd: "wind_speed_925hPa", dir: "wind_direction_925hPa" },
  "50":  { spd: "wind_speed_850hPa", dir: "wind_direction_850hPa" },
  "100":  { spd: "wind_speed_700hPa", dir: "wind_direction_700hPa" },
  "180": { spd: "wind_speed_500hPa", dir: "wind_direction_500hPa" }
};

// Open-Meteo ECMWF Endpoint (Pressure Level Variablen) :contentReference[oaicite:2]{index=2}
const ENDPOINT = "https://api.open-meteo.com/v1/ecmwf";

// URL wird sonst zu lang -> wir splitten in Chunks
const CHUNK_SIZE = 60;

function makePoints() {
  const pts = [];
  for (let lat = BOUNDS.south; lat <= BOUNDS.north + 1e-9; lat += STEP) {
    for (let lon = BOUNDS.west; lon <= BOUNDS.east + 1e-9; lon += STEP) {
      pts.push({ lat: +lat.toFixed(4), lon: +lon.toFixed(4) });
    }
  }
  return pts;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchChunk(points) {
  const lats = points.map(p => p.lat).join(",");
  const lons = points.map(p => p.lon).join(",");

  // alle benötigten "current" Variablen in einem Request
  const currentVars = [
    "wind_speed_10m", "wind_direction_10m",
    "wind_speed_925hPa", "wind_direction_925hPa",
    "wind_speed_850hPa", "wind_direction_850hPa",
    "wind_speed_700hPa", "wind_direction_700hPa",
    "wind_speed_500hPa", "wind_direction_500hPa" 
  ].join(",");

  const url =
    `${ENDPOINT}?latitude=${encodeURIComponent(lats)}&longitude=${encodeURIComponent(lons)}` +
    `&current=${encodeURIComponent(currentVars)}` +
    `&wind_speed_unit=ms&timezone=GMT`;

  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Open-Meteo Fehler ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();

  // Bei mehreren Koordinaten liefert Open-Meteo eine Liste von Strukturen. :contentReference[oaicite:3]{index=3}
  const list = Array.isArray(data) ? data : [data];
  return list;
}

async function main() {
  const pts = makePoints();
  console.log("Punkte gesamt:", pts.length);

  const levelsOut = {};
  for (const key of Object.keys(LEVEL_MAP)) levelsOut[key] = [];

  const chunks = chunk(pts, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const list = await fetchChunk(c);

    for (const item of list) {
      const lat = +item.latitude.toFixed(4);
      const lon = +item.longitude.toFixed(4);
      const cur = item.current || {};

      // pro Höhe einen Eintrag, wenn Werte vorhanden
      for (const [lvl, vars] of Object.entries(LEVEL_MAP)) {
        const spd = cur[vars.spd];
        const dir = cur[vars.dir];

        if (typeof spd === "number" && typeof dir === "number") {
          levelsOut[lvl].push({ lat, lon, speed: spd, deg: dir });
        }
      }
    }

    console.log(`Chunk ${i + 1}/${chunks.length} verarbeitet`);
  }

  const out = {
    generatedAt: Math.floor(Date.now() / 1000),
    meta: { ...BOUNDS
