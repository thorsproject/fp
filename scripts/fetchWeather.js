const fs = require("fs");

const API_KEY = process.env.OPENWEATHER_KEY;

// grob Deutschland (anpassen, wenn nötig)
const BOUNDS = { west: 5.5, east: 16.5, south: 47.0, north: 55.5 };

// Rendering
const LEVELS = [
  { zoom: 5,  step: 5.0 },
  { zoom: 7,  step: 1.0 },
  { zoom: 9,  step: 0.7 },
  { zoom: 11, step: 0.5 },
];

// simple Concurrency-Limit (damit’s nicht zu hart ballert)
async function mapLimit(items, limit, fn) {
  const ret = [];
  let i = 0;
  const workers = new Array(limit).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return ret;
}

function makePoints(step) {
  const pts = [];
  for (let lat = BOUNDS.south; lat <= BOUNDS.north + 1e-9; lat += step) {
    for (let lon = BOUNDS.west; lon <= BOUNDS.east + 1e-9; lon += step) {
      pts.push({ lat: +lat.toFixed(4), lon: +lon.toFixed(4) });
    }
  }
  return pts;
}

async function fetchPoint(p) {
  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${p.lat}&lon=${p.lon}&appid=${API_KEY}&units=metric`;

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

  const out = { generatedAt: Math.floor(Date.now() / 1000), levels: {} };

  for (const lvl of LEVELS) {
    const pts = makePoints(lvl.step);

    // Concurrency 10 ist meist ok; wenn du auf Limits läufst, auf 5 reduzieren
    const results = await mapLimit(pts, 10, fetchPoint);
    const points = results.filter(Boolean);

    out.levels[String(lvl.zoom)] = { step: lvl.step, points };
    console.log(`zoom ${lvl.zoom}: ${points.length}/${pts.length} Punkte`);
  }

  fs.writeFileSync("data/windgrid.json", JSON.stringify(out, null, 2));
  console.log("windgrid.json geschrieben");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});