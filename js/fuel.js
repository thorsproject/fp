// js/fuel.js
// Fuel Planning – Trip manuell (USG), Zeiten automatisch aus NC, Rest automatisch

const BURN = {
  NC: 13.2,
  LRC: 10.3,
  MEC: 6.5,
};

const FIX = {
  IFR_APPR_USG: 3,
  IFR_APPR_MIN: 20,
  VFR_APPR_USG: 1,
  VFR_APPR_MIN: 5,

  RES_IFR_USG: 4.9,
  RES_IFR_MIN: 45,
  RES_VFR_USG: 3.3,
  RES_VFR_MIN: 30,

  ALT_EXTRA_USG: 2.0,

  TAXI_USG: 1.0,
};

const CAP = {
  MAIN_MAX: 50.0,         // Main Tank max editable
  MAIN_STANDARD: 44.0,    // Standard preset for main
  AUX: 26.4,              // Aux fixed option
};

// ---------- DOM helpers ----------
function q(panel, sel) {
  return panel.querySelector(sel);
}

function isLegActive(legNum) {
  if (legNum === 1) return true;
  const btn = document.querySelector(`.legToggle[data-leg="${legNum}"]`);
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
  const el = q(panel, `[data-out="${key}"]`);
  if (el) el.textContent = val;
}

// ---------- Standard Block behavior (Preset only, no locking) ----------
function initStdBlockBehavior(panel) {
  const stdSel = q(panel, `[data-field="std_block"]`);
  const auxSel = q(panel, `[data-field="aux_on"]`);
  const mainInp = q(panel, `[data-field="main_usg"]`);
  if (!stdSel || !auxSel || !mainInp) return;

  function setMain(v) {
    mainInp.value = String(v.toFixed(1)).replace(".", ",");
    mainInp.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function setAux(on) {
    auxSel.value = on ? "1" : "0";
    auxSel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyPresetIfOn() {
    const std = String(stdSel.value) === "1";
    if (!std) return;

    // Preset setzen, aber NICHT sperren
    setMain(CAP.MAIN_STANDARD);
    setAux(true);
  }

  stdSel.addEventListener("change", applyPresetIfOn);

  // initial
  applyPresetIfOn();
}

// ---------- Trip (manual USG) from DOM ----------
function readTripFromDOM(panel) {
  const tripUsg = [1, 2, 3, 4].map((n) => {
    if (!isLegActive(n)) return 0;
    const el = q(panel, `[data-trip-usg="${n}"]`);
    return toNum(el?.value);
  });

  const tripUsgSum = tripUsg.reduce((a, b) => a + b, 0);
  const tripMinSum = minsFromUsg(tripUsgSum, BURN.NC); // Summe aktive Legs

  return { tripUsg, tripUsgSum, tripMinSum };
}

function syncTripInputsEnabled(panel) {
  panel.querySelectorAll(".trip[data-trip-leg]").forEach((cell) => {
    const leg = Number(cell.dataset.tripLeg);
    const active = isLegActive(leg);

    cell.classList.toggle("inactive", !active);
    cell.querySelectorAll("input").forEach((inp) => {
      inp.disabled = !active;
      // Werte bleiben erhalten, werden nur nicht mitgerechnet
    });
  });
}

// ---------- main ----------
export function initFuelPlanning() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  initStdBlockBehavior(panel);

  // --- UX: Main Input clamp + snap formatting ---
  const mainInp = q(panel, `[data-field="main_usg"]`);
  if (mainInp) {
    const snap = (reason = "") => {
      const rawStr = String(mainInp.value ?? "").trim();
      if (!rawStr) return; // leer lassen

      // tolerant parsen
      const raw = toNum(rawStr);

      // wenn nicht parsebar (z.B. nur ","), nicht anfassen
      if (!Number.isFinite(raw)) return;

      // clamp
      const clamped = Math.min(Math.max(raw, 0), CAP.MAIN_MAX);

      // Snap nur, wenn wirklich drüber/drunter oder wenn blur (formatieren)
      const shouldWrite =
        reason === "blur" || Math.abs(clamped - raw) > 0.0001;

      if (shouldWrite) {
        mainInp.value = String(clamped.toFixed(1)).replace(".", ",");

        // kleine visuelle Rückmeldung, wenn begrenzt wurde
        const wasClamped = Math.abs(clamped - raw) > 0.0001;
        if (wasClamped) {
          mainInp.classList.add("was-clamped");
          window.setTimeout(() => mainInp.classList.remove("was-clamped"), 350);
        }

        // render neu anstoßen
        mainInp.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    // Beim Tippen: nur clampen, wenn klar > MAX oder < 0 (damit es nicht “zittert”)
    mainInp.addEventListener("input", () => {
      const raw = toNum(mainInp.value);
      if (raw > CAP.MAIN_MAX || raw < 0) snap("input");
    });

    // Beim Verlassen immer sauber formatieren (z.B. "44" -> "44,0")
    mainInp.addEventListener("blur", () => snap("blur"));
  }

  function read() {
    const profile = (q(panel, `#finres`)?.value || "IFR").toUpperCase();
    const auxOn = String(q(panel, `[data-field="aux_on"]`)?.value || "0") === "1";

    const mainRaw = toNum(q(panel, `[data-field="main_usg"]`)?.value);
    const mainUsg = Math.min(Math.max(mainRaw, 0), CAP.MAIN_MAX);

    const blockUsgIn = mainUsg + (auxOn ? CAP.AUX : 0);
    const cap = CAP.MAIN_MAX + (auxOn ? CAP.AUX : 0);

    // Trip (nur aktive Legs)
    const { tripUsgSum, tripMinSum } = readTripFromDOM(panel);

    // Approaches -> Company Fuel
    const nIFR = clampInt(q(panel, `[data-field="appr_ifr_n"]`)?.value);
    const nVFR = clampInt(q(panel, `[data-field="appr_vfr_n"]`)?.value);

    const companyUsg = nIFR * FIX.IFR_APPR_USG + nVFR * FIX.VFR_APPR_USG;
    const companyMin = nIFR * FIX.IFR_APPR_MIN + nVFR * FIX.VFR_APPR_MIN;

    // Contingency (nur USG relevant, Zeit NICHT addieren)
    const contUsg = 0.05 * (tripUsgSum + companyUsg);

    // Alternate (USG Log + 2.0), Zeit automatisch NC
    const altLogUsg = toNum(q(panel, `[data-field="alt_usg_log"]`)?.value);
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
    const landingUsg = blockUsgIn - taxiUsg - (tripUsgSum + companyUsg);

    // Trip + Company line (Company requirement)
    const tripCompanyUsg = tripUsgSum + companyUsg;
    const tripCompanyMin = tripMinSum + companyMin;

    // Remaining KPI = Extra (wie definiert)
    const remUsg = extraLrcUsg;

    function endurance(rate) {
      const usable = Math.max(0, remUsg);
      if (!Number.isFinite(usable) || rate <= 0) return "0:00";
      return fmtHHMM((usable / rate) * 60);
    }

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

      takeoffUsg,
      extraLrcUsg,
      landingUsg,

      tripCompanyUsg,
      tripCompanyMin,

      remUsg,

      endNC: endurance(BURN.NC),
      endLRC: endurance(BURN.LRC),
      endMEC: endurance(BURN.MEC),
    };
  }

  function render() {
    const d = read();

    setOut(panel, "cap_usg", d.cap.toFixed(1));

    setOut(panel, "trip_usg_sum", d.tripUsgSum.toFixed(1));
    setOut(panel, "trip_time_sum", fmtHHMM(d.tripMinSum));

    setOut(panel, "company_usg", d.companyUsg.toFixed(1));
    setOut(panel, "company_time", fmtHHMM(d.companyMin));

    setOut(panel, "cont_usg", d.contUsg.toFixed(1));
    setOut(panel, "cont_time", "");

    setOut(panel, "alt_usg", d.altUsg.toFixed(1));
    setOut(panel, "alt_time_out", fmtHHMM(d.altMin));

    setOut(panel, "res_usg", d.resUsg.toFixed(1));
    setOut(panel, "res_time", fmtHHMM(d.resMin));

    setOut(panel, "planned_usg", d.plannedUsg.toFixed(1));
    setOut(panel, "planned_time", fmtHHMM(d.plannedMin));

    // Extra Fuel LRC + warning
    setOut(panel, "extra_lrc_usg", d.extraLrcUsg.toFixed(1));

    const warnEl = q(panel, `[data-out="extra_warn"]`);
    if (warnEl) {
      const on = d.extraLrcUsg < 0;
      warnEl.textContent = on ? "ACHTUNG! Fuel nicht ausreichend, Werte korrigieren!" : "";
      warnEl.classList.toggle("is-on", on);
    }

    const extraValEl = q(panel, `[data-out="extra_lrc_usg"]`);
    if (extraValEl) extraValEl.classList.toggle("fuel-negative", d.extraLrcUsg < 0);

    setOut(panel, "extra_lrc_time", "");

    // Takeoff / Taxi / Block
    setOut(panel, "takeoff_usg", d.takeoffUsg.toFixed(1));
    setOut(panel, "takeoff_time", "");

    setOut(panel, "taxi_usg", d.taxiUsg.toFixed(1));
    setOut(panel, "taxi_time", "");

    setOut(panel, "block_usg_out", d.blockUsgIn.toFixed(1));
    setOut(panel, "block_time_out", "");

    // Trip + Company
    setOut(panel, "trip_company_usg", d.tripCompanyUsg.toFixed(1));
    setOut(panel, "trip_company_time", fmtHHMM(d.tripCompanyMin));

    // Landing
    setOut(panel, "landing_usg", d.landingUsg.toFixed(1));
    setOut(panel, "landing_time", "");

    // Remaining KPI
    setOut(panel, "rem_usg", d.remUsg.toFixed(1));

    setOut(panel, "end_nc", d.endNC);
    setOut(panel, "end_lrc", d.endLRC);
    setOut(panel, "end_mec", d.endMEC);
  }

  function syncAndRender() {
    syncTripInputsEnabled(panel);
    render();
  }

  panel.addEventListener("input", syncAndRender);
  panel.addEventListener("change", syncAndRender);

  document.addEventListener("click", (e) => {
    if (!e.target.classList?.contains("legToggle")) return;
    syncAndRender();
  });

  syncAndRender();
}