// js/reset.js
export function initRouteResets() {
  // Delegation: funktioniert auch, wenn Buttons später neu gerendert werden
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button.routebtnReset");
    if (!btn) return;

    const action = btn.dataset.action;
    if (!action) return;

    if (action === "reset-kopf") resetKopf();
    if (action === "reset-times") resetTimes();
    if (action === "reset-aeros") resetAerodromes();
  });
}

export function initFuelResets() {
  // Delegation: funktioniert auch, wenn Buttons später neu gerendert werden
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button.fuelbtnReset");
    if (!btn) return;

    const action = btn.dataset.action;
    if (!action) return;

    if (action === "reset-fuel") resetFuelInputs();
    if (action === "reset-legfuel") resetlegFuelInputs();
    if (action === "reset-compfuel") resetcompFuelInputs();
    if (action === "reset-altfuel") resetaltFuelInputs();
  });
}

// ---------- helpers ----------
function clearInputs(nodeList) {
  nodeList.forEach((el) => {
    if (!el) return;
    el.value = "";
    // triggert live-calc / UI updates
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function removeValidation(nodeList) {
  nodeList.forEach((el) => {
    el.classList.remove("invalid");
  });

  // Falls du Fehlertexte irgendwo als Elemente ausgibst:
  document.querySelectorAll(".aero-error, .alt-error").forEach((el) => {
    el.textContent = "";
  });
}

// ---------- 1.1) Reset Kopfdaten ----------
function resetKopf() {
  const etd = document.querySelectorAll("#kopfContainer .dateInput");
  const eta = document.querySelectorAll("#kopfContainer .lfzSelect");
  const eta = document.querySelectorAll("#kopfContainer .tacSelect");
  clearInputs([...dateInput, ...lfzSelect, ...tacSelect]);
}

// ---------- 1.2) Reset ETD/ETA ----------
function resetTimes() {
  const etd = document.querySelectorAll("#legsContainer .legField.etd");
  const eta = document.querySelectorAll("#legsContainer .legField.eta");
  clearInputs([...etd, ...eta]);
}

// ---------- 1.3) Reset Aerodromes + Alternates ----------
function resetAerodromes() {
  const aeroFrom = document.querySelectorAll("#legsContainer .legField.aeroFrom");
  const aeroTo = document.querySelectorAll("#legsContainer .legField.aeroTo");
  const alts = document.querySelectorAll("#legsContainer .legField.alt");
  clearInputs([...aeroFrom, ...aeroTo, ...alts]);
  removeValidation([...aeroFrom, ...aeroTo, ...alts]);
}

// ---------- 2.1) Reset Fuel Inputs ----------
function resetFuelInputs() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  // Trip Fuel (Leg 1-4) – auch wenn disabled/inactive: wir leeren trotzdem
  const trip = panel.querySelectorAll(`[data-trip-usg="1"],[data-trip-usg="2"],[data-trip-usg="3"],[data-trip-usg="4"]`);
  clearInputs(trip);

  // Approaches
  const ifr = panel.querySelector(`[data-field="appr_ifr_n"]`);
  const vfr = panel.querySelector(`[data-field="appr_vfr_n"]`);
  clearInputs([ifr, vfr]);

  // Alternate Fuel (Log)
  const alt = panel.querySelector(`[data-field="alt_usg_log"]`);
  clearInputs([alt]);

  // Final Reserve auf IFR setzen
  const finres = panel.querySelector(`#finres`);
  if (finres) {
    finres.value = "IFR";
    finres.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// ---------- 2.2) Reset Leg Fuel Inputs ----------
function resetlegFuelInputs() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  // Trip Fuel (Leg 1-4) – auch wenn disabled/inactive: wir leeren trotzdem
  const trip = panel.querySelectorAll(`[data-trip-usg="1"],[data-trip-usg="2"],[data-trip-usg="3"],[data-trip-usg="4"]`);
  clearInputs(trip);
}

// ---------- 2.3) Reset Company Fuel Inputs ----------
function resetcompFuelInputs() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  // Approaches
  const ifr = panel.querySelector(`[data-field="appr_ifr_n"]`);
  const vfr = panel.querySelector(`[data-field="appr_vfr_n"]`);
  clearInputs([ifr, vfr]);
}
// ---------- 2.4) Reset Alternate Fuel Inputs ----------
function resetaltFuelInputs() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  // Alternate Fuel (Log)
  const alt = panel.querySelector(`[data-field="alt_usg_log"]`);
  clearInputs([alt]);
}