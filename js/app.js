// app.js
// ------------------ SETUP ------------------
// eMail an EO
import { initMailEO } from "./mail_eo.js";

import { qs, SEL, setText, EVT, emit, on } from "./ui/index.js";
import { loadConfig, setConfigPassword, getConfigPassword, clearConfigCache } from "./config_store.js";
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

  const buttons = Array.from(nav.querySelectorAll(".c-btn--tab"));

  // ✅ nur die rechten Views (Map/Checklist/Fuel/Performance/Settings)
  const views = Array.from(document.querySelectorAll(".l-main .view"));

  function show(viewId) {
    buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.view === viewId));
    views.forEach((v) => v.classList.toggle("is-active", v.id === viewId));

    // Leaflet: wenn Map wieder sichtbar wird -> Größe neu berechnen
    if (viewId === "view-map" && map) {
      setTimeout(() => map.invalidateSize(), 80);
    }
  }

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".c-btn--tab");
    if (!btn) return;
    if (!btn.dataset.view) return; 
    show(btn.dataset.view);
  });

  show(defaultView);
}

// ---------- FDL ----------
const LS_FDL_SELECTED = "fp.fdl.selected";

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
  emit(EVT.includesLoaded);
  function applyFdlToHeader({ name = "", tel = "" } = {}) {
    setText("#FDLoutput", name);
    setText("#TELoutput", tel);
  }

  function applyChecklistContacts(config) {
    const scope = qs("#view-checklist") || document;

    const mail = (config?.eoEmail || "").trim();
    if (mail) {
      setText(SEL.mail.recipient, mail, scope);
    }

    const phoenix = (config?.phoenixUrl || "").trim();
    const intranetEl = qs(SEL.mail.intranet, scope);

    if (intranetEl && phoenix) {
      setText(intranetEl, phoenix);
      intranetEl.style.cursor = "pointer";
      intranetEl.onclick = () => window.open(phoenix, "_blank", "noopener");
    }
  }

  function setConfigBadge(on, text = "") {
    const el = document.getElementById("configBadge");
    if (!el) return;

    el.classList.toggle("is-on", !!on);
    el.classList.toggle("is-off", !on);
    el.textContent = text || (on ? "Config: OK" : "Config: OFF");
  }

  // ----- CONFIG (Team-Passwort) wiring -----
  function wireConfigSettings() {
    const passEl = document.getElementById("cfgPass");
    const btnLoad = document.getElementById("btnCfgLoad");
    const btnClear = document.getElementById("btnCfgClearPass");
    const status = document.getElementById("cfgStatus");

    if (!passEl || !btnLoad || !btnClear) return;

    // ✅ Guard gegen doppelte Bindings
    if (btnLoad.dataset.bound === "1") return;
    btnLoad.dataset.bound = "1";
    btnClear.dataset.bound = "1";
    passEl.dataset.bound = "1";

    // initial: gespeichertes Passwort setzen (ohne es anzuzeigen)
    passEl.value = getConfigPassword();

    const setStatus = (t) => { if (status) status.textContent = t || ""; };

    btnLoad.addEventListener("click", async () => {
      setStatus("Lade…");
      setConfigPassword(passEl.value.trim());
      clearConfigCache();
      try {
        const cfg = await loadConfig({ force: true });
        applyConfigToSettings(cfg);
        applyChecklistContacts(cfg);
        setConfigBadge(true, "Config: OK");
        setStatus("OK ✓");
      } catch (e) {
        const msg = String(e?.message || e);

        if (msg === "CONFIG_PASS_MISSING") setStatus("Passwort fehlt");
        else if (msg === "CONFIG_PASS_WRONG") setStatus("Passwort falsch");
        else setStatus(msg); // <-- zeigt z.B. 404 oder Formatfehler

        console.error(e);
      }
    });

    btnClear.addEventListener("click", () => {
      passEl.value = "";
      setConfigPassword("");
      clearConfigCache();
      setStatus("gelöscht");
    });
  }

  function applyConfigToSettings(config) {
    // FDL Dropdown
    const sel = document.getElementById("fdlSelect");
    const tel = document.getElementById("fdlTel");
    if (!sel || !tel) return;

    const list = Array.isArray(config?.fdlList) ? config.fdlList : [];
    sel.innerHTML = "";

    for (const item of list) {
      const opt = document.createElement("option");
      opt.value = item.name || "";
      opt.textContent = item.name || "(ohne Name)";
      opt.dataset.tel = item.tel || "";
      sel.appendChild(opt);
    }
    
    // Default auswählen (falls vorhanden)
    const saved = localStorage.getItem(LS_FDL_SELECTED) || "";
    const def = config?.defaults?.fdlName || "";

    if (saved && [...sel.options].some(o => o.value === saved)) {
      sel.value = saved;
    } else if (def && [...sel.options].some(o => o.value === def)) {
      sel.value = def;
    }

    // Tel anzeigen
    const showTel = () => {
      const opt = sel.selectedOptions?.[0];
      tel.textContent = opt?.dataset?.tel || "";

      localStorage.setItem(LS_FDL_SELECTED, sel.value);

      applyFdlToHeader({ name: sel.value, tel: opt?.dataset?.tel || "" });
    };

    sel.addEventListener("change", showTel);
    showTel();
  }

  async function tryAutoLoadConfig() {
    const pass = getConfigPassword();
    if (!pass) return;

    const status = document.getElementById("cfgStatus");
    const setStatus = (t) => { if (status) status.textContent = t || ""; };

    try {
      const cfg = await loadConfig({ force: true });
      applyConfigToSettings(cfg);
      applyChecklistContacts(cfg);
      setConfigBadge(true, "Config: OK");
      setStatus("OK ✓ (auto)");
    } catch (e) {
      const msg = String(e?.message || e);
      setStatus(`Auto-Load: ${msg}`);
      console.error("Auto config load failed:", e);
    }
  }

  // nach Includes: Settings sind im DOM
  wireConfigSettings();
  tryAutoLoadConfig();
  on(EVT.includesLoaded, wireConfigSettings);
  on(EVT.includesLoaded, tryAutoLoadConfig);

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
  initMailEO();
  initOrmChecklist();
  initFuelPlanning();
  initResets();

  // SAFETY: erst rendern lassen, dann laden
  requestAnimationFrame(() => {
    const hasLegs = document.querySelectorAll("#legsContainer .c-panel").length >= 1;
    const hasFuel = !!document.getElementById("fuelPanel");

    if (hasLegs && hasFuel) {
      loadAll();
    } else {
      // safety retry (z.B. wenn Includes minimal später im DOM landen)
      setTimeout(() => {
        const hasLegs2 = document.querySelectorAll("#legsContainer .c-panel").length >= 1;
        const hasFuel2 = !!document.getElementById("fuelPanel");
        if (hasLegs2 && hasFuel2) loadAll();
      }, 80);
    }

    // dein select-retry bleibt sinnvoll:
    const lfz = document.querySelector("#lfzSelect");
    const tac = document.querySelector("#tacSelect");
    const needsRetry =
      (lfz && lfz.options.length < 2) ||
      (tac && tac.options.length < 2);

    if (needsRetry) setTimeout(loadAll, 400);

    initAutosave();
  });
})();
