// Fuel Planning – Trip manuell, Rest automatisch

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
  TAXI_MIN: 0,
};

const CAP = {
  MAIN_DEFAULT: 44.0,
  AUX: 26.4,
};

function q(panel, sel) { return panel.querySelector(sel); }
function qa(panel, sel) { return Array.from(panel.querySelectorAll(sel)); }

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

function parseHHMM(s) {
  const t = String(s || "").trim();
  if (!t) return 0;

  // akzeptiere 120 -> 1:20? Nein. Wir erwarten hh:mm oder h:mm.
  const m = t.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (!m) return 0;

  const hh = Math.max(0, parseInt(m[1], 10));
  const mm = Math.max(0, parseInt(m[2], 10));
  return hh * 60 + Math.min(mm, 59);
}

function fmtHHMM(mins) {
  const m = Math.max(0, Math.round(mins));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

function setOut(panel, key, val) {
  const el = q(panel, `[data-out="${key}"]`);
  if (el) el.textContent = val;
}

function initStdBlockBehavior(panel) {
  const stdSel = q(panel, `[data-field="std_block"]`);
  const auxSel = q(panel, `[data-field="aux_on"]`);
  const blockInp = q(panel, `[data-field="block_usg"]`);
  if (!stdSel || !auxSel || !blockInp) return;

  function capacity() {
    const aux = String(auxSel.value) === "1" ? CAP.AUX : 0;
    return CAP.MAIN_DEFAULT + aux;
  }

  function apply() {
    const std = String(stdSel.value) === "1";
    if (std) {
      blockInp.value = String(capacity().toFixed(1)).replace(".", ",");
      blockInp.disabled = true;
    } else {
      blockInp.disabled = false;
      if (!String(blockInp.value || "").trim()) {
        blockInp.value = String(capacity().toFixed(1)).replace(".", ",");
      }
    }
  }

  stdSel.addEventListener("change", apply);
  auxSel.addEventListener("change", apply);

  apply();
}

export function initFuelPlanning() {
  const panel = document.getElementById("fuelPanel");
  if (!panel) return;

  initStdBlockBehavior(panel);

  function read() {
    const profile = (q(panel, `[data-field="profile"]`)?.value || "IFR").toUpperCase();
    const auxOn = String(q(panel, `[data-field="aux_on"]`)?.value || "0") === "1";

    const cap = CAP.MAIN_DEFAULT + (auxOn ? CAP.AUX : 0);

    const blockUsg = toNum(q(panel, `[data-field="block_usg"]`)?.value);

    // Trip (manual)
    const tripUsg = [1,2,3,4].map(n => toNum(q(panel, `[data-field="leg${n}_trip_usg"]`)?.value));
    const tripMin = [1,2,3,4].map(n => parseHHMM(q(panel, `[data-field="leg${n}_trip_time"]`)?.value));

    const tripUsgSum = tripUsg.reduce((a,b)=>a+b,0);
    const tripMinSum = tripMin.reduce((a,b)=>a+b,0);

    // Approaches (counts)
    const nIFR = clampInt(q(panel, `[data-field="appr_ifr_n"]`)?.value);
    const nVFR = clampInt(q(panel, `[data-field="appr_vfr_n"]`)?.value);

    const apprUsg = nIFR * FIX.IFR_APPR_USG + nVFR * FIX.VFR_APPR_USG;
    const apprMin = nIFR * FIX.IFR_APPR_MIN + nVFR * FIX.VFR_APPR_MIN;

    // Company fuel = approaches sum
    const companyUsg = apprUsg;
    const companyMin = apprMin;

    // Contingency = 5% of (Trip + Company)
    const contUsg = 0.05 * (tripUsgSum + companyUsg);
    const contMin = 0.05 * (tripMinSum + companyMin);

    // Alternate = log + 2.0
    const altLogUsg = toNum(q(panel, `[data-field="alt_usg_log"]`)?.value);
    const altUsg = altLogUsg + FIX.ALT_EXTRA_USG;
    const altMin = parseHHMM(q(panel, `[data-field="alt_time"]`)?.value);

    // Reserve fixed by profile
    const resUsg = profile === "VFR" ? FIX.RES_VFR_USG : FIX.RES_IFR_USG;
    const resMin = profile === "VFR" ? FIX.RES_VFR_MIN : FIX.RES_IFR_MIN;

    // Taxi fixed
    const taxiUsg = FIX.TAXI_USG;
    const taxiMin = FIX.TAXI_MIN;

    const reqUsg =
      tripUsgSum + companyUsg + contUsg + altUsg + resUsg + taxiUsg;

    const reqMin =
      tripMinSum + companyMin + contMin + altMin + resMin + taxiMin;

    const remUsg = blockUsg - reqUsg;

    function endurance(rate) {
      if (!Number.isFinite(remUsg) || rate <= 0) return "0:00";
      const mins = (remUsg / rate) * 60;
      return fmtHHMM(mins);
    }

    return {
      cap,
      blockUsg,

      tripUsgSum,
      tripMinSum,

      companyUsg,
      companyMin,

      contUsg,
      contMin,

      altUsg,
      altMin,

      resUsg,
      resMin,

      taxiUsg,
      taxiMin,

      reqUsg,
      reqMin,

      remUsg,

      endNC: endurance(BURN.NC),
      endLRC: endurance(BURN.LRC),
      endMEC: endurance(BURN.MEC),
    };
  }

  function render() {
    const d = read();

    setOut(panel, "cap_usg", d.cap.toFixed(1));
    setOut(panel, "trip_usg", d.tripUsgSum.toFixed(1));
    setOut(panel, "trip_time", fmtHHMM(d.tripMinSum));

    setOut(panel, "company_usg", d.companyUsg.toFixed(1));
    setOut(panel, "company_time", fmtHHMM(d.companyMin));

    setOut(panel, "cont_usg", d.contUsg.toFixed(1));
    setOut(panel, "cont_time", fmtHHMM(d.contMin));

    setOut(panel, "alt_usg", d.altUsg.toFixed(1));
    setOut(panel, "alt_time_out", fmtHHMM(d.altMin));

    setOut(panel, "res_usg", d.resUsg.toFixed(1));
    setOut(panel, "res_time", fmtHHMM(d.resMin));

    setOut(panel, "taxi_usg", d.taxiUsg.toFixed(1));
    setOut(panel, "taxi_time", fmtHHMM(d.taxiMin));

    setOut(panel, "req_usg", d.reqUsg.toFixed(1));
    setOut(panel, "req_time", fmtHHMM(d.reqMin));

    setOut(panel, "rem_usg", d.remUsg.toFixed(1));

    setOut(panel, "end_nc", d.endNC);
    setOut(panel, "end_lrc", d.endLRC);
    setOut(panel, "end_mec", d.endMEC);
  }

  // live updates
  panel.addEventListener("input", render);
  panel.addEventListener("change", render);

  // initial
  render();
}