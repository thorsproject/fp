import { qs, qsa, SEL } from "./ui/index.js";

let runwayData = {};

// ---------- data ----------
async function loadRunwayData() {
  try {
    const res = await fetch("./data/performance_runways.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    runwayData = await res.json();
  } catch (err) {
    console.error("[performance] runway data load failed:", err);
    runwayData = {};
  }
}

// ---------- legs -> perf airfields ----------
function getLastActiveLegFrame() {
  const frames = qsa(SEL.legs.frames);
  if (!frames.length) return null;

  let lastActive = frames[0] || null;

  for (let i = 1; i < frames.length; i++) {
    const legNum = i + 1;
    const btn = qs(SEL.legs.toggleByLeg(legNum));
    const isActive = btn?.dataset?.state === "active";
    if (isActive) lastActive = frames[i];
  }

  return lastActive;
}

export function syncPerformanceAirfields() {
  const frames = qsa(SEL.legs.frames);
  if (!frames.length) return;

  const firstLeg = frames[0];
  const lastLeg = getLastActiveLegFrame();

  const firstFrom = firstLeg ? qs(SEL.legs.aeroFrom, firstLeg) : null;
  const lastTo = lastLeg ? qs(SEL.legs.aeroTo, lastLeg) : null;

  const depIcao = (firstFrom?.value || "").trim().toUpperCase();
  const destIcao = (lastTo?.value || "").trim().toUpperCase();

  const toIcao = qs('[data-field="to_icao"]');
  const rtIcao = qs('[data-field="rt_icao"]');
  const ldIcao = qs('[data-field="ld_icao"]');

  if (toIcao) toIcao.value = depIcao;
  if (rtIcao) rtIcao.value = depIcao;   // Return/Div = Departure Airfield
  if (ldIcao) ldIcao.value = destIcao;
}

// ---------- runway selects ----------
function getRunwaysForIcao(icao) {
  if (!icao) return [];
  const airport = runwayData[icao];
  if (!airport?.runways) return [];
  return Object.keys(airport.runways).sort();
}

function fillRunwaySelect(selectEl, runways) {
  if (!selectEl) return;

  const prev = selectEl.value;
  selectEl.innerHTML = '<option value="">RWY</option>';

  runways.forEach((rwy) => {
    const opt = document.createElement("option");
    opt.value = rwy;
    opt.textContent = rwy;
    selectEl.appendChild(opt);
  });

  if (runways.includes(prev)) {
    selectEl.value = prev;
  }
}

function applyDeclaredDistances(icao, rwy, { toraField, ldaField }) {
  const data = runwayData?.[icao]?.runways?.[rwy];
  if (!data) return;

  if (toraField) {
    const toraEl = qs(`[data-field="${toraField}"]`);
    if (toraEl) toraEl.value = data.tora ?? "";
  }

  if (ldaField) {
    const ldaEl = qs(`[data-field="${ldaField}"]`);
    if (ldaEl) ldaEl.value = data.lda ?? "";
  }
}

function clearField(fieldName) {
  const el = qs(`[data-field="${fieldName}"]`);
  if (el) el.value = "";
}

function syncRunwaySelectsFromIcao() {
  const toIcao = (qs('[data-field="to_icao"]')?.value || "").trim().toUpperCase();
  const rtIcao = (qs('[data-field="rt_icao"]')?.value || "").trim().toUpperCase();
  const ldIcao = (qs('[data-field="ld_icao"]')?.value || "").trim().toUpperCase();

  fillRunwaySelect(qs('[data-field="to_rwy"]'), getRunwaysForIcao(toIcao));
  fillRunwaySelect(qs('[data-field="rt_rwy"]'), getRunwaysForIcao(rtIcao));
  fillRunwaySelect(qs('[data-field="ld_rwy"]'), getRunwaysForIcao(ldIcao));
}

function syncDeclaredDistances() {
  const toIcao = (qs('[data-field="to_icao"]')?.value || "").trim().toUpperCase();
  const rtIcao = (qs('[data-field="rt_icao"]')?.value || "").trim().toUpperCase();
  const ldIcao = (qs('[data-field="ld_icao"]')?.value || "").trim().toUpperCase();

  const toRwy = qs('[data-field="to_rwy"]')?.value || "";
  const rtRwy = qs('[data-field="rt_rwy"]')?.value || "";
  const ldRwy = qs('[data-field="ld_rwy"]')?.value || "";

  clearField("to_tora");
  clearField("ld_lda");

  // optional: falls du Return später auch LDA/TORA anzeigen willst
  // clearField("rt_lda");
  // clearField("rt_tora");

  if (toIcao && toRwy) {
    applyDeclaredDistances(toIcao, toRwy, {
      toraField: "to_tora",
    });
  }

  if (ldIcao && ldRwy) {
    applyDeclaredDistances(ldIcao, ldRwy, {
      ldaField: "ld_lda",
    });
  }

  // Return/Div aktuell noch ohne declared-distance output
  // kann später leicht ergänzt werden
  void rtIcao;
  void rtRwy;
}

// ---------- LM logic ----------
function parseNum(val) {
  if (val == null) return NaN;
  const s = String(val).trim().replace(",", ".");
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function setOut(name, value) {
  const el = qs(`[data-out="${name}"]`);
  if (!el) return;
  el.textContent = value;
}

function syncReturnLm() {
  const tomVal = qs('[data-field="to_tom"]')?.value || "";
  const eosid = qs('[data-field="rt_eosid"]')?.value || "";

  const tom = parseNum(tomVal);
  if (!Number.isFinite(tom) || !eosid) {
    setOut("rt_lm", "");
    return;
  }

  const minus =
    eosid === "IFR" || eosid === "IFR/VFR OPT"
      ? 3
      : 1;

  const lm = tom - minus;
  setOut("rt_lm", String(lm).replace(".", ","));
}

// ---------- master sync ----------
function syncPerformanceDerived() {
  syncPerformanceAirfields();
  syncRunwaySelectsFromIcao();
  syncDeclaredDistances();
  syncReturnLm();
}

// ---------- init ----------
export async function initPerformance() {
  await loadRunwayData();

  syncPerformanceDerived();

  document.addEventListener("input", (e) => {
    if (e.target.closest(SEL.legs.container)) {
      syncPerformanceDerived();
      return;
    }

    const perfPanel = e.target.closest("#performancePanel");
    if (!perfPanel) return;

    if (e.target.matches('[data-field="to_tom"]')) {
      syncReturnLm();
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.closest(SEL.legs.container)) {
      syncPerformanceDerived();
      return;
    }

    const perfPanel = e.target.closest("#performancePanel");
    if (!perfPanel) return;

    if (
      e.target.matches('[data-field="to_rwy"]') ||
      e.target.matches('[data-field="rt_rwy"]') ||
      e.target.matches('[data-field="ld_rwy"]')
    ) {
      syncDeclaredDistances();
    }

    if (e.target.matches('[data-field="rt_eosid"]')) {
      syncReturnLm();
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(SEL.legs.toggle);
    if (!btn) return;

    queueMicrotask(() => {
      syncPerformanceDerived();
    });
  });
}