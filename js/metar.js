// ------------------ METAR/TAF -------------------
  // MET Norway TAF/Metar API (Textformat) :contentReference[oaicite:2]{index=2}
export async function fetchMetarTaf(icao) {
  const url = `https://api.met.no/weatherapi/tafmetar/1.0/tafmetar.txt?icao=${encodeURIComponent(icao)}&ts=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`METAR/TAF Fehler ${res.status}`);
  const txt = await res.text();
  // Antwort ist Text mit ggf. mehreren Zeilen; wir zeigen sie "raw" im <pre>
  return txt.trim() || "Keine METAR/TAF-Daten gefunden (letzte 24h).";
}