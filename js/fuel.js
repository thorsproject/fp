// js/fuel.js
// Fuel Planning – Trip manuell (USG), Zeiten automatisch aus NC, Rest automatisch

import { BURN, FIX, CAP } from "./fuelConstants.js";
import { qs, qsa, closest, readValue, SEL } from "./ui/index.js";

// ---------- helpers ----------
function isLegActive(legNum) {
  if (legNum === 1) return true;
  const btn = qs(`.legToggle[data-leg="${legNum}"]`);
  if (!btn) return true;
  return btn.dataset.state !== "inactive";
}

// ---------- parsing ----------
function toNum(v) {
  if (v == null) return 0;
  const s = String(v).replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function clampInt(v) {
  const n = parseInt(String(v || "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fmtHHMM(mins) {
  const m = Math.max(0, Math.round(mins));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

function minsFromUsg(usg, rate = BURN.NC) {
  if (!Number.isFinite(usg) || usg <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return (usg / rate) * 60;
}

function setOut(panel, key, val) {
  qsa(`[data-out="${key}"]`, panel).forEach((el) => {
    el.textContent = val;
  });
}

// ---------- Trip (manual USG) from DOM ----------
function readTripFromDOM(panel) {
  const tripUsg = [1, 2, 3, 4].map((n) => {
    if (!isLegActive(n)) return 0;
    const el = qs(`[data-trip-usg="${n}"]`, panel);
    return toNum(readValue(el));
  });

  const tripUsgSum = tripUsg.reduce((a, b) => a + b, 0);
  const tripMinSum = minsFromUsg(tripUsgSum, BURN.NC); // Summe aktive Legs

  return { tripUsg, tripUsgSum, tripMinSum };
}

function syncTripInputsEnabled(panel) {
  qsa(".trip[data-trip-leg]", panel).forEach((cell) => {
    const leg = Number(cell.dataset.tripLeg);
    const active = isLegActive(leg);

    cell.classList.toggle("inactive", !active);
    qsa("input", cell).forEach((inp) => {
      inp.disabled = !active;
      // Werte bleiben erhalten, werden nur nicht mitgerechnet
    });
  });
}

// ---------- Toggle Buttons ----------
function initFuelToggles(panel) {
  qsa(".fuelToggle", panel).forEach((btn) => {
    function applyVisual() {
      const field = btn.dataset.field;
      const state = btn.dataset.state;

      if (field === "std_block") {
        btn.textContent = state === "on" ? "ON" : "OFF";
      }

      if (field === "aux_on") {
        btn.textContent = state === "on" ? `${CAP.AUX} USG` : "0 USG";
      }
    }

    function toggle() {
      btn.dataset.state = btn.dataset.state === "on" ? "off" : "on";

      const field = btn.dataset.field;

      if (field === "std_block") {
        const mainInp = qs(SEL.fuel.mainInput, panel);
        const auxBtn = qs(`.fuelToggle[data-field="aux_on"]`, panel);

        if (btn.dataset.state === "on") {
          // Standard ON → preset + lock
          if (mainInp) {
            mainInp.value = String(CAP.MAIN_STANDARD.toFixed(1)).replace(".", ",");
            mainInp.disabled = true;
          }

          // Aux automatisch ON
          if (auxBtn) {
            auxBtn.dataset.state = "on";
            auxBtn.textContent = `${CAP.AUX} USG`;
          }
        } else {
          // Standard OFF → unlock + clear
          if (mainInp) {
            mainInp.disabled = false;
            mainInp.value = "";
            mainInp.focus();
          }
        }
      }

      applyVisual();
      // render happens via listeners (input/change) – aber wir stoßen sauber an:
      panel.dispatchEvent(new Event("change", { bubbles: true }));
    }

    btn.addEventListener("click", toggle);

    applyVisual();

    // Initial Lock State anwenden
    if (btn.dataset.field === "std_block") {
      const mainInp = qs(SEL.fuel.mainInput, panel);
      if (!mainInp) return;

      if (btn.dataset.state === "on") {
        mainInp.value = String(CAP.MAIN_STANDARD.toFixed(1)).replace(".", ",");
        mainInp.disabled = true;
      } else {
        mainInp.disabled = false;
      }
    }
  });
}

// --- UX: Main Input clamp + snap formatting ---
function initMainClamp(panel) {
  const mainInp = qs(SEL.fuel.mainInput, panel);
  if (!mainInp) return;

  const snap = (reason = "") => {
    const rawStr = String(mainInp.value ?? "").trim();
    if (!rawStr) return; // leer lassen

    const raw = toNum(rawStr);
    if (!Number.isFinite(raw)) return;

    const clamped = Math.min(Math.max(raw, 0), CAP.MAIN_MAX);

    const shouldWrite = reason === "blur" || Math.abs(clamped - raw) > 0.0001;

    if (shouldWrite) {
      mainInp.value = String(clamped.toFixed(1)).replace(".", ",");

      const wasClamped = Math.abs(clamped - raw) > 0.0001;
      if (wasClamped) {
        mainInp.classList.add("was-clamped");
        window.setTimeout(() => mainInp.classList.remove("was-clamped"), 350);
      }

      mainInp.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  mainInp.addEventListener("input", () => {
    const raw = toNum(mainInp.value);
    if (raw > CAP.MAIN_MAX || raw < 0) snap("input");
  });

  mainInp.addEventListener("blur", () => snap("blur"));
}

function read(panel) {
  const profile = (readValue(qs(SEL.fuel.finresSelect, panel)) || "IFR").toUpperCase();
  const auxOn = qs(`.fuelToggle[data-field="aux_on"]`, panel)?.dataset.state === "on";

  const mainRaw = toNum(readValue(qs(SEL.fuel.mainInput, panel)));
  const mainUsg = Math.min(Math.max(mainRaw, 0), CAP.MAIN_MAX);

  const blockUsgIn = mainUsg + (auxOn ? CAP.AUX : 0);
  const cap = CAP.MAIN_MAX + (auxOn ? CAP.AUX : 0);

  // Trip (nur aktive Legs)
  const { tripUsgSum, tripMinSum } = readTripFromDOM(panel);

  // Approaches -> Company Fuel
  const nIFR = clampInt(readValue(qs(SEL.fuel.apprIfn, panel)));
  const nVFR = clampInt(readValue(qs(SEL.fuel.apprVfr, panel)));

  const companyUsg = nIFR * FIX.IFR_APPR_USG + nVFR * FIX.VFR_APPR_USG;
  const companyMin = nIFR * FIX.IFR_APPR_MIN + nVFR * FIX.VFR_APPR_MIN;

  // Contingency (nur USG relevant, Zeit NICHT addieren)
  const contUsg = 0.05 * (tripUsgSum + companyUsg);

  // Alternate (USG Log + extra), Zeit automatisch NC
  const altLogUsg = toNum(readValue(qs(SEL.fuel.altInput, panel)));
  const altUsg = altLogUsg + FIX.ALT_EXTRA_USG;
  const altMin = minsFromUsg(altUsg, BURN.NC);

  // Final Reserve fixed
  const resUsg = profile === "VFR" ? FIX.RES_VFR_USG : FIX.RES_IFR_USG;
  const resMin = profile === "VFR" ? FIX.RES_VFR_MIN : FIX.RES_IFR_MIN;

  // Taxi fixed (keine Zeit)
  const taxiUsg = FIX.TAXI_USG;

  // Planned Takeoff Fuel (Summe ohne Taxi)
  const plannedUsg = tripUsgSum + companyUsg + contUsg + altUsg + resUsg;

  // Planned Time: Trip + Company + Alternate + Reserve (Cont/Taxi NICHT)
  const plannedMin = tripMinSum + companyMin + altMin + resMin;

  // Takeoff / Extra / Landing
  const takeoffUsg = Math.max(0, blockUsgIn - taxiUsg);
  const extraLrcUsg = takeoffUsg - plannedUsg;
  const extraLrcMin = minsFromUsg(Math.max(0, extraLrcUsg), BURN.LRC);

  // Takeoff Time = Planned Time + Extra LRC Time
  const takeoffMin = plannedMin + extraLrcMin;

  // Landing Fuel Time bei NC
  const landingUsg = blockUsgIn - taxiUsg - (tripUsgSum + companyUsg);
  const landingMin = minsFromUsg(Math.max(0, landingUsg), BURN.NC);

  // Trip + Company line
  const tripCompanyUsg = tripUsgSum + companyUsg;
  const tripCompanyMin = tripMinSum + companyMin;

  // Remaining MISC
  const bingoUsg = altUsg + resUsg;
  const minblUsg = plannedUsg + taxiUsg;

  // CO2: (wie vorher definiert)
  const co2Kgs =
    (tripCompanyUsg + contUsg + taxiUsg) *
    FIX.USG_LIT *
    FIX.JETA1_KG_PER_L *
    FIX.CO2_PER_KG_FUEL;

  return {
    cap,
    mainUsg,
    auxOn,

    blockUsgIn,

    tripUsgSum,
    tripMinSum,

    companyUsg,
    companyMin,

    contUsg,

    altUsg,
    altMin,

    resUsg,
    resMin,

    taxiUsg,

    plannedUsg,
    plannedMin,

    extraLrcUsg,
    extraLrcMin,

    takeoffUsg,
    takeoffMin,

    landingUsg,
    landingMin,

    tripCompanyUsg,
    tripCompanyMin,

    bingoUsg,
    minblUsg,
    co2Kgs,
  };
}

function render(panel) {
  const d = read(panel);

  // setOut(panel, "cap_usg", d.cap.toFixed(1));

  setOut(panel, "trip_usg_sum", d.tripUsgSum.toFixed(1));
  setOut(panel, "trip_time_sum", fmtHHMM(d.tripMinSum));

  setOut(panel, "company_usg", d.companyUsg.toFixed(1));
  setOut(panel, "company_time", fmtHHMM(d.companyMin));

  setOut(panel, "cont_usg", d.contUsg.toFixed(1));
  setOut(panel, "cont_time", ""); // bewusst leer

  setOut(panel, "alt_usg", d.altUsg.toFixed(1));
  setOut(panel, "alt_time_out", fmtHHMM(d.altMin));

  setOut(panel, "res_usg", d.resUsg.toFixed(1));
  setOut(panel, "res_time", fmtHHMM(d.resMin));

  setOut(panel, "planned_usg", d.plannedUsg.toFixed(1));
  setOut(panel, "planned_time", fmtHHMM(d.plannedMin));

  // Extra Fuel LRC + warning
  setOut(panel, "extra_lrc_usg", d.extraLrcUsg.toFixed(1));

  const warnEl = qs(`[data-out="extra_warn"]`, panel);
  if (warnEl) {
    const on = d.extraLrcUsg < 0;
    warnEl.textContent = on ? "ACHTUNG! Fuel nicht ausreichend, Werte korrigieren!" : "";
    warnEl.classList.toggle("is-on", on);
  }

  const extraValEl = qs(`[data-out="extra_lrc_usg"]`, panel);
  if (extraValEl) extraValEl.classList.toggle("fuel-negative", d.extraLrcUsg < 0);

  setOut(panel, "extra_lrc_time", fmtHHMM(d.extraLrcMin));

  // Takeoff / Taxi / Block
  setOut(panel, "takeoff_usg", d.takeoffUsg.toFixed(1));
  setOut(panel, "takeoff_time", fmtHHMM(d.takeoffMin));

  setOut(panel, "taxi_usg", d.taxiUsg.toFixed(1));
  setOut(panel, "taxi_time", ""); // bewusst leer

  setOut(panel, "block_usg_out", d.blockUsgIn.toFixed(1));
  setOut(panel, "block_time_out", ""); // bewusst leer

  // Trip + Company
  setOut(panel, "trip_company_usg", d.tripCompanyUsg.toFixed(1));
  setOut(panel, "trip_company_time", fmtHHMM(d.tripCompanyMin));

  // Landing
  setOut(panel, "landing_usg", d.landingUsg.toFixed(1));
  setOut(panel, "landing_time", fmtHHMM(d.landingMin));

  // Fuel MISC
  setOut(panel, "bingo_usg", d.bingoUsg.toFixed(1));
  setOut(panel, "minblock_usg", d.minblUsg.toFixed(1));
  setOut(panel, "co2fp_kgs", `${d.co2Kgs.toFixed(0)} kg`);
}

export function initFuelPlanning() {
  const panel = qs(SEL.fuel.panel) || qs("#fuelPanel");
  if (!panel) return;

  initFuelToggles(panel);
  initMainClamp(panel);

  function syncAndRender() {
    syncTripInputsEnabled(panel);
    render(panel);
  }

  panel.addEventListener("input", syncAndRender);
  panel.addEventListener("change", syncAndRender);

  // Leg toggles (links) beeinflussen Trip-Fuel: daher re-render
  document.addEventListener("click", (e) => {
    const btn = closest(e.target, ".legToggle");
    if (!btn) return;
    syncAndRender();
  });

  syncAndRender();
}