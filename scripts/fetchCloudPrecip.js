const fs = require("fs");

const BOUNDS = { west: 5.5, east: 16.5, south: 47.0, north: 55.5 };
const STEP = 0.5;

const ENDPOINT = "https://api.open-meteo.com/v1/ecmwf";

function makePoints() {
  const pts = [];
  for (let lat = BOUNDS.south; lat <= BOUNDS.north; lat += STEP) {
    for (let lon = BOUNDS.west; lon <= BOUNDS.east; lon += STEP) {
      pts.push({ lat: +lat.toFixed(3), lon: +lon.toFixed(3) });
    }
  }
  return pts;
}

async function fetchWeather(points) {

  const lats = points.map(p => p.lat).join(",");
  const lons = points.map(p => p.lon).join(",");

  const url =
    `${ENDPOINT}?latitude=${lats}&longitude=${lons}` +
    `&hourly=cloud_cover,precipitation` +
    `&timezone=GMT`;

  const res = await fetch(url);
  const data = await res.json();

  return Array.isArray(data) ? data : [data];
}

async function main() {

  const pts = makePoints();
  const weather = await fetchWeather(pts);

  const out = [];

  for (const w of weather) {

    const lat = +w.latitude.toFixed(3);
    const lon = +w.longitude.toFixed(3);

    out.push({
      lat,
      lon,
      cloud: w.hourly.cloud_cover[0],
      precip: w.hourly.precipitation[0]
    });
  }

  fs.writeFileSync(
    "data/weathergrid.json",
    JSON.stringify(out, null, 2)
  );
}

main();