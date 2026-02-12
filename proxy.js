const fetch = require("node-fetch"); // falls Node 18+, fetch ist schon global

// Beispielwerte, können via Action-Input oder Event übergeben werden
const lat = "52.5200";
const lon = "13.4050";

const API_KEY = process.env.OPENWEATHER_KEY;

async function getWeather() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

getWeather();
