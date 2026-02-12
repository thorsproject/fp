const fs = require("fs");
const path = require("path");

function parseCsvSimple(text) {
  // Minimal-CSV-Parser (reicht für OurAirports und deine 1-Spalten-CSV)
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map(s => s.replace(/^"|"$/g, "").trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(s => s.replace(/^"|"$/g, "").trim());
    const obj = {};
    header.forEach((h, idx) => obj[h] = cols[idx]);
    rows.push(obj);
  }
  return rows;
}

async function main() {
  const allowedPath = path.join("data", "approved_airfields.csv");
  if (!fs.existsSync(allowedPath)) {
    console.error("Fehlt: data/approved_airfields.csv");
    process.exit(1);
  }

  const allowedCsv = fs.readFileSync(allowedPath, "utf8");
  const allowedRows = parseCsvSimple(allowedCsv);

  // ICAO-Liste normalisieren
  const allowed = new Set(
    allowedRows
      .map(r => (r.icao || r.ICAO || "").trim().toUpperCase())
      .filter(Boolean)
  );

  if (allowed.size === 0) {
    console.error("approved_airfields.csv enthält keine ICAO-Codes.");
    process.exit(1);
  }

  console.log("Erlaubte ICAOs:", allowed.size);

  // OurAirports airports.csv enthält ident + latitude_deg + longitude_deg + name :contentReference[oaicite:1]{index=1}
  const url = "https://ourairports.com/airports.csv";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OurAirports Download fehlgeschlagen: ${res.status}`);
  }
  const airportsCsv = await res.text();
  const airports = parseCsvSimple(airportsCsv);

  const out = {};
  let found = 0;

  for (const a of airports) {
    const ident = (a.ident || "").trim().toUpperCase();
    if (!allowed.has(ident)) continue;

    const lat = parseFloat(a.latitude_deg);
    const lon = parseFloat(a.longitude_deg);
    const name = (a.name || ident).trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    out[ident] = { lat, lon, name };
    found++;
  }

  // Report: welche ICAOs fehlen?
  const missing = [...allowed].filter(code => !out[code]);
  console.log("Gefunden:", found);
  console.log("Fehlend:", missing.length);

  fs.writeFileSync("data/airfields.json", JSON.stringify(out, null, 2));
  fs.writeFileSync("data/airfields_missing.txt", missing.sort().join("\n") + "\n");

  console.log("Geschrieben: data/airfields.json");
  console.log("Geschrieben: data/airfields_missing.txt");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});