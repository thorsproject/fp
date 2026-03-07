const fs = require("fs");

// Deutschland grob (bei Bedarf anpassen)
const BOUNDS = { west: 5.5, east: 16.5, south: 47.0, north: 55.5 };
const STEP = 0.5;

// Aviation-Auswahl -> Open-Meteo Ebenen
// SFC = 10m. Die anderen mappen wir auf Druckflächen (ungefähr):
// 25 ~ 925 hPa, 50 ~ 850 hPa, 80 ~ 750 hPa, 100 ~ 700 hPa, 180 ~ 500 hPa
// (Open-Meteo stellt Wind auf Druckflächen bereit, z.B. wind_speed_925hPa.) :contentReference[oaicite:1]{index=1}
const LEVEL_MAP = {
  "SFC": { spd: "wind_speed_10m",  dir: "wind_direction_10m",  tmp: "temperature_2m" },
  "25":  { spd: "wind_speed_925hPa", dir: "wind_direction_925hPa", tmp: "temperature_925hPa" },
  "50":  { spd: "wind_speed_850hPa", dir: "wind_direction_850hPa", tmp: "temperature_850hPa" },
  "80":  { spd: "wind_speed_750hPa", dir: "wind_direction_750hPa", tmp: "temperature_750hPa" },
  "100": { spd: "wind_speed_700hPa", dir: "wind_direction_700hPa", tmp: "temperature_700hPa" },
  "180": { spd: "wind_speed_500hPa", dir: "wind_direction_500hPa", tmp: "temperature_500hPa" }
};


// Open-Meteo ECMWF Endpoint (Pressure Level Variablen) :contentReference[oaicite:2]{index=2}
// const ENDPOINT = "https://api.open-meteo.com/v1/ecmwf"; // <-- liefert keine 750hpa-Daten
const ENDPOINT = "https://api.open-meteo.com/v1/cma"; // <-- liefert 750hpa-Daten

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function fetchChunk(points, attempt = 1) {
  const lats = points.map(p => p.lat).join(",");
  const lons = points.map(p => p.lon).join(",");

  const hourlyVars = [
    "wind_speed_10m", "wind_direction_10m", "temperature_2m",
    "wind_speed_925hPa", "wind_direction_925hPa", "temperature_925hPa",
    "wind_speed_850hPa", "wind_direction_850hPa", "temperature_850hPa",
    "wind_speed_750hPa", "wind_direction_750hPa", "temperature_750hPa",
    "wind_speed_700hPa", "wind_direction_700hPa", "temperature_700hPa",
    "wind_speed_500hPa", "wind_direction_500hPa", "temperature_500hPa"
  ].join(",");

  const url =
    `${ENDPOINT}?latitude=${encodeURIComponent(lats)}&longitude=${encodeURIComponent(lons)}` +
    `&hourly=${encodeURIComponent(hourlyVars)}` +
    `&wind_speed_unit=ms` +
    `&temperature_unit=celsius` +
    `&timezone=GMT`;

  const res = await fetch(url);

  if (res.status === 429) {
    const txt = await res.text().catch(() => "");
    if (attempt >= 5) {
      throw new Error(`Open-Meteo Fehler 429 nach ${attempt} Versuchen: ${txt.slice(0, 200)}`);
    }

    const waitMs = 65000; // Open-Meteo sagt selbst: try again in one minute
    console.log(`429 erhalten – warte ${waitMs / 1000}s, Versuch ${attempt + 1}/5`);
    await sleep(waitMs);
    return fetchChunk(points, attempt + 1);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Open-Meteo Fehler ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

async function main() {
  const pts = makePoints();
  console.log("Punkte gesamt:", pts.length);

  const levelsOut = {};
  for (const key of Object.keys(LEVEL_MAP)) levelsOut[key] = [];
  let nearestTimeUsed = null;

  const chunks = chunk(pts, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const list = await fetchChunk(c);

    for (const item of list) {
      const lat = +item.latitude.toFixed(4);
      const lon = +item.longitude.toFixed(4);
      const h = item.hourly || {};

      const timeArr = h.time || [];
      const idx = findNearestTimeIndex(timeArr);
      if (!nearestTimeUsed && Array.isArray(timeArr) && timeArr[idx]) {
        nearestTimeUsed = timeArr[idx];
      }

      for (const [lvl, vars] of Object.entries(LEVEL_MAP)) {
        const spdArr = h[vars.spd];
        const dirArr = h[vars.dir];
        const tmpArr = h[vars.tmp];

        const spd = Array.isArray(spdArr) ? spdArr[idx] : null;
        const dir = Array.isArray(dirArr) ? dirArr[idx] : null;
        const tmp = Array.isArray(tmpArr) ? tmpArr[idx] : null;

        if (typeof spd === "number" && typeof dir === "number") {
          const obj = { lat, lon, speed: spd, deg: dir };
          if (typeof tmp === "number") obj.temp = tmp;
          levelsOut[lvl].push(obj);
        }
      }
    }

    console.log(`Chunk ${i + 1}/${chunks.length} verarbeitet`);

    if (i < chunks.length - 1) {
      await sleep(3000);
    }
  }

  const out = {
    generatedAt: Math.floor(Date.now() / 1000),
    meta: {
      ...BOUNDS,
      step: STEP,
      source: "Open-Meteo CMA",
      nearestTimeUsed: nearestTimeUsed || null,
      endpoint: ENDPOINT
    },
    levels: levelsOut
  };

  fs.writeFileSync("data/windgrid.json", JSON.stringify(out, null, 2));
  console.log("windgrid.json geschrieben. Punkte:", Object.fromEntries(
    Object.entries(levelsOut).map(([k, v]) => [k, v.length])
  ));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});