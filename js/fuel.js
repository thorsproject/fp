const CFG = {
  rates: { NC: 13.2, LRC: 10.3, MEC: 6.5 },
  approach: {
    IFR: { usg: 3.0, min: 20 },
    VFR: { usg: 1.0, min: 5 },
  },
  finalReserve: {
    IFR: { usg: 4.9, min: 45 },
    VFR: { usg: 3.3, min: 30 },
  },
  contingencyPct: 0.05,
  alternateAddUSG: 2.0,
  taxiUSG: 1.0,
  tanks: { main: 44.0, aux: 26.4 },
};

// ---------- helpers ----------
function parseUSG(v) {
  if (v == null) return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function fmtUSG(n) {
  const val = Number.isFinite(n) ? n : 0;
  return val.toFixed(1).replace(".", ",");
}
function hoursToHHMM(hours) {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
function minToHHMM(min) {
  const totalMin = Math.max(0, Math.round(min));
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
function getIn(key) {
  return document.querySelector(`#view-fuel [data-field="${key}"]`);
}
function getOut(key) {
  return document.querySelector(`#view-fuel [data-out="${key}"]`);
}
function setOut(key, text) {
  const el = getOut(key);
  if (el) el.textContent = text;
}
function sumInputs(keys) {
  return keys.reduce((acc, k) => acc + parseUSG(getIn(k)?.value), 0);
}

// ---------- main ----------
export function initFuelPlanning() {
  function recalc() {
    // --- Inputs ---
    const trip = sumInputs(["trip_leg1", "trip_leg2", "trip_leg3", "trip_leg4"]);
    const company = parseUSG(getIn("company_usg")?.value);

    const altLog = parseUSG(getIn("alt_log_usg")?.value); // aus Log
    const altTotal = altLog + CFG.alternateAddUSG;

    const blockStd = (getIn("block_std")?.value || "yes") === "yes"; // yes/no
    const auxOn = (getIn("aux_on")?.value || "yes") === "yes"; // yes/no
    const auxUSG = auxOn ? CFG.tanks.aux : 0;
    const blockFree = parseUSG(getIn("block_free_usg")?.value);
    const blockUSG = blockStd ? (CFG.tanks.main + auxUSG) : blockFree;

    // --- Fixed additions ---
 // --- Approaches: Anzahl * Fixwert ---
    const apprIFR = num(q('[data-field="appr_ifr_n"]').value);
    const apprVFR = num(q('[data-field="appr_vfr_n"]').value);

    const fuelIFR = apprIFR * CFG.ifrAppFuel;
    const fuelVFR = apprVFR * CFG.vfrAppFuel;

    const timeIFR = apprIFR * CFG.ifrAppMin;
    const timeVFR = apprVFR * CFG.vfrAppMin;

    const companyUSG = fuelIFR + fuelVFR;
    const companyMin = timeIFR + timeVFR;

    setOut("company_usg", fmtUSG(companyUSG));
    setOut("company_time", minToHHMM(companyMin));

    const finalReserveUSG = frIFR.usg + frVFR.usg;
    const finalReserveMin = frIFR.min + frVFR.min;

    // --- Contingency: 5% von (Trip + Company + Approaches) ---
    const contingencyBase = trip + company;
    const contingency = contingencyBase * CFG.contingencyPct;

    // --- Planned Takeoff Fuel (PTO) ---
    // PTO = Trip + Company + Contingency + AlternateTotal + Approaches + FinalReserve + Taxi
    const plannedTakeoff =
      trip +
      company +
      contingency +
      altTotal +
      approachesUSG +
      finalReserveUSG +
      CFG.taxiUSG;

    // --- Landing Fuel (aus Block) ---
    // Landing = Block - (Trip + Company)  (damit sieht man "was übrig bleibt nach Trip+Company")
    const landing = blockUSG - (trip + company);

    // --- Zeiten ---
    const tripTime = hoursToHHMM(trip / CFG.rates.NC);
    const companyTime = hoursToHHMM(company / CFG.rates.NC);
    const contingencyTime = hoursToHHMM(contingency / CFG.rates.NC);

    const altTime = hoursToHHMM(altTotal / CFG.rates.NC);

    // Approaches + FR sind Fixzeiten
    const approachesTime = minToHHMM(approachesMin);
    const finalReserveTime = minToHHMM(finalReserveMin);

    const taxiTime = hoursToHHMM(CFG.taxiUSG / CFG.rates.NC);

    const ptoTime = hoursToHHMM(plannedTakeoff / CFG.rates.NC);
    const blockTime = hoursToHHMM(blockUSG / CFG.rates.NC);
    const landingTime = hoursToHHMM(landing / CFG.rates.NC);

    // --- Outputs ---
    setOut("trip_usg", fmtUSG(trip));
    setOut("trip_time", tripTime);

    setOut("appr_ifr_usg", fmtUSG(ifrApproachUSG));
    setOut("appr_ifr_time", minToHHMM(ifrApproachMin));
    setOut("appr_vfr_usg", fmtUSG(vfrApproachUSG));
    setOut("appr_vfr_time", minToHHMM(vfrApproachMin));

    setOut("appr_usg", fmtUSG(approachesUSG));
    setOut("appr_time", minToHHMM(approachesMin));

    setOut("company_usg", fmtUSG(company));
    setOut("company_time", companyTime);

    setOut("cont_usg", fmtUSG(contingency));
    setOut("cont_time", contingencyTime);

    setOut("alt_usg", fmtUSG(altTotal));
    setOut("alt_time", altTime);

    setOut("appr_usg", fmtUSG(approachesUSG));
    setOut("appr_time", approachesTime);

    setOut("fr_usg", fmtUSG(finalReserveUSG));
    setOut("fr_time", finalReserveTime);

    setOut("taxi_usg", fmtUSG(CFG.taxiUSG));
    setOut("taxi_time", taxiTime);

    setOut("pto_usg", fmtUSG(plannedTakeoff));
    setOut("pto_time", ptoTime);

    setOut("block_usg", fmtUSG(blockUSG));
    setOut("block_time", blockTime);

    setOut("landing_usg", fmtUSG(landing));
    setOut("landing_time", landingTime);

    // rechts: Tanks Anzeige
    setOut("main_cap", fmtUSG(CFG.tanks.main));
    setOut("aux_cap", fmtUSG(auxUSG));
  }

  // Events: alle Inputs in Fuel-View triggern recalc
  document.addEventListener("input", (e) => {
    if (!document.querySelector("#view-fuel")?.classList.contains("is-active")) return;
    if (e.target && e.target.closest("#view-fuel") && e.target.dataset.field) recalc();
  });
  document.addEventListener("change", (e) => {
    if (e.target && e.target.closest("#view-fuel") && e.target.dataset.field) recalc();
  });

  // Buttons (IDs musst du in deiner Fuel-HTML vergeben)
  document.getElementById("fuelClearAll")?.addEventListener("click", () => {
    document.querySelectorAll("#view-fuel [data-field]").forEach((el) => {
      if (el.tagName === "SELECT") return; // selects lassen
      el.value = "";
    });
    recalc();
  });

  // initial
  recalc();
}