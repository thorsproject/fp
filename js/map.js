// ------------------ LEAFLET MAP ------------------
import { loadAirportWx, buildWxPopupHtml } from "./metar.js";

const AIRFIELDS_URL = "./data/airfields.json";
const ALTERNATES_URL = "./data/alternates.json";

let mapInstance = null;

let baseLayer = null;
let cloudTiles = null;
let radarTiles = null;

let routeLine = null;
let airportLayer = null;

let lookupReady = null;
let airportLookup = new Map();

function bindAirportWx(marker, icao) {
  if (!icao) return;

  marker.on("click", async () => {
    marker.bindPopup("<div class='wx-popup__loading'>Lade METAR / TAF …</div>").openPopup();

    try {
      const wx = await loadAirportWx(icao);
      marker.setPopupContent(buildWxPopupHtml(wx));
    } catch (err) {
      marker.setPopupContent(`
        <div class="wx-popup">
          <div class="wx-popup__title">${escapeHtml(icao)}</div>
          <div class="wx-popup__error">Wetterdaten konnten nicht geladen werden.</div>
        </div>
      `);
    }
  });
}

function setBtnState(btn, onState) {
  if (!btn) return;
  btn.textContent = onState ? "ON" : "OFF";
  btn.classList.toggle("is-on", !!onState);
}

function initTileToggle({ map, buttonId, layer, defaultOn = false }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  if (defaultOn) {
    layer.addTo(map);
  }

  setBtnState(btn, defaultOn);

  btn.addEventListener("click", () => {
    const nextOn = !map.hasLayer(layer);

    if (nextOn) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }

    setBtnState(btn, nextOn);
  });
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pick(obj, keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return v;
    }
  }
  return "";
}

function normalizeIcao(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function extractLat(obj) {
  return (
    toNumber(pick(obj, ["lat", "latitude", "y", "Lat", "Latitude"])) ??
    null
  );
}

function extractLon(obj) {
  return (
    toNumber(pick(obj, ["lon", "lng", "longitude", "x", "Lon", "Longitude"])) ??
    null
  );
}

function extractIcao(obj) {
  return normalizeIcao(
    pick(obj, ["icao", "ICAO", "ident", "Ident", "code", "Code"])
  );
}

function extractName(obj) {
  return String(
    pick(obj, ["name", "Name", "airport", "Airport", "label", "Label"]) || ""
  ).trim();
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.airfields)) return data.airfields;
  if (Array.isArray(data?.alternates)) return data.alternates;
  return [];
}

async function buildAirportLookup() {
  if (lookupReady) return lookupReady;

  lookupReady = (async () => {
    const [airfieldsRaw, alternatesRaw] = await Promise.all([
      fetchJson(AIRFIELDS_URL).catch(() => []),
      fetchJson(ALTERNATES_URL).catch(() => []),
    ]);

    const combined = [...asArray(airfieldsRaw), ...asArray(alternatesRaw)];
    const map = new Map();

    for (const row of combined) {
      const icao = extractIcao(row);
      const lat = extractLat(row);
      const lon = extractLon(row);

      if (!icao || lat == null || lon == null) continue;

      if (!map.has(icao)) {
        map.set(icao, {
          icao,
          name: extractName(row),
          lat,
          lon,
          raw: row,
        });
      }
    }

    airportLookup = map;
    return map;
  })();

  return lookupReady;
}

function findAirport(icao) {
  const key = normalizeIcao(icao);
  if (!key) return null;
  return airportLookup.get(key) || null;
}

function markerHtml(title, subtitle = "") {
  return `
    <div class="map-popup">
      <div class="map-popup__title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="map-popup__meta">${escapeHtml(subtitle)}</div>` : ""}
      <div class="map-popup__hint">Klick erneut für METAR / TAF</div>
    </div>
  `;
}

function createAirportMarker(apt, role) {
  const marker = L.marker([apt.lat, apt.lon], {
    title: `${role}: ${apt.icao}`,
  });

  const subtitle = apt.name ? `${role} · ${apt.name}` : role;
  marker.bindPopup(markerHtml(apt.icao, subtitle));

  bindAirportWx(marker, apt.icao);
  return marker;
}

function readLegRows() {
  const frames = Array.from(document.querySelectorAll("#legsContainer .c-panel"));
  const rows = [];

  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    const legNum = i + 1;

    const fromEl = frame.querySelector(".legField.aeroFrom");
    const toEl = frame.querySelector(".legField.aeroTo");
    const altEl = frame.querySelector(".legField.alt");
    const toggleEl = frame.querySelector(".legToggle");

    rows.push({
      leg: legNum,
      active: legNum === 1 ? true : isLegActive(toggleEl),
      from: normalizeIcao(readFieldValue(fromEl)),
      to: normalizeIcao(readFieldValue(toEl)),
      alt: normalizeIcao(readFieldValue(altEl)),
    });
  }

  return rows;
}

function readFieldValue(el) {
  if (!el) return "";
  if ("value" in el) return el.value;
  return el.textContent || "";
}

function isLegActive(toggleEl) {
  if (!toggleEl) return true;

  const ds = String(toggleEl.dataset?.state || "").trim().toLowerCase();
  if (["off", "inactive", "false", "0"].includes(ds)) return false;
  if (["on", "active", "true", "1"].includes(ds)) return true;

  if (
    toggleEl.classList.contains("is-off") ||
    toggleEl.classList.contains("inactive") ||
    toggleEl.classList.contains("is-inactive")
  ) {
    return false;
  }

  if (
    toggleEl.classList.contains("is-on") ||
    toggleEl.classList.contains("is-active") ||
    toggleEl.classList.contains("active")
  ) {
    return true;
  }

  const aria = toggleEl.getAttribute("aria-pressed");
  if (aria === "false") return false;
  if (aria === "true") return true;

  const txt = String(toggleEl.textContent || "").trim().toLowerCase();
  if (txt === "inactive") return false;
  if (txt === "active") return true;

  return true;
}

function buildMapState() {
  const legs = readLegRows().filter((row) => row.active);

  const routePoints = [];
  const routeAirports = [];
  const altAirports = [];
  const seenRoute = new Set();
  const seenAlt = new Set();

  for (const row of legs) {
    const fromApt = findAirport(row.from);
    const toApt = findAirport(row.to);
    const altApt = findAirport(row.alt);

    if (fromApt && !seenRoute.has(fromApt.icao)) {
      seenRoute.add(fromApt.icao);
      routeAirports.push({
        ...fromApt,
        role: routeAirports.length === 0 ? "Departure" : `Route ${row.leg} FROM`,
      });
    }

    if (fromApt) {
      const prev = routePoints[routePoints.length - 1];
      if (!prev || prev.icao !== fromApt.icao) {
        routePoints.push(fromApt);
      }
    }

    if (toApt) {
      const prev = routePoints[routePoints.length - 1];
      if (!prev || prev.icao !== toApt.icao) {
        routePoints.push(toApt);
      }
    }

    if (toApt && !seenRoute.has(toApt.icao)) {
      seenRoute.add(toApt.icao);
      routeAirports.push({
        ...toApt,
        role: `Route ${row.leg} TO`,
      });
    }

    if (altApt && !seenAlt.has(altApt.icao)) {
      seenAlt.add(altApt.icao);
      altAirports.push({
        ...altApt,
        role: `Alternate ${row.leg}`,
      });
    }
  }

  if (routeAirports.length > 0) {
    routeAirports[0].role = "Departure";
    routeAirports[routeAirports.length - 1].role = "Destination";
  }

  return {
    routePoints,
    routeAirports,
    altAirports,
  };
}

function clearMapObjects() {
  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }

  if (airportLayer) {
    airportLayer.clearLayers();
  }
}

function renderRoute() {
  if (!mapInstance) return;

  clearMapObjects();

  const state = buildMapState();

  if (!airportLayer) {
    airportLayer = L.layerGroup().addTo(mapInstance);
  }

  for (const apt of state.routeAirports) {
    createAirportMarker(apt, apt.role).addTo(airportLayer);
  }

  for (const apt of state.altAirports) {
    createAirportMarker(apt, apt.role).addTo(airportLayer);
  }

  const latLngs = state.routePoints.map((apt) => [apt.lat, apt.lon]);

  if (latLngs.length >= 2) {
    routeLine = L.polyline(latLngs, {
      weight: 3,
      opacity: 0.9,
    }).addTo(mapInstance);
  }

  const boundsParts = [
    ...state.routePoints.map((apt) => [apt.lat, apt.lon]),
    ...state.altAirports.map((apt) => [apt.lat, apt.lon]),
  ];

  if (boundsParts.length === 1) {
    mapInstance.setView(boundsParts[0], 8);
    return;
  }

  if (boundsParts.length >= 2) {
    mapInstance.fitBounds(boundsParts, {
      padding: [30, 30],
      maxZoom: 9,
    });
  }
}

let renderTimer = null;

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderRoute();
  }, 120);
}

function bindMapRefreshEvents() {
  if (document.body.dataset.mapRefreshBound === "1") return;
  document.body.dataset.mapRefreshBound = "1";

  const events = ["input", "change", "click"];

  for (const evtName of events) {
    document.addEventListener(
      evtName,
      (ev) => {
        const t = ev.target;
        if (!(t instanceof Element)) return;

        if (
          t.matches(".legField.aeroFrom") ||
          t.matches(".legField.aeroTo") ||
          t.matches(".legField.alt") ||
          t.matches(".legToggle")
        ) {
          scheduleRender();
        }
      },
      true
    );
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function refreshMapRoute() {
  await buildAirportLookup();
  renderRoute();
}

export async function createMap() {
  if (mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 0);
    return mapInstance;
  }

  await buildAirportLookup();

  mapInstance = L.map("map").setView([51, 10], 6);

  // ---------- Panes ----------
  mapInstance.createPane("cloudPane");
  mapInstance.getPane("cloudPane").style.zIndex = 320;

  mapInstance.createPane("radarPane");
  mapInstance.getPane("radarPane").style.zIndex = 330;

  mapInstance.createPane("windPane");
  mapInstance.getPane("windPane").style.zIndex = 340;

  // ---------- Base ----------
  baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OSM",
  }).addTo(mapInstance);

  // ---------- Clouds ----------
  cloudTiles = L.tileLayer(
    "https://fp-weather-proxy.thors-project.workers.dev/clouds/{z}/{x}/{y}.png",
    {
      pane: "cloudPane",
      opacity: 0.75,
      attribution: "Weather © OpenWeatherMap",
    }
  );

  // ---------- Radar ----------
  radarTiles = L.tileLayer(
    "https://tilecache.rainviewer.com/v2/radar/latest/256/{z}/{x}/{y}/2/1_1.png",
    {
      pane: "radarPane",
      opacity: 0.42,
      attribution: "Radar © RainViewer",
    }
  );

  airportLayer = L.layerGroup().addTo(mapInstance);

  initTileToggle({
    map: mapInstance,
    buttonId: "toggleWeather",
    layer: cloudTiles,
    defaultOn: false,
  });

  initTileToggle({
    map: mapInstance,
    buttonId: "toggleRadar",
    layer: radarTiles,
    defaultOn: false,
  });

  bindMapRefreshEvents();
  renderRoute();

  setTimeout(() => mapInstance.invalidateSize(), 0);
  return mapInstance;
}