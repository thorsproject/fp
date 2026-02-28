// js/reset.js
import {
  qs,
  qsa,
  clearValues,
  setValue,
  withMuteLegAutofill,
  SEL,
} from "./ui/index.js";

import { exportDataJSON, importDataJSONFromFile } from "./storage.js";

const DEBUG_RESET = false;
function dlog(...args) {
  if (!DEBUG_RESET) return;
  console.log("[reset]", ...args);
}

const ACTIONS = {
  // Route
  "reset-kopf": resetKopf,
  "reset-times": resetTimes,
  "reset-aeros": resetAerodromes,

  // Checklist
  "reset-checklist": resetChecklist,
  "reset-checkmarks": resetChecklistCheckmarks,
  "reset-wx": resetChecklistWx,

  // Fuel
  "reset-fuel": resetFuelInputs,
  "reset-legfuel": resetLegFuelInputs,
  "reset-compfuel": resetCompFuelInputs,
  "reset-altfuel": resetAltFuelInputs,

  // Topbar
  "export-data": handleExport,
  "import-data": handleImport,

  // optional legacy
  "mail-eo": () => exportDataJSON({ auto: true }),
};

export function initResets() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const fn = ACTIONS[action];
    if (!fn) {
      console.warn("[reset] unknown action:", action);
      return;
    }

    dlog("action:", action);
    fn(btn);
  });
}

// ---------- Topbar ----------
function handleExport() {
  exportDataJSON();
}

async function handleImport() {
  const inp = qs(SEL.io.importFileInput);
  if (!inp) {
    alert("Import nicht möglich: Import-Input fehlt im HTML.");
    return;
  }

  // einmalig “arming”: onchange nicht stapeln
  inp.value = "";

  const onPick = async () => {
    const file = inp.files?.[0];
    if (!file) return;

    const ok = confirm("Import überschreibt die aktuell gespeicherten Daten. Fortfahren?");
    if (!ok) return;

    try {
      await importDataJSONFromFile(file, { apply: true });
      alert("Import erfolgreich.");
    } catch (e) {
      console.error(e);
      alert("Import fehlgeschlagen.");
    }
  };

  // nur einmal feuern pro Klick auf Import
  inp.addEventListener("change", onPick, { once: true });
  inp.click();
}

// ---------- helpers ----------
function removeValidation() {
  // invalid-marker entfernen
  qsa(".invalid").forEach((el) => el.classList.remove("invalid"));

  // error labels leeren (zentralisierte selector)
  qsa(`${SEL.reset.aeroError}, ${SEL.reset.altError}`).forEach((el) => {
    el.textContent = "";
  });
}

function flashResetSuccess(btn) {
  if (!btn) return;
  btn.classList.add("reset-success");
  setTimeout(() => btn.classList.remove("reset-success"), 220);
}

function getFuelPanel() {
  return qs(SEL.fuel.panel);
}

function legsFrames() {
  return qsa(SEL.legs.frames);
}

// ---------- ROUTE ----------
function resetKopf(btn) {
  const scope = qs(SEL.reset.kopfContainer) || document;

  // nur DATE löschen (FDL/TEL bleiben absichtlich aus Settings)
  setValue(qs(SEL.route.dateInput, scope), "", { emit: true });

  // Selects zurücksetzen
  const lfz = qs(SEL.route.lfzSelect, scope);
  const tac = qs(SEL.route.tacSelect, scope);

  resetSelect(lfz);
  resetSelect(tac);

  // Callsign Anzeige leeren (ist Text, kein Input)
  const cs = qs(SEL.route.callsignDisplay, scope);
  if (cs) cs.textContent = "";

  flashResetSuccess(btn);
}

function resetSelect(sel) {
  if (!sel) return;
  sel.selectedIndex = 0;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
}

function resetTimes(btn) {
  withMuteLegAutofill(() => {
    const frames = legsFrames();
    const etd = frames.flatMap((f) => qsa(SEL.legs.etd, f));
    const eta = frames.flatMap((f) => qsa(SEL.legs.eta, f));
    clearValues([...etd, ...eta], { emit: true });
  });

  flashResetSuccess(btn);
}

function resetAerodromes(btn) {
  withMuteLegAutofill(() => {
    const frames = legsFrames();

    const aeroFrom = frames.flatMap((f) => qsa(SEL.legs.aeroFrom, f));
    const aeroTo = frames.flatMap((f) => qsa(SEL.legs.aeroTo, f));
    const alts = frames.flatMap((f) => qsa(SEL.legs.alt, f));

    clearValues([...aeroFrom, ...aeroTo, ...alts], { emit: true });
    removeValidation();
  });

  flashResetSuccess(btn);
}

// ---------- CHECKLIST ----------
const CHECKLIST_STORAGE_KEY = "fp_checklist_v1";

function getChecklistScope() {
  return qs(SEL.checklist.view) || document;
}

function readChecklistState() {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeChecklistState(state) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
}

function applyChecklistToggle(btn, checked) {
  if (!btn) return;
  btn.classList.toggle("is-checked", !!checked);
  btn.innerHTML = checked 
    ? '<span class="tgl">✔</span>'
    : '<span class="tgl">✖</span>';
}

function resetChecklist(btn) {
  // alles: Storage weg + UI zurück
  localStorage.removeItem(CHECKLIST_STORAGE_KEY);

  const scope = getChecklistScope();

  // toggles off
  qsa(SEL.checklist.toggleBtn, scope).forEach((tb) => applyChecklistToggle(tb, false));

  // fields leer (emit:false, damit wx auto-check nicht gleich wieder feuert)
  qsa(SEL.checklist.fieldAny, scope).forEach((el) => setValue(el, "", { emit: false }));

  flashResetSuccess(btn);
}

function resetChecklistCheckmarks(btn) {
  const s = readChecklistState();
  s.toggles = {};
  writeChecklistState(s);

  const scope = getChecklistScope();
  qsa(SEL.checklist.toggleBtn, scope).forEach((tb) => applyChecklistToggle(tb, false));

  flashResetSuccess(btn);
}

function resetChecklistWx(btn) {
  const scope = getChecklistScope();

  const s = readChecklistState();
  s.fields = s.fields || {};
  delete s.fields.wx_nr;
  delete s.fields.wx_void;
  delete s.fields.wx_init;

  s.toggles = s.toggles || {};
  s.toggles.wx = false;

  writeChecklistState(s);

  ["wx_nr", "wx_void", "wx_init"].forEach((k) => {
    setValue(qs(SEL.checklist.fieldByKey(k), scope), "", { emit: false });
  });

  applyChecklistToggle(qs(SEL.checklist.toggleByKey("wx"), scope), false);

  flashResetSuccess(btn);
}

// ---------- FUEL ----------
function resetFuelInputs(btn) {
  // Hier NICHT flashen in den Sub-Resets -> nur einmal am Ende.
  resetLegFuelInputs(null);
  resetCompFuelInputs(null);
  resetAltFuelInputs(null);

  const panel = getFuelPanel();
  if (!panel) return;

  // Final Reserve default
  setValue(qs(SEL.fuel.finresSelect, panel), "IFR", { emit: true });

  setStdBlockOn(panel);
  flashResetSuccess(btn);
}

function resetLegFuelInputs(btn) {
  const panel = getFuelPanel();
  if (!panel) return;

  const trip = [1, 2, 3, 4]
    .map((leg) => qs(SEL.fuel.tripInput(leg), panel))
    .filter(Boolean);

  clearValues(trip, { emit: true });

  // nur wenn direkt geklickt wurde
  if (btn) flashResetSuccess(btn);
}

function resetCompFuelInputs(btn) {
  const panel = getFuelPanel();
  if (!panel) return;

  const ifr = qs(SEL.fuel.apprIfn, panel);
  const vfr = qs(SEL.fuel.apprVfr, panel);

  clearValues([ifr, vfr].filter(Boolean), { emit: true });

  if (btn) flashResetSuccess(btn);
}

function resetAltFuelInputs(btn) {
  const panel = getFuelPanel();
  if (!panel) return;

  const alt = qs(SEL.fuel.altInput, panel);
  clearValues([alt].filter(Boolean), { emit: true });

  if (btn) flashResetSuccess(btn);
}

function setStdBlockOn(panel) {
  const stdBtn = qs(SEL.fuel.toggleStd, panel);
  const auxBtn = qs(SEL.fuel.toggleAux, panel);
  const mainInp = qs(SEL.fuel.mainInput, panel);

  if (stdBtn) {
    stdBtn.dataset.state = "on";
    stdBtn.textContent = "ON";
  }

  if (auxBtn) {
    auxBtn.dataset.state = "on";
    auxBtn.textContent = "26.4 USG";
  }

  if (mainInp) {
    mainInp.value = "44,0";
    mainInp.disabled = true;
    mainInp.dispatchEvent(new Event("input", { bubbles: true }));
    mainInp.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // fuel.js reagiert auf change im Panel
  panel.dispatchEvent(new Event("change", { bubbles: true }));
}