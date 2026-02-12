const fs = require('fs');
const fetch = require('node-fetch'); // Node 18+: fetch ist global, sonst node-fetch v2

const API_KEY = process.env.OPENWEATHER_KEY;
const LAT = '52.5200'; // Beispiel: Berlin
const LON = '13.4050';

async function main() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric`);
    const data = await res.json();

    // JSON in data/weather.json speichern
    fs.writeFileSync('data/weather.json', JSON.stringify(data, null, 2));
    console.log('Weather data updated!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
