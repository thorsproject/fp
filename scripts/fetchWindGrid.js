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
  "100": { spd: "wind_speed_700hPa", dir: "wind_direction_700hPa", tmp: "temperature_700hPa" },
  "180": { spd: "wind_speed_500hPa", dir: "wind_direction_500hPa", tmp: "temperature_500hPa" }
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

  // alle benötigten "stündliche" Variablen in einem Request
const hourlyVars = [
  "wind_speed_10m", "wind_direction_10m", "temperature_2m",
  "wind_speed_925hPa", "wind_direction_925hPa", "temperature_925hPa",
  "wind_speed_850hPa", "wind_direction_850hPa", "temperature_850hPa",
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
      const h = item.hourly || {};

      // wir nehmen den ersten verfügbaren Zeitpunkt
      // (alternativ: nächster zu "jetzt" – können wir später verfeinern)
      for (const [lvl, vars] of Object.entries(LEVEL_MAP)) {
        const spdArr = h[vars.spd];
        const dirArr = h[vars.dir];
        const tmpArr = h[vars.tmp];

        const spd = Array.isArray(spdArr) ? spdArr[0] : undefined;
        const dir = Array.isArray(dirArr) ? dirArr[0] : undefined;
        const tmp = Array.isArray(tmpArr) ? tmpArr[0] : undefined;

        if (typeof spd === "number" && typeof dir === "number") {
          const obj = { lat, lon, speed: spd, deg: dir };
          if (typeof tmp === "number") obj.temp = tmp;
          levelsOut[lvl].push(obj);
        }
      }
    }
    console.log(`Chunk ${i + 1}/${chunks.length} verarbeitet`);
  }

  const out = {
    generatedAt: Math.floor(Date.now() / 1000),
    meta: { ...BOUNDS, step: STEP },
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