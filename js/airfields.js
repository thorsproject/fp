// js/airfields.js
// Lädt approved airfields + approved alternates, macht Autocomplete, Validierung,
// zeichnet AERO Marker + Route-Line, ALT Marker ohne Route-Line.
// Wetter kommt aus metar.js, Marker werden direkt mit passender fltCat-Farbe gesetzt.

import { loadAirportWx, buildWxPopupHtml } from "./metar.js";

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

// ------------------ WX MARKERS ------------------

function makeWxMarker(color = "#6b7280") {
  return L.divIcon({
    className: "wx-marker",
    html: `<div class="wx-dot" style="background:${color}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function getWxColor(fltCat) {
  const colors = {
    VFR: "#1faa59",
    MVFR: "#1976d2",
    IFR: "#d32f2f",
    LIFR: "#8e24aa",
  };
  return colors[fltCat] || "#6b7280";
}

function applyFlightCategoryToMarker(marker, fltCat) {
  if (!marker) return;
  marker.setIcon(makeWxMarker(getWxColor(fltCat)));
}

function getPopupWidth() {
  return Math.min(Math.round(window.innerWidth * 0.85), 560);
}

// ------------------ ERROR UI ------------------

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

// ------------------ POPUP HELPERS ------------------

function bindWxPopup(marker, code, name) {
  const popupWidth = getPopupWidth();

  marker.bindPopup(
    `<b>${code}</b> – ${name || ""}<br>METAR/TAF lädt...`,
    { maxWidth: popupWidth, minWidth: popupWidth }
  );

  marker.on("popupopen", async () => {
    try {
      const wx = await loadAirportWx(code);
      applyFlightCategoryToMarker(marker, wx?.metar?.fltCat);
      marker.setPopupContent(buildWxPopupHtml(wx));
    } catch {
      marker.setPopupContent(
        `<div class="wx-popup">
          <div class="wx-popup__title">${code}</div>
          <div class="wx-popup__error">METAR/TAF konnte nicht geladen werden.</div>
        </div>`
      );
    }
  });
}

async function createAirportMarker(map, code, airport) {
  let markerColor = "#6b7280";

  try {
    const wx = await loadAirportWx(code);
    markerColor = getWxColor(wx?.metar?.fltCat);
  } catch {
    // neutraler Marker bleibt
  }

  const marker = L.marker([airport.lat, airport.lon], {
    icon: makeWxMarker(markerColor),
  }).addTo(map);

  bindWxPopup(marker, code, airport.name || "");
  return marker;
}

// ------------------ DRAWING ------------------

export async function updateLegMarkers(map) {
  aeroMarkers.forEach(m => map.removeLayer(m));
  aeroMarkers = [];

  routeLines.forEach(l => map.removeLayer(l));
  routeLines = [];

  const inputs = Array.from(document.querySelectorAll("input.aero"));
  const coords = [];

  for (const inp of inputs) {
    const code = (inp.value || "").toUpperCase().trim();
    if (!airfieldsDB[code]) continue;

    const a = airfieldsDB[code];
    coords.push([a.lat, a.lon]);

    const marker = await createAirportMarker(map, code, a);
    aeroMarkers.push(marker);
  }

  if (coords.length > 1) {
    const poly = L.polyline(coords, { color: "cyan" }).addTo(map);
    routeLines.push(poly);
    map.fitBounds(poly.getBounds(), { padding: [50, 50] });
  }
}

export async function updateAltMarkers(map) {
  altMarkers.forEach(m => map.removeLayer(m));
  altMarkers = [];

  const inputs = Array.from(document.querySelectorAll("input.alt"));

  for (const inp of inputs) {
    const code = (inp.value || "").toUpperCase().trim();
    if (!alternatesDB[code]) continue;

    const a = alternatesDB[code];
    const marker = await createAirportMarker(map, code, a);
    altMarkers.push(marker);
  }
}

// ------------------ WIRING (Input/Change Events) ------------------

export function wireAeroValidationAndMarkers(map) {
  document.addEventListener("input", (e) => {
    const t = e.target;

    if (t.classList && t.classList.contains("aero")) {
      t.value = t.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
      clearFieldError(t);
      updateLegMarkers(map);
      return;
    }

    if (t.classList && t.classList.contains("alt")) {
      t.value = t.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
      clearFieldError(t);
      updateAltMarkers(map);
      return;
    }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;

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