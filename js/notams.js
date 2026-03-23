// js/notams.js

const NOTAMS_ENDPOINT = "/api/notams"; // später ggf. Worker/Proxy URL
const DEBUG_NOTAMS = true;

let refreshTimer = 0;
let lastKey = "";
let lastData = {};

function dlog(...args) {
  if (!DEBUG_NOTAMS) return;
  console.log("[notams]", ...args);
}

function normIcao(v) {
  return String(v || "").trim().toUpperCase();
}

function isPanelActive(panel) {
  if (!panel) return true;

  const toggle = panel.querySelector(".legToggle");
  if (!toggle) return true; // Leg 1 hat keinen Toggle

  const state = String(toggle.dataset.state || "").trim().toLowerCase();
  if (state === "inactive") return false;
  return true;
}

export function getActiveLegIcaos() {
  const panels = Array.from(document.querySelectorAll("#legsContainer .c-panel"));
  const out = [];

  for (const panel of panels) {
    if (!isPanelActive(panel)) continue;

    const from = normIcao(panel.querySelector(".legField.aeroFrom")?.value);
    const to = normIcao(panel.querySelector(".legField.aeroTo")?.value);

    if (from) out.push(from);
    if (to) out.push(to);
  }

  return [...new Set(out)];
}

async function fetchNotamsForIcaos(icaos) {
  if (!icaos.length) return {};

  const url = `${NOTAMS_ENDPOINT}?icaos=${encodeURIComponent(icaos.join(","))}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`NOTAM fetch failed: ${res.status}`);
  }

  return await res.json();
}

function renderNotams(data) {
  lastData = data || {};
  dlog("render", lastData);

  // erster Schritt bewusst nur Debug
  // später hier:
  // - NOTAM Panel füllen
  // - Badges pro ICAO
  // - Count anzeigen
}

export async function refreshNotamsForActiveIcaos() {
  const icaos = getActiveLegIcaos();
  const key = icaos.join("|");

  if (key === lastKey) {
    dlog("skip same key", key);
    return;
  }

  lastKey = key;
  dlog("refresh", icaos);

  try {
    const data = await fetchNotamsForIcaos(icaos);
    renderNotams(data);
  } catch (err) {
    console.error("NOTAM refresh failed", err);
  }
}

export function scheduleNotamRefresh(delay = 350) {
  clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshNotamsForActiveIcaos();
  }, delay);
}

export function initNotams() {
  // Initial einmal anstoßen
  scheduleNotamRefresh(0);
}

export function getLastNotamData() {
  return lastData;
}