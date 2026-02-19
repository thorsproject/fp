// js/reset.js
import { exportDataJSON, importDataJSONFromFile } from "./storage.js";

export function initResets() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;
    if (!action) return;

    // Route
    if (action === "reset-kopf") resetKopf();
    if (action === "reset-times") resetTimes();
    if (action === "reset-aeros") resetAerodromes();

    // Fuel
    if (action === "reset-fuel") resetFuelInputs();
    if (action === "reset-legfuel") resetlegFuelInputs();
    if (action === "reset-compfuel") resetcompFuelInputs();
    if (action === "reset-altfuel") resetaltFuelInputs();

    // Topbar Export/Import
    if (action === "export-data") handleExport();
    if (action === "import-data") handleImport();
  });
}

function handleExport() {
  exportDataJSON();
}

async function handleImport() {
  const inp = document.getElementById("importFile");
  if (!inp) {
    alert("Import nicht möglich: #importFile fehlt im HTML.");
    return;
  }

  inp.value = ""; // erlaubt gleiche Datei erneut
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
};

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

  setTimeout(() => {
    btn.classList.remove("reset-success");
  }, 220);
}

// ---------- ROUTE ----------
function resetKopf() {
  // Wenn du inzwischen den #kopfContainer korrekt schließt und alles drin ist:
  const scope = document.getElementById("kopfContainer") || document;

  const date = scope.querySelector("#dateInput");
  const fdl  = scope.querySelector("#FDLinput");
  const tel  = scope.querySelector("#TELinput");
  clearInputs([date, fdl, tel]);

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
}

function resetTimes() {
  const etd = document.querySelectorAll("#legsContainer .legField.etd");
  const eta = document.querySelectorAll("#legsContainer .legField.eta");
  clearInputs([...etd, ...eta]);
}

function resetAerodromes() {
  const aeroFrom = document.querySelectorAll("#legsContainer .legField.aeroFrom");
  const aeroTo   = document.querySelectorAll("#legsContainer .legField.aeroTo");
  const alts     = document.querySelectorAll("#legsContainer .legField.alt");
  clearInputs([...aeroFrom, ...aeroTo, ...alts]);
  removeValidation([...aeroFrom, ...aeroTo, ...alts]);
}

// ---------- FUEL ----------
function resetFuelInputs() {
  resetLegFuelInputs();
  resetCompFuelInputs();
  resetAltFuelInputs();

  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  // Final Reserve auf IFR
  const finres = panel.querySelector("#finres");
  if (finres) {
    finres.value = "IFR";
    finres.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Reset-Policy: Standard Block ON
  setStdBlockOn(panel);
}

function resetLegFuelInputs() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  const trip = panel.querySelectorAll(
    `[data-trip-usg="1"],[data-trip-usg="2"],[data-trip-usg="3"],[data-trip-usg="4"]`
  );
  clearInputs(trip);
}

function resetCompFuelInputs() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  const ifr = panel.querySelector(`[data-field="appr_ifr_n"]`);
  const vfr = panel.querySelector(`[data-field="appr_vfr_n"]`);
  clearInputs([ifr, vfr]);
}

function resetAltFuelInputs() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  const alt = panel.querySelector(`[data-field="alt_usg_log"]`);
  clearInputs([alt]);
}

// --- Reset-Policy helper: Std Block ON (Main=44 locked, Aux=ON) ---
function setStdBlockOn(panel) {
  const stdBtn  = panel.querySelector(`.fuelToggle[data-field="std_block"]`);
  const auxBtn  = panel.querySelector(`.fuelToggle[data-field="aux_on"]`);
  const mainInp = panel.querySelector(`[data-field="main_usg"]`);

  // Standard ON
  if (stdBtn) {
    stdBtn.dataset.state = "on";
    stdBtn.textContent = "ON";
  }

  // Aux ON
  if (auxBtn) {
    auxBtn.dataset.state = "on";
    auxBtn.textContent = "26.4 USG";
  }

  // Main = 44.0 locked
  if (mainInp) {
    mainInp.value = "44,0";
    mainInp.disabled = true;
    mainInp.dispatchEvent(new Event("input", { bubbles: true }));
    mainInp.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Damit Fuel.js sicher neu rechnet (falls es nur auf input/change hört)
  panel.dispatchEvent(new Event("change", { bubbles: true }));
}