// app.js
// ------------------ SETUP ------------------
import { initMailEO } from "./mail_eo.js";

import { qs, qsa, SEL, setText, EVT, emit, on } from "./ui/index.js";
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
function setBtnState(btn, onState) {
  if (!btn) return;
  btn.textContent = onState ? "ON" : "OFF";
  btn.classList.toggle("is-on", !!onState);
}

function initTopNav({ map, defaultView = "view-map" } = {}) {
  const nav = qs(SEL.topbar.nav);
  if (!nav) return;

  const buttons = Array.from(nav.querySelectorAll(".c-btn--tab"));
  // nur die rechten Views (Map/Checklist/Fuel/Performance/Settings)
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

const windBtn = qs("#toggleWind");
const wxBtn = qs("#toggleWeather"); // aktuell noch ungenutzt, aber ok

// ---------- Layers ----------
const { windLayer } = createWindLayers();

// ---------- Wind buttons ----------
windBtn?.addEventListener("click", async () => {
  windOn = !windOn;

  if (windOn) {
    windLayer.addTo(map);
    await drawWindBarbsViewport({ map, windLayer, selectedWindLevel });
  } else {
    windLayer.clearLayers();
  }

  setBtnState(windBtn, windOn);
});

qs("#windLevelSelect")?.addEventListener("change", async (e) => {
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

    for (const node of nodes) {
      const rel = node.getAttribute("data-include");
      const url = new URL(rel, document.baseURI).toString();

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error("Include failed:", {
          rel,
          url,
          status: res.status,
          statusText: res.statusText,
        });
        throw new Error(`Include failed: ${url} (${res.status})`);
      }

      node.innerHTML = await res.text();
      node.removeAttribute("data-include");
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

  // ---------- apply helpers ----------
  function applyFdlToHeader({ name = "", tel = "" } = {}) {
    setText(SEL.route.fdlOutput, name);
    setText(SEL.route.telOutput, tel);
  }

  function applyChecklistContacts(config) {
    const scope = qs(SEL.checklist.view) || document;

    const mail = (config?.eoEmail || "").trim();
    if (mail) {
      setText(SEL.mail.recipient, mail, scope);
    }

    const phoenix = (config?.phoenixUrl || "").trim();
    if (phoenix) {
      setText(SEL.mail.intranet, phoenix, scope);

      const intranetEl = qs(SEL.mail.intranet, scope);
      if (intranetEl) {
        intranetEl.style.cursor = "pointer";
        intranetEl.onclick = () => window.open(phoenix, "_blank", "noopener");
      }
    }
  }

  function setConfigBadge(onState, text = "") {
    const el = qs(SEL.topbar.configBadge);
    if (!el) return;

    el.classList.toggle("is-on", !!onState);
    el.classList.toggle("is-off", !onState);
    el.textContent = text || (onState ? "Config: OK" : "Config: OFF");
  }

  // ----- CONFIG (Team-Passwort) wiring -----
  function wireConfigSettings() {
    const passEl = qs(SEL.settings.cfgPass);
    const btnLoad = qs(SEL.settings.loadBtn);
    const btnClear = qs(SEL.settings.clearBtn);
    const status = qs(SEL.settings.cfgStatus);

    if (!passEl || !btnLoad || !btnClear) return;

    // Guard gegen doppelte Bindings
    if (btnLoad.dataset.bound === "1") return;
    btnLoad.dataset.bound = "1";
    btnClear.dataset.bound = "1";
    passEl.dataset.bound = "1";

    // initial: gespeichertes Passwort setzen (ohne es anzuzeigen)
    passEl.value = getConfigPassword();

    const setStatus = (t) => {
      if (status) status.textContent = t || "";
    };

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
        else setStatus(msg);

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
    const sel = qs(SEL.settings.fdlSelect);
    const tel = qs(SEL.settings.fdlTelDisplay);
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

    if (saved && [...sel.options].some((o) => o.value === saved)) {
      sel.value = saved;
    } else if (def && [...sel.options].some((o) => o.value === def)) {
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

    const status = qs(SEL.settings.cfgStatus);
    const setStatus = (t) => {
      if (status) status.textContent = t || "";
    };

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

  // ---------- Data loads ----------
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

  // ---------- Init modules ----------
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

  // ---------- SAFETY: erst rendern lassen, dann laden ----------
  requestAnimationFrame(() => {
    const hasLegs = qsa(SEL.legs.frames).length >= 1;
    const hasFuel = !!qs(SEL.fuel.panel);

    if (hasLegs && hasFuel) {
      loadAll();
    } else {
      setTimeout(() => {
        const hasLegs2 = qsa(SEL.legs.frames).length >= 1;
        const hasFuel2 = !!qs(SEL.fuel.panel);
        if (hasLegs2 && hasFuel2) loadAll();
      }, 80);
    }

    // select-retry bleibt sinnvoll:
    const lfz = qs(SEL.route.lfzSelect);
    const tac = qs(SEL.route.tacSelect);
    const needsRetry = (lfz && lfz.options.length < 2) || (tac && tac.options.length < 2);
    if (needsRetry) setTimeout(loadAll, 400);

    initAutosave();
  });
})();