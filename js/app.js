// ------------------ SETUP ------------------
import { initDateInput } from "./date.js";
import { initLFZ } from "./lfz.js";
import { initLegActivation } from "./legs.js";
import { createMap } from "./map.js";
import { installMapAutoResize } from "./resize.js";
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
  const views = Array.from(document.querySelectorAll(".view"));

  function show(viewId) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
    views.forEach((v) => v.classList.toggle("is-active", v.id === viewId));

    // Leaflet: wenn Map wieder sichtbar wird -> Größe neu berechnen
    if (viewId === "view-map" && map) {
      setTimeout(() => map.invalidateSize(), 50);
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

    // NEW:
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

// ---------- INIT ----------
(async function init() {

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
  
  initTopNav({
  defaultView: "view-route",
  onViewChange: (viewId) => {
    // wichtig: Leaflet braucht manchmal invalidateSize, wenn Map wieder sichtbar wird
    if (viewId === "view-route") {
      setTimeout(() => map.invalidateSize(), 50);
    }
  },
});
  initDateInput();
  initLFZ();
  initLegActivation({
    onChange: () => {
      updateLegMarkers(map);
      updateAltMarkers(map);
    },
});

})();
