// js/fuel.js
import { qs, qsa, readValue, setValue, toggleClass, setText, SEL } from "./ui/index.js";
import { BURN, FIX, CAP } from "./fuelConstants.js";

// -----------------------------
// Formatting / Parsing
// -----------------------------
function parseNum(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function fmtUSG(n) {
  if (!Number.isFinite(n)) n = 0;
  return n.toFixed(1).replace(".", ",");
}

function fmtMIN(n) {
  if (!Number.isFinite(n)) n = 0;
  return String(Math.round(n));
}

function usgToMin(usg, burnUSGperH) {
  if (!burnUSGperH || burnUSGperH <= 0) return 0;
  const h = usg / burnUSGperH;
  return h * 60;
}

function setOut(panel, key, value) {
  const el = qs(`[data-out="${key}"]`, panel);
  if (!el) return;
  el.textContent = value;
}

function clampInput(el, min, max) {
  if (!el) return;
  const before = el.value;

  const n = parseNum(el.value);
  let clamped = n;

  if (Number.isFinite(min)) clamped = Math.max(min, clamped);
  if (Number.isFinite(max)) clamped = Math.min(max, clamped);

  const after = fmtUSG(clamped);
  if (before.trim() && before !== after) {
    el.value = after;
    el.classList.add("was-clamped");
    setTimeout(() => el.classList.remove("was-clamped"), 260);
  } else if (!before.trim()) {
    // leer lassen ok
  } else {
    el.value = after;
  }
}

// -----------------------------
// Toggles
// -----------------------------
function getToggleState(btn) {
  const s = (btn?.dataset?.state || "").toLowerCase();
  return s === "on" ? "on" : "off";
}

function setToggleState(btn, state) {
  if (!btn) return;
  const s = state === "on" ? "on" : "off";
  btn.dataset.state = s;
  btn.classList.toggle("is-on", s === "on");
}

function applyToggleVisuals(panel) {
  const stdBtn = qs(SEL.fuel.toggleStd, panel);
  const auxBtn = qs(SEL.fuel.toggleAux, panel);
  const mainInp = qs(SEL.fuel.mainInput, panel);

  const stdOn = getToggleState(stdBtn) === "on";
  const auxOn = getToggleState(auxBtn) === "on";

  if (stdBtn) stdBtn.textContent = stdOn ? "ON" : "OFF";
  if (auxBtn) auxBtn.textContent = auxOn ? `${CAP.AUX} USG` : "OFF";

  if (mainInp) {
    if (stdOn) {
      mainInp.value = fmtUSG(CAP.MAIN_STANDARD);
      mainInp.disabled = true;
    } else {
      mainInp.disabled = false;
      // value bleibt wie user es gesetzt hat
    }
  }
}

// -----------------------------
// Read current inputs
// -----------------------------
function readFuelModel(panel) {
  const stdBtn = qs(SEL.fuel.toggleStd, panel);
  const auxBtn = qs(SEL.fuel.toggleAux, panel);

  const stdOn = getToggleState(stdBtn) === "on";
  const auxOn = getToggleState(auxBtn) === "on";

  const mainInp = qs(SEL.fuel.mainInput, panel);
  const mainUSG = stdOn ? CAP.MAIN_STANDARD : parseNum(readValue(mainInp));

  const trip = {
    1: parseNum(readValue(qs(SEL.fuel.tripInput(1), panel))),
    2: parseNum(readValue(qs(SEL.fuel.tripInput(2), panel))),
    3: parseNum(readValue(qs(SEL.fuel.tripInput(3), panel))),
    4: parseNum(readValue(qs(SEL.fuel.tripInput(4), panel))),
  };

  const nIFR = parseNum(readValue(qs(SEL.fuel.apprIfn, panel)));
  const nVFR = parseNum(readValue(qs(SEL.fuel.apprVfr, panel)));

  const altLog = parseNum(readValue(qs(SEL.fuel.altInput, panel)));

  const finresSel = qs(SEL.fuel.finresSelect, panel);
  const finres = (readValue(finresSel) || "IFR").toUpperCase() === "VFR" ? "VFR" : "IFR";

  return {
    toggles: { stdOn, auxOn },
    mainUSG,
    auxUSG: auxOn ? CAP.AUX : 0,
    trip,
    nIFR,
    nVFR,
    altLog,
    finres,
  };
}

// -----------------------------
// Compute
// -----------------------------
function compute(model) {
  const burnTrip = BURN?.LRC ?? 10.3; // fallback
  const burnExtra = BURN?.LRC ?? 10.3;

  const tripUSG = (model.trip[1] || 0) + (model.trip[2] || 0) + (model.trip[3] || 0) + (model.trip[4] || 0);
  const tripMIN = usgToMin(tripUSG, burnTrip);

  // Company = approaches
  const apprUSG =
    (model.nIFR || 0) * (FIX.IFR_APPR_USG ?? 3) +
    (model.nVFR || 0) * (FIX.VFR_APPR_USG ?? 1);
  const apprMIN =
    (model.nIFR || 0) * (FIX.IFR_APPR_MIN ?? 20) +
    (model.nVFR || 0) * (FIX.VFR_APPR_MIN ?? 5);

  const companyUSG = apprUSG;
  const companyMIN = apprMIN;

  // Contingency 5% Trip + Company
  const contUSG = 0.05 * (tripUSG + companyUSG);
  const contMIN = 0.05 * (tripMIN + companyMIN);

  // Alternate fuel = log + extra
  const altUSG = (model.altLog || 0) + (FIX.ALT_EXTRA_USG ?? 2.0);
  const altMIN = usgToMin(altUSG, burnTrip);

  // Final reserve
  const resUSG =
    model.finres === "VFR" ? (FIX.RES_VFR_USG ?? 3.3) : (FIX.RES_IFR_USG ?? 4.9);
  const resMIN =
    model.finres === "VFR" ? (FIX.RES_VFR_MIN ?? 30) : (FIX.RES_IFR_MIN ?? 45);

  // Planned Takeoff Fuel
  const plannedUSG = tripUSG + companyUSG + contUSG + altUSG + resUSG;
  const plannedMIN = tripMIN + companyMIN + contMIN + altMIN + resMIN;

  // Onboard / Block / Takeoff
  const taxiUSG = FIX.TAXI_USG ?? 1.0;
  const taxiMIN = FIX.TAXI_MIN ?? 0;

  const blockUSG = (model.mainUSG || 0) + (model.auxUSG || 0);
  const blockMIN = usgToMin(blockUSG, burnExtra) + taxiMIN; // grob

  const takeoffUSG = Math.max(0, blockUSG - taxiUSG);
  const takeoffMIN = Math.max(0, usgToMin(takeoffUSG, burnExtra));

  // Extra Fuel (LRC) = Takeoff - Planned
  const extraUSG = takeoffUSG - plannedUSG;
  const extraMIN = usgToMin(Math.max(0, extraUSG), burnExtra);

  // Landing Fuel (grobe Logik)
  // Nach Trip + Company bleibt (Cont+Alt+Res+Extra) übrig.
  const tripCompanyUSG = tripUSG + companyUSG;
  const tripCompanyMIN = tripMIN + companyMIN;

  const landingUSG = Math.max(0, takeoffUSG - tripCompanyUSG);
  const landingMIN = Math.max(0, takeoffMIN - tripCompanyMIN);

  // "Bingo" und "Min Block" (pragmatisch)
  const bingoUSG = altUSG + resUSG;
  const minBlockUSG = plannedUSG + taxiUSG;

  // CO2: USG -> Liter -> kg Fuel -> kg CO2
  const liters = blockUSG * (FIX.USG_LIT ?? 3.785);
  const kgFuel = liters * (FIX.JETA1_KG_PER_L ?? 0.804);
  const co2kg  = kgFuel * (FIX.CO2_PER_KG_FUEL ?? 3.15);

  return {
    tripUSG, tripMIN,
    companyUSG, companyMIN,
    contUSG, contMIN,
    altUSG, altMIN,
    resUSG, resMIN,
    plannedUSG, plannedMIN,
    extraUSG, extraMIN,
    taxiUSG, taxiMIN,
    takeoffUSG, takeoffMIN,
    blockUSG, blockMIN,
    tripCompanyUSG, tripCompanyMIN,
    landingUSG, landingMIN,
    bingoUSG,
    minBlockUSG,
    co2kg,
  };
}

// -----------------------------
// Render
// -----------------------------
function render(panel, model, out) {
  // Header sums
  setOut(panel, "trip_usg_sum", fmtUSG(out.tripUSG));
  setOut(panel, "trip_time_sum", fmtMIN(out.tripMIN));

  setOut(panel, "company_usg", fmtUSG(out.companyUSG));
  setOut(panel, "company_time", fmtMIN(out.companyMIN));

  setOut(panel, "cont_usg", fmtUSG(out.contUSG));
  setOut(panel, "cont_time", fmtMIN(out.contMIN));

  setOut(panel, "alt_usg", fmtUSG(out.altUSG));
  setOut(panel, "alt_time_out", fmtMIN(out.altMIN));

  setOut(panel, "res_usg", fmtUSG(out.resUSG));
  setOut(panel, "res_time", fmtMIN(out.resMIN));

  setOut(panel, "planned_usg", fmtUSG(out.plannedUSG));
  setOut(panel, "planned_time", fmtMIN(out.plannedMIN));

  // Extra warn
  const warnEl = qs(`[data-out="extra_warn"]`, panel);
  if (warnEl) {
    const neg = out.extraUSG < 0;
    warnEl.textContent = neg ? "⚠ zu wenig Fuel" : "";
    warnEl.classList.toggle("fuel-negative", neg);
  }

  setOut(panel, "extra_lrc_usg", fmtUSG(out.extraUSG));
  setOut(panel, "extra_lrc_time", fmtMIN(out.extraMIN));

  setOut(panel, "takeoff_usg", fmtUSG(out.takeoffUSG));
  setOut(panel, "takeoff_time", fmtMIN(out.takeoffMIN));

  setOut(panel, "taxi_usg", fmtUSG(out.taxiUSG));
  setOut(panel, "taxi_time", fmtMIN(out.taxiMIN));

  setOut(panel, "block_usg_out", fmtUSG(out.blockUSG));
  setOut(panel, "block_time_out", fmtMIN(out.blockMIN));

  setOut(panel, "trip_company_usg", fmtUSG(out.tripCompanyUSG));
  setOut(panel, "trip_company_time", fmtMIN(out.tripCompanyMIN));

  setOut(panel, "landing_usg", fmtUSG(out.landingUSG));
  setOut(panel, "landing_time", fmtMIN(out.landingMIN));

  // Footer
  setOut(panel, "bingo_usg", fmtUSG(out.bingoUSG));
  setOut(panel, "minblock_usg", fmtUSG(out.minBlockUSG));
  setOut(panel, "co2fp_kgs", `${Math.round(out.co2kg)} kg`);

  // Kleine UX: main input disable-state passend zum std_block
  const mainInp = qs(SEL.fuel.mainInput, panel);
  if (mainInp) {
    mainInp.disabled = model.toggles.stdOn;
  }
}

function recalc(panel) {
  applyToggleVisuals(panel);

  // Optional: clamp inputs
  const mainInp = qs(SEL.fuel.mainInput, panel);
  const altInp = qs(SEL.fuel.altInput, panel);

  // main nur clampen, wenn user editieren darf
  if (mainInp && !mainInp.disabled) clampInput(mainInp, 0, CAP.MAIN_MAX);

  // alt log clamp
  if (altInp) clampInput(altInp, 0, 200);

  // trip inputs clamp
  [1, 2, 3, 4].forEach((leg) => {
    const el = qs(SEL.fuel.tripInput(leg), panel);
    if (el) clampInput(el, 0, 200);
  });

  // appr counts clamp (integers, aber wir lassen 0..99)
  const ifrEl = qs(SEL.fuel.apprIfn, panel);
  const vfrEl = qs(SEL.fuel.apprVfr, panel);
  if (ifrEl) {
    const n = Math.max(0, Math.min(99, Math.round(parseNum(readValue(ifrEl)))));
    ifrEl.value = String(n);
  }
  if (vfrEl) {
    const n = Math.max(0, Math.min(99, Math.round(parseNum(readValue(vfrEl)))));
    vfrEl.value = String(n);
  }

  const model = readFuelModel(panel);
  const out = compute(model);
  render(panel, model, out);
}

// -----------------------------
// Public init
// -----------------------------
export function initFuelPlanning() {
  const panel = qs(SEL.fuel.panel);
  if (!panel) return;

  // initial visuals + calc
  applyToggleVisuals(panel);
  recalc(panel);

  // Toggle clicks
  panel.addEventListener("click", (e) => {
    const btn = e.target.closest(".fuelToggle");
    if (!btn) return;

    const current = getToggleState(btn);
    const next = current === "on" ? "off" : "on";
    setToggleState(btn, next);

    // wenn std_block auf ON -> main = default + disable
    // wenn std_block OFF -> main editable
    recalc(panel);

    // damit Autosave (storage.js) erkennt: es ist was passiert
    btn.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Inputs / selects
  panel.addEventListener("input", () => recalc(panel));
  panel.addEventListener("change", () => recalc(panel));

  // finres select
  const finres = qs(SEL.fuel.finresSelect, panel);
  finres?.addEventListener("change", () => recalc(panel));

  // safety: einmal nach Render-Frame (falls include spät kommt)
  requestAnimationFrame(() => recalc(panel));
}