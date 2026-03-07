// weather_layers.js

let cloudLayer = null;
let precipLayer = null;

async function fetchWeather() {

  const url =
    "https://api.open-meteo.com/v1/ecmwf" +
    "?latitude=51" +
    "&longitude=10" +
    "&hourly=cloud_cover,precipitation" +
    "&timezone=GMT";

  const res = await fetch(url);
  const data = await res.json();

  return data.hourly;
}

function colorCloud(v) {

  if (v < 20) return "rgba(0,0,0,0)";
  if (v < 40) return "rgba(200,200,200,0.3)";
  if (v < 60) return "rgba(150,150,150,0.45)";
  if (v < 80) return "rgba(110,110,110,0.6)";
  return "rgba(80,80,80,0.75)";
}

function colorRain(v) {

  if (v < 0.1) return "rgba(0,0,0,0)";
  if (v < 0.5) return "rgba(120,180,255,0.35)";
  if (v < 2) return "rgba(40,120,255,0.5)";
  if (v < 5) return "rgba(0,60,200,0.65)";
  return "rgba(180,0,255,0.75)";
}

export async function createWeatherLayers(map) {

  const w = await fetchWeather();

  const cloud = w.cloud_cover[0];
  const rain = w.precipitation[0];

  const bounds = map.getBounds();

  cloudLayer = L.rectangle(bounds, {
    color: "transparent",
    fillColor: colorCloud(cloud),
    fillOpacity: 1
  });

  precipLayer = L.rectangle(bounds, {
    color: "transparent",
    fillColor: colorRain(rain),
    fillOpacity: 1
  });

  cloudLayer.addTo(map);
  precipLayer.addTo(map);
}

export function setWeatherVisible(map, on) {

  if (!cloudLayer || !precipLayer) return;

  if (on) {
    cloudLayer.addTo(map);
    precipLayer.addTo(map);
  } else {
    map.removeLayer(cloudLayer);
    map.removeLayer(precipLayer);
  }
}