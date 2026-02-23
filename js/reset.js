// js/reset.js

import { exportDataJSON, importDataJSONFromFile } from "./storage.js";
import { withMuteLegAutofill } from "./ui/state.js";

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

  // optional (wenn mal wieder data-action="mail-eo" verwendet wird)
  "mail-eo": () => exportDataJSON({ auto: true }),
};

export function initResets() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const fn = ACTIONS[action];
    if (!fn) return;

    fn(btn); // btn optional reinreichen
  });
}

// ---------- Topbar ----------
function handleExport() {
  exportDataJSON();
}

async function handleImport() {
  const inp = document.getElementById("importFile");
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
function clearInputs(nodeList) {
  nodeList.forEach((el) => {
    if (!el) return;
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function removeValidation(nodeList) {
  nodeList.forEach((el) => el.classList.remove("invalid"));
  document.querySelectorAll(".aero-error, .alt-error").forEach((el) => {
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
  const scope = document.getElementById("kopfContainer") || document;

  const date = scope.querySelector("#dateInput");
  clearInputs([date]);
  // const fdl  = scope.querySelector("#FDLinput");
  // const tel  = scope.querySelector("#TELinput");
  // clearInputs([date, fdl, tel]);

  const lfz = scope.querySelector("#lfzSelect");
  const tac = scope.querySelector("#tacSelect");

  if (lfz) {
    lfz.selectedIndex = 0;
    lfz.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (tac) {
    tac.selectedIndex = 0;
    tac.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const cs = scope.querySelector("#callSignDisplay");
  if (cs) cs.textContent = "";

  flashResetSuccess(btn);
}

function resetTimes(btn) {
  withMuteLegAutofill(() => {
    const etd = document.querySelectorAll("#legsContainer .legField.etd");
    const eta = document.querySelectorAll("#legsContainer .legField.eta");
    clearInputs([...etd, ...eta]);
  });
  flashResetSuccess(btn);
}

function resetAerodromes(btn) {
  withMuteLegAutofill(() => {
    const aeroFrom = document.querySelectorAll("#legsContainer .legField.aeroFrom");
    const aeroTo   = document.querySelectorAll("#legsContainer .legField.aeroTo");
    const alts     = document.querySelectorAll("#legsContainer .legField.alt");

    clearInputs([...aeroFrom, ...aeroTo, ...alts]);
    removeValidation([...aeroFrom, ...aeroTo, ...alts]);
  });
  flashResetSuccess(btn);
}

// ---------- FUEL ----------
function resetFuelInputs(btn) {
  resetLegFuelInputs();
  resetCompFuelInputs();
  resetAltFuelInputs();

  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  const finres = panel.querySelector("#finres");
  if (finres) {
    finres.value = "IFR";
    finres.dispatchEvent(new Event("change", { bubbles: true }));
  }

  setStdBlockOn(panel);
  flashResetSuccess(btn);
}

function resetLegFuelInputs(btn) {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  const trip = panel.querySelectorAll(
    `[data-trip-usg="1"],[data-trip-usg="2"],[data-trip-usg="3"],[data-trip-usg="4"]`
  );
  clearInputs(trip);
  flashResetSuccess(btn);
}

function resetCompFuelInputs(btn) {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  const ifr = panel.querySelector(`[data-field="appr_ifr_n"]`);
  const vfr = panel.querySelector(`[data-field="appr_vfr_n"]`);
  clearInputs([ifr, vfr]);
  flashResetSuccess(btn);
}

function resetAltFuelInputs(btn) {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  const alt = panel.querySelector(`[data-field="alt_usg_log"]`);
  clearInputs([alt]);
  flashResetSuccess(btn);
}

function setStdBlockOn(panel) {
  const stdBtn  = panel.querySelector(`.fuelToggle[data-field="std_block"]`);
  const auxBtn  = panel.querySelector(`.fuelToggle[data-field="aux_on"]`);
  const mainInp = panel.querySelector(`[data-field="main_usg"]`);

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

  panel.dispatchEvent(new Event("change", { bubbles: true }));
}