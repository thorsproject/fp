// ------------------ AIRFIELDS DB + AUTOCOMPLETE + VALIDATION ------------------
// js/airfields.js
import { fetchMetarTaf } from "./metar.js";

let icaoDB = {};
let markers = [];
let legLines = [];

export function getIcaoDB() {
  return icaoDB;
}

export async function loadAirfields() {
  const res = await fetch("data/airfields.json?ts=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("airfields.json konnte nicht geladen werden");
  icaoDB = await res.json();
}

export function buildAirfieldsDatalist() {
  const dl = document.getElementById("airfieldsList");
  if (!dl) return;
  dl.innerHTML = "";

  const keys = Object.keys(icaoDB).sort();
  for (const icao of keys) {
    const a = icaoDB[icao];
    const opt = document.createElement("option");
    opt.value = icao;
    opt.label = a?.name ? a.name : "";
    dl.appendChild(opt);
  }
}

export function attachDatalistToAeroInputs() {
  document.querySelectorAll("input.aero").forEach((inp) => {
    inp.setAttribute("list", "airfieldsList");
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("spellcheck", "false");
  });
}

export function wireAeroValidationAndMarkers(map) {
  // Input restrictions + immediate marker refresh
  document.addEventListener("input", (e) => {
    if (e.target.classList.contains("time")) {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
      return;
    }

    if (e.target.classList.contains("aero")) {
      e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
      clearAeroError(e.target);
      updateLegMarkers(map);
      return;
    }
  });

  // Validation on change (blur/enter)
  document.addEventListener("change", (e) => {
    if (!e.target.classList.contains("aero")) return;

    const input = e.target;
    const code = input.value.toUpperCase().trim();

    if (!code) {
      clearAeroError(input);
      updateLegMarkers(map);
      return;
    }

    if (!icaoDB[code]) {
      showAeroError(input, `Flugplatz ${code} nicht in der Approved Airport List`);
    } else {
      clearAeroError(input);
    }

    updateLegMarkers(map);
  });
}

export function updateLegMarkers(map) {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  legLines.forEach((l) => map.removeLayer(l));
  legLines = [];

  const legInputs = document.querySelectorAll(".aero");
  let coords = [];

  legInputs.forEach((inp) => {
    const val = inp.value.toUpperCase();
    if (!icaoDB[val]) return;

    coords.push([icaoDB[val].lat, icaoDB[val].lon]);

    const icao = val;
    const name = icaoDB[val].name;

    const m = L.marker([icaoDB[val].lat, icaoDB[val].lon]).addTo(map);
    m.bindPopup(`<b>${icao}</b> – ${name}<br>METAR/TAF lädt...`);

    m.on("popupopen", async () => {
      try {
        const data = await fetchMetarTaf(icao);
        m.setPopupContent(
          `<b>${icao}</b> – ${name}<br><pre style="white-space:pre-wrap;margin:6px 0 0;">${data}</pre>`
        );
      } catch {
        m.setPopupContent(
          `<b>${icao}</b> – ${name}<br><span style="color:#ff8080;">METAR/TAF konnte nicht geladen werden.</span>`
        );
      }
    });

    markers.push(m);
  });

  if (coords.length > 1) {
    const poly = L.polyline(coords, { color: "cyan" }).addTo(map);
    legLines.push(poly);
    map.fitBounds(poly.getBounds(), { padding: [50, 50] });
  }
}

// --- UI error helpers (bleiben hier, weil sie aero betreffen) ---
function showAeroError(input, msg) {
  input.classList.add("invalid");
  let err = input.nextElementSibling;
  if (!err || !err.classList.contains("aero-error")) {
    err = document.createElement("div");
    err.className = "aero-error";
    input.parentNode.appendChild(err);
  }
  err.textContent = msg;
}

function clearAeroError(input) {
  input.classList.remove("invalid");
  const err = input.parentNode.querySelector(".aero-error");
  if (err) err.remove();
}