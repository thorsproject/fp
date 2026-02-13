const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "data", "approved_alternates.csv");
const airfieldsJsonPath = path.join(__dirname, "..", "data", "airfields.json");
const outJsonPath = path.join(__dirname, "..", "data", "alternates.json");
const missingPath = path.join(__dirname, "..", "data", "alternates_missing.txt");

function splitCsvLine(line) {
  // Unterstützt ; oder , (falls Excel mal anders speichert)
  const sep = line.includes(";") ? ";" : ",";
  return line.split(sep).map(s => s.trim());
}

function parseCsvIcaos(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const header = splitCsvLine(lines[0]).map(s => s.toLowerCase());
  const icaoIdx = header.findIndex(h => h === "icao");

  if (icaoIdx === -1) {
    throw new Error("CSV Header muss eine Spalte 'ICAO' enthalten.");
  }

  return lines.slice(1).map(line => {
    const cols = splitCsvLine(line);
    return (cols[icaoIdx] || "").toUpperCase();
  }).filter(Boolean);
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error("approved_alternates.csv nicht gefunden:", csvPath);
    process.exit(1);
  }
  if (!fs.existsSync(airfieldsJsonPath)) {
    console.error("airfields.json nicht gefunden:", airfieldsJsonPath);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf8");
  const approved = parseCsvIcaos(csv);

  const airfields = JSON.parse(fs.readFileSync(airfieldsJsonPath, "utf8"));

  const out = {};
  const missing = [];

  for (const icao of approved) {
    if (airfields[icao]) out[icao] = airfields[icao];
    else missing.push(icao);
  }

  fs.writeFileSync(outJsonPath, JSON.stringify(out, null, 2));
  fs.writeFileSync(missingPath, missing.join("\n"));

  console.log(`alternates.json geschrieben: ${Object.keys(out).length} Einträge`);
  console.log(`alternates_missing.txt: ${missing.length} fehlend`);
}

main();