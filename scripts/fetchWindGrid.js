const fs = require("fs");

const API_KEY = process.env.OPENWEATHER_KEY;

// Deutschland grob
const BOUNDS = { west: 5.5, east: 16.5, south: 47.0, north: 55.5 };
const STEP = 0.5;

// Concurrency Limit
async function mapLimit(items, limit, fn) {
  const ret = new Array(items.length);
  let i = 0;

  const workers = new Array(limit).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      ret[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return ret;
}

function makePoints() {
  const pts = [];
  for (let lat = BOUNDS.south; lat <= BOUNDS.north + 1e-9; lat += STEP) {
    for (let lon = BOUNDS.west; lon <= BOUNDS.east + 1e-9; lon += STEP) {
      pts.push({ lat: +lat.toFixed(4), lon: +lon.toFixed(4) });
    }
  }
  return pts;
}

async function fetchPoint(p) {
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${p.lat}&lon=${p.lon}` +
    `&appid=${API_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.wind || typeof data.wind.speed !== "number") return null;

  return {
    lat: p.lat,
    lon: p.lon,
    speed: data.wind.speed, // m/s
    deg: data.wind.deg ?? 0
  };
}

async function main() {
  if (!API_KEY) {
    console.error("OPENWEATHER_KEY fehlt");
    process.exit(1);
  }

  const pts = makePoints();
  console.log("Punkte gesamt:", pts.length);

  // wenn Rate-Limit: auf 5 reduzieren
  const results = await mapLimit(pts, 8, fetchPoint);
  const points = results.filter(Boolean);

  const out = {
    generatedAt: Math.floor(Date.now() / 1000),
    meta: { ...BOUNDS, step: STEP },
    points
  };

  fs.writeFileSync("data/windgrid.json", JSON.stringify(out, null, 2));
  console.log("windgrid.json geschrieben. Punkte:", points.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});