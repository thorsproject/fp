// ------------------ SETUP ------------------
import { initDateInput } from "./date.js";
import { initLFZ } from "./lfz.js";
import { initLegActivation } from "./legs.js";
import { createMap } from "./map.js";
import {
  loadAirfields,
  loadAlternates,
  buildAirfieldsDatalist,
  buildAlternatesDatalist,
  attachDatalistToAeroInputs,
  attachDatalistToAltInputs,
  wireAeroValidationAndMarkers,
  updateLegMarkers,
  updateAltMarkers,
} from "./airfields.js";

import { createWindLayers, drawWindBarbsViewport } from "./wind.js?v=99";
import { showVerticalProfilePopup } from "./vertprof.js";
import { initChecklistUI } from "./checklist.js";
import { initFuelPlanning } from "./fuel.js";
import { initAutosave, loadAll } from "./storage.js";
import { initResets } from "./reset.js";
import { initOrmChecklist } from "./orm.js";

// ---------- Control Button State ----------
function setBtnState(btn, on){
  if (!btn) return;
  btn.textContent = on ? "ON" : "OFF";
  btn.classList.toggle("is-on", on);
}

function initTopNav({ map, defaultView = "view-map" } = {}) {
  const nav = document.getElementById("topNav");
  if (!nav) return;

  const buttons = Array.from(nav.querySelectorAll(".topbtn"));

  // ✅ nur die rechten Views (Map/Checklist/Fuel/Performance/Settings)
  const views = Array.from(document.querySelectorAll(".content-panel .view"));

  function show(viewId) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
    views.forEach((v) => v.classList.toggle("is-active", v.id === viewId));

    // Leaflet: wenn Map wieder sichtbar wird -> Größe neu berechnen
    if (viewId === "view-map" && map) {
      setTimeout(() => map.invalidateSize(), 80);
    }
  }

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".topbtn");
    if (!btn) return;
    show(btn.dataset.view);
  });

  show(defaultView);
}

// ---------- Map ----------
const map = createMap();
initTopNav({ map, defaultView: "view-map" });

// ---------- Wind state ----------
let windOn = false;
let selectedWindLevel = "SFC";

const windBtn = document.getElementById("toggleWind");
const wxBtn   = document.getElementById("toggleWeather");


// ---------- Layers ----------
const { windLayer } = createWindLayers();

// ---------- Buttons ----------
windBtn?.addEventListener("click", async () => {
  windOn = !windOn;

  if (windOn) {
    windLayer.addTo(map);
    await drawWindBarbsViewport({ map, windLayer, selectedWindLevel });
  } else {
    windLayer.clearLayers();
  }

  // NEW:
  setBtnState(windBtn, windOn);

});

document.getElementById("windLevelSelect")?.addEventListener("change", async (e) => {
  selectedWindLevel = e.target.value;
  if (windOn) {
    await drawWindBarbsViewport({ map, windLayer, selectedWindLevel });
  }
});

// redraw on map move/zoom
map.on("zoomend moveend", async () => {
  if (windOn) await drawWindBarbsViewport({ map, windLayer, selectedWindLevel });
});

// vertical profile on click
map.on("click", (e) => {
  showVerticalProfilePopup(map, e.latlng);
});

// Platzhalter für eMail an EO
document.getElementById("btnMailEO")?.addEventListener("click", () => {
  // hier später: export + mail workflow
  // aktuell z.B. exportDataJSON({ auto:true }) oder was du willst
});

// ---------- INIT ----------
(async function init() {
  async function loadIncludes(root = document) {
    const nodes = Array.from(root.querySelectorAll("[data-include]"));

    for (const el of nodes) {
      const rel = el.getAttribute("data-include");

      // ✅ macht den Pfad immer absolut korrekt (wichtig bei /fp/ + GitHub Pages)
      const url = new URL(rel, document.baseURI).toString();

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error("Include failed:", { rel, url, status: res.status, statusText: res.statusText });
        throw new Error(`Include failed: ${url} (${res.status})`);
      }

      el.innerHTML = await res.text();
      el.removeAttribute("data-include");
    }
  }
  try {
    await loadIncludes();
  } catch (e) {
    console.error(e);
    alert("Include-Laden fehlgeschlagen:\n" + (e?.message || e));
    return;
  }
  try {
    await loadAirfields();
    buildAirfieldsDatalist();
    attachDatalistToAeroInputs();
    wireAeroValidationAndMarkers(map);

    await loadAlternates();
    buildAlternatesDatalist();
    attachDatalistToAltInputs();
  } catch (e) {
    console.error(e);
  }

  updateLegMarkers(map);
  updateAltMarkers(map);
  
  initDateInput();
  initLFZ();
  initLegActivation({
    onChange: () => {
      updateLegMarkers(map);
      updateAltMarkers(map);
    },
  });
  initChecklistUI();
  initOrmChecklist();
  initFuelPlanning();
  initResets();

  // SAFETY: erst rendern lassen, dann laden
  requestAnimationFrame(() => {
    loadAll();

    const lfz = document.querySelector("#lfzSelect");
    const tac = document.querySelector("#tacSelect");
    const needsRetry =
      (lfz && lfz.options.length < 2) ||
      (tac && tac.options.length < 2);

    if (needsRetry) setTimeout(loadAll, 400);

    initAutosave();
  });
})();
