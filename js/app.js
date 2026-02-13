// ------------------ SETUP ------------------
import { initDateInput } from "./date.js";
import { initLFZ } from "./lfz.js";
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

import { createWindLayers, drawWindBarbsViewport } from "./wind.js";
import { showVerticalProfilePopup } from "./vertprof.js";

// ---------- Map ----------
const map = createMap();

// ---------- Wind state ----------
let windOn = false;
let selectedWindLevel = "SFC";

// ---------- Layers ----------
const { windLayer } = createWindLayers();

// ---------- Buttons ----------
document.getElementById("toggleWind")?.addEventListener("click", async () => {
  if (!windOn) {
    windOn = true;
    windLayer.addTo(map);
    await drawWindBarbsViewport({ map, windLayer, selectedWindLevel });
  } else {
    windLayer.clearLayers();
    windOn = false;
  }
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

    wireAeroValidationAndMarkers(map);

  } catch (e) {
    console.error(e);
  }

  updateLegMarkers(map);
  updateAltMarkers(map);
  
  initDateInput();
  initLFZ();

})();