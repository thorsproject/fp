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

const ACTIONS = {
  // Route
  "reset-kopf": resetKopf,
  "reset-times": resetTimes,
  "reset-aeros": resetAerodromes,

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
    if (!fn) return;

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
    alert("Import nicht möglich: #importFile fehlt im HTML.");
    return;
  }

  inp.value = "";
  inp.onchange = async () => {
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

  inp.click();
}

// ---------- helpers ----------
function removeValidation(nodeList) {
  nodeList.forEach((el) => el?.classList?.remove?.("invalid"));
  qsa(".aero-error, .alt-error").forEach((el) => {
    el.textContent = "";
  });
}

function flashResetSuccess(btn) {
  if (!btn) return;
  btn.classList.add("reset-success");
  setTimeout(() => btn.classList.remove("reset-success"), 220);
}

// ---------- ROUTE ----------
function resetKopf(btn) {
  const scope = qs("#kopfContainer") || document;

  // nur DATE löschen (FDL/TEL bleiben absichtlich aus Settings)
  setValue(qs(SEL.route.dateInput, scope), "", { emit: true });

  // Selects zurücksetzen
  const lfz = qs(SEL.route.lfzSelect, scope);
  const tac = qs(SEL.route.tacSelect, scope);

  if (lfz) {
    lfz.selectedIndex = 0;
    lfz.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (tac) {
    tac.selectedIndex = 0;
    tac.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Callsign Anzeige leeren (ist Text, kein Input)
  const cs = qs(SEL.route.callsignDisplay, scope);
  if (cs) cs.textContent = "";

  flashResetSuccess(btn);
}

function resetTimes(btn) {
  withMuteLegAutofill(() => {
    const frames = qsa(SEL.legs.frames);
    const etd = frames.flatMap((f) => qsa(SEL.legs.etd, f));
    const eta = frames.flatMap((f) => qsa(SEL.legs.eta, f));
    clearValues([...etd, ...eta], { emit: true });
  });

  flashResetSuccess(btn);
}

function resetAerodromes(btn) {
  withMuteLegAutofill(() => {
    const frames = qsa(SEL.legs.frames);

    const aeroFrom = frames.flatMap((f) => qsa(SEL.legs.aeroFrom, f));
    const aeroTo   = frames.flatMap((f) => qsa(SEL.legs.aeroTo, f));
    const alts     = frames.flatMap((f) => qsa(SEL.legs.alt, f));

    clearValues([...aeroFrom, ...aeroTo, ...alts], { emit: true });
    removeValidation([...aeroFrom, ...aeroTo, ...alts]);
  });

  flashResetSuccess(btn);
}

// ---------- FUEL ----------
function resetFuelInputs(btn) {
  resetLegFuelInputs();
  resetCompFuelInputs();
  resetAltFuelInputs();

  const panel = qs(SEL.fuel.panel);
  if (!panel) return;

  // Final Reserve default
  setValue(qs(SEL.fuel.finresSelect, panel), "IFR", { emit: true });

  setStdBlockOn(panel);
  flashResetSuccess(btn);
}

function resetLegFuelInputs(btn) {
  const panel = qs(SEL.fuel.panel);
  if (!panel) return;

  const trip = [1, 2, 3, 4].map((leg) => qs(SEL.fuel.tripInput(leg), panel)).filter(Boolean);
  clearValues(trip, { emit: true });

  flashResetSuccess(btn);
}

function resetCompFuelInputs(btn) {
  const panel = qs(SEL.fuel.panel);
  if (!panel) return;

  const ifr = qs(SEL.fuel.apprIfn, panel);
  const vfr = qs(SEL.fuel.apprVfr, panel);

  clearValues([ifr, vfr].filter(Boolean), { emit: true });
  flashResetSuccess(btn);
}

function resetAltFuelInputs(btn) {
  const panel = qs(SEL.fuel.panel);
  if (!panel) return;

  const alt = qs(SEL.fuel.altInput, panel);
  clearValues([alt].filter(Boolean), { emit: true });

  flashResetSuccess(btn);
}

function setStdBlockOn(panel) {
  const stdBtn  = qs(SEL.fuel.toggleStd, panel);
  const auxBtn  = qs(SEL.fuel.toggleAux, panel);
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