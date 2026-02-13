// js/airfields.js
// Lädt approved airfields + approved alternates, macht Autocomplete, Validierung,
// zeichnet AERO Marker + Route-Line, ALT Marker ohne Route-Line.
// METAR/TAF wird bei AERO-Markern beim Popup-Open nachgeladen.

let airfieldsDB = {};     // approved airfields
let alternatesDB = {};    // approved alternates

let aeroMarkers = [];
let altMarkers = [];
let routeLines = [];

// ------------------ LOADERS ------------------

export async function loadAirfields() {
  const res = await fetch("data/airfields.json?ts=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("airfields.json konnte nicht geladen werden");
  airfieldsDB = await res.json();
}

export async function loadAlternates() {
  const res = await fetch("data/alternates.json?ts=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("alternates.json konnte nicht geladen werden");
  alternatesDB = await res.json();
}

// ------------------ DATALISTS ------------------

export function buildAirfieldsDatalist() {
  const dl = document.getElementById("airfieldsList");
  if (!dl) return;

  dl.innerHTML = "";
  const keys = Object.keys(airfieldsDB).sort();

  for (const icao of keys) {
    const a = airfieldsDB[icao];
    const opt = document.createElement("option");
    opt.value = icao;
    opt.label = a?.name ? a.name : "";
    dl.appendChild(opt);
  }
}

export function buildAlternatesDatalist() {
  const dl = document.getElementById("alternatesList");
  if (!dl) return;

  dl.innerHTML = "";
  const keys = Object.keys(alternatesDB).sort();

  for (const icao of keys) {
    const a = alternatesDB[icao];
    const opt = document.createElement("option");
    opt.value = icao;
    opt.label = a?.name ? a.name : "";
    dl.appendChild(opt);
  }
}

export function attachDatalistToAeroInputs() {
  document.querySelectorAll("input.aero").forEach(inp => {
    inp.setAttribute("list", "airfieldsList");
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("spellcheck", "false");
  });
}

export function attachDatalistToAltInputs() {
  document.querySelectorAll("input.alt").forEach(inp => {
    inp.setAttribute("list", "alternatesList");
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("spellcheck", "false");
  });
}

// ------------------ ERROR UI (gemeinsam) ------------------

function showFieldError(input, msg) {
  input.classList.add("invalid");

  let err = input.parentNode?.querySelector(".aero-error");
  if (!err) {
    err = document.createElement("div");
    err.className = "aero-error";
    input.parentNode.appendChild(err);
  }
  err.textContent = msg;
}

function clearFieldError(input) {
  input.classList.remove("invalid");
  const err = input.parentNode?.querySelector(".aero-error");
  if (err) err.remove();
}

// ------------------ METAR / TAF ------------------

async function fetchMetarTaf(icao) {
  const url =
    `https://api.met.no/weatherapi/tafmetar/1.0/tafmetar.txt?icao=${encodeURIComponent(icao)}&ts=${Date.now()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`METAR/TAF Fehler ${res.status}`);

  const txt = await res.text();
  return txt.trim() || "Keine METAR/TAF-Daten gefunden (letzte 24h).";
}

// ------------------ DRAWING ------------------

export function updateLegMarkers(map) {
  // --- cleanup existing ---
  aeroMarkers.forEach(m => map.removeLayer(m));
  aeroMarkers = [];
  routeLines.forEach(l => map.removeLayer(l));
  routeLines = [];

  // --- collect AERO coords in order ---
  const inputs = Array.from(document.querySelectorAll("input.aero"));
  const coords = [];

  for (const inp of inputs) {
    const code = (inp.value || "").toUpperCase().trim();
    if (!airfieldsDB[code]) continue;

    const a = airfieldsDB[code];
    coords.push([a.lat, a.lon]);

    const m = L.marker([a.lat, a.lon]).addTo(map);
    m.bindPopup(`<b>${code}</b> – ${a.name || ""}<br>METAR/TAF lädt...`);

    m.on("popupopen", async () => {
      try {
        const data = await fetchMetarTaf(code);
        m.setPopupContent(
          `<b>${code}</b> – ${a.name || ""}<br>` +
          `<pre style="white-space:pre-wrap;margin:6px 0 0;">${data}</pre>`
        );
      } catch (e) {
        m.setPopupContent(
          `<b>${code}</b> – ${a.name || ""}<br>` +
          `<span style="color:#ff8080;">METAR/TAF konnte nicht geladen werden.</span>`
        );
      }
    });

    aeroMarkers.push(m);
  }

  // --- route line only between AEROs ---
  if (coords.length > 1) {
    const poly = L.polyline(coords, { color: "cyan" }).addTo(map);
    routeLines.push(poly);
    map.fitBounds(poly.getBounds(), { padding: [50, 50] });
  }
}

export function updateAltMarkers(map) {
  // --- cleanup existing ---
  altMarkers.forEach(m => map.removeLayer(m));
  altMarkers = [];

  const inputs = Array.from(document.querySelectorAll("input.alt"));

  for (const inp of inputs) {
    const code = (inp.value || "").toUpperCase().trim();
    if (!alternatesDB[code]) continue;

    const a = alternatesDB[code];
    const m = L.marker([a.lat, a.lon]).addTo(map)
      .bindPopup(`<b>${code}</b> – ${a.name || ""}`);

    altMarkers.push(m);
  }
}

// ------------------ WIRING (Input/Change Events) ------------------

export function wireAeroValidationAndMarkers(map) {
  // Eingabe normalisieren live + Marker aktualisieren
  document.addEventListener("input", (e) => {
    const t = e.target;

    // AERO
    if (t.classList && t.classList.contains("aero")) {
      t.value = t.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
      clearFieldError(t);
      updateLegMarkers(map);
      return;
    }

    // ALT
    if (t.classList && t.classList.contains("alt")) {
      t.value = t.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
      clearFieldError(t);
      updateAltMarkers(map);
      return;
    }
  });

  // Validierung beim "fertig" (change / blur / enter)
  document.addEventListener("change", (e) => {
    const t = e.target;

    // AERO
    if (t.classList && t.classList.contains("aero")) {
      const code = (t.value || "").toUpperCase().trim();

      if (!code) {
        clearFieldError(t);
        updateLegMarkers(map);
        return;
      }

      if (!airfieldsDB[code]) {
        showFieldError(t, `Flugplatz ${code} nicht in der Approved Airfields List`);
      } else {
        clearFieldError(t);
      }

      updateLegMarkers(map);
      return;
    }

    // ALT
    if (t.classList && t.classList.contains("alt")) {
      const code = (t.value || "").toUpperCase().trim();

      if (!code) {
        clearFieldError(t);
        updateAltMarkers(map);
        return;
      }

      if (!alternatesDB[code]) {
        showFieldError(t, `Alternate ${code} nicht in der Approved Alternate List`);
      } else {
        clearFieldError(t);
      }

      updateAltMarkers(map);
      return;
    }
  });
}