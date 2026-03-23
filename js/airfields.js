// js/airfields.js
// Lädt approved airfields + approved alternates, macht Autocomplete, Validierung,
// zeichnet AERO Marker + Route-Line, ALT Marker ohne Route-Line.
// Wetter kommt aus metar.js, Marker werden direkt mit passender fltCat-Farbe gesetzt.

import { loadAirportWx, buildWxPopupHtml } from "./metar.js";
import { scheduleNotamRefresh } from "./notams.js";

let airfieldsDB = {};     // approved airfields
let alternatesDB = {};    // approved alternates

let aeroMarkers = [];
let altMarkers = [];
let routeLines = [];

// ------------------ LOADERS ------------------
let airfieldsMilMeta = null;

export function getMilAirfieldsMeta() {
  return airfieldsMilMeta;
}

export function getAirfieldByIcao(icao) {
  const key = String(icao || "").trim().toUpperCase();
  if (!key) return null;
  return airfieldsDB[key] || null;
}

function normalizeMilAirfield(row) {
  const icao = String(row?.ICAO || "").trim().toUpperCase();
  if (!icao) return null;

  const lat = Number(row?.Lat);
  const lon = Number(row?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    icao,
    name: String(row?.Name || "").trim(),
    lat,
    lon,
    rwys: Array.isArray(row?.RWYs)
      ? row.RWYs.map((rwy) => ({
          rwy: String(rwy?.RWY || "").trim().toUpperCase(),
          tora: Number(rwy?.TORA) || 0,
          lda: Number(rwy?.LDA) || 0,
        }))
      : [],
    military: true,
  };
}

function mergeAirfields(civilDb, milRows) {
  const merged = { ...(civilDb || {}) };

  for (const row of milRows || []) {
    const norm = normalizeMilAirfield(row);
    if (!norm) continue;

    merged[norm.icao] = {
      ...(merged[norm.icao] || {}),
      ...norm,
    };
  }

  return merged;
}

export async function loadAirfields() {
  const ts = Date.now();

  const [civilRes, milRes] = await Promise.all([
    fetch("data/airfields.json?ts=" + ts, { cache: "no-store" }),
    fetch("data/airfields_mil.json?ts=" + ts, { cache: "no-store" }),
  ]);

  if (!civilRes.ok) throw new Error("airfields.json konnte nicht geladen werden");
  if (!milRes.ok) throw new Error("airfields_mil.json konnte nicht geladen werden");

  const civilDb = await civilRes.json();
  const milPayload = await milRes.json();

  const milRows = Array.isArray(milPayload?.airfields) ? milPayload.airfields : [];
  airfieldsMilMeta = milPayload?.meta || null;

  airfieldsDB = mergeAirfields(civilDb, milRows);
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

function getWxColor(fltCat) {
  const colors = {
    VFR: "#1faa59",
    MVFR: "#1976d2",
    IFR: "#d32f2f",
    LIFR: "#8e24aa",
  };
  return colors[fltCat] || null;
}

function getColorFromRawMetar(raw) {
  const txt = String(raw || "").toUpperCase();

  if (/\bBLU\+?\b/.test(txt)) return "#1faa59";
  if (/\b(WHT|GRN)\b/.test(txt)) return "#1976d2";
  if (/\b(YLO1|YLO2)\b/.test(txt)) return "#d32f2f";
  if (/\b(AMB|RED)\b/.test(txt)) return "#8e24aa";

  return "#6b7280";
}

function getMarkerColorFromWx(wx) {
  const byFltCat = getWxColor(wx?.metar?.fltCat);
  if (byFltCat) return byFltCat;

  return getColorFromRawMetar(wx?.metar?.rawOb || wx?.metar?.raw_text);
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

function applyFlightCategoryToMarker(marker, wx) {
  if (!marker) return;
  marker.setIcon(makeWxMarker(getMarkerColorFromWx(wx)));
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
// debug:
//      console.log("popup", code, wx);
// debug end
      applyFlightCategoryToMarker(marker, wx);
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
// debug:
//      console.log(code, wx);
// debug end
    markerColor = getMarkerColorFromWx(wx);
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
function isLegActiveForInput(inp) {
  const panel = inp.closest("#legsContainer .c-panel");
  if (!panel) return true;

  const toggle = panel.querySelector(".legToggle");
  if (!toggle) return true; // Leg 1 hat keinen Toggle -> immer aktiv

  const state = String(toggle.dataset.state || "").trim().toLowerCase();
  if (state === "inactive") return false;
  if (state === "active") return true;

  return true;
}

export async function updateLegMarkers(map) {
  aeroMarkers.forEach(m => map.removeLayer(m));
  aeroMarkers = [];

  routeLines.forEach(l => map.removeLayer(l));
  routeLines = [];

  const inputs = Array.from(document.querySelectorAll("input.aero"));
  const coords = [];

  for (const inp of inputs) {
    if (!isLegActiveForInput(inp)) continue;

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
    if (!isLegActiveForInput(inp)) continue;

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
      scheduleNotamRefresh();
      return;
    }

    if (t.classList && t.classList.contains("alt")) {
      t.value = t.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
      clearFieldError(t);
      updateAltMarkers(map);
      scheduleNotamRefresh();
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
        scheduleNotamRefresh();
        return;
      }

      if (!airfieldsDB[code]) {
        showFieldError(t, `Flugplatz ${code} nicht in der Approved Airfields List`);
      } else {
        clearFieldError(t);
      }

      updateLegMarkers(map);
      scheduleNotamRefresh();
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