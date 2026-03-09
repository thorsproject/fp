// performance.js

import { qs, qsa, SEL } from "./ui/index.js";

let runwayData = {};

// ---------- helpers ----------
function formatDateDE(isoDate) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("de-DE");
}

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function syncAiracHeader() {
  const el = document.getElementById("performanceAiracStatus");
  if (!el) return;

  const meta = runwayData?._meta || {};
  const validUntil = meta.airac_valid_until || "";

  el.classList.remove("is-expired");

  if (!validUntil) {
    el.textContent = "";
    return;
  }

  if (todayIsoLocal() > validUntil) {
    el.textContent = "AIRAC-Daten abgelaufen. Bitte in Settings aktualisieren.";
    el.classList.add("is-expired");
    return;
  }

  el.textContent = `AIRAC-Daten gültig bis: ${formatDateDE(validUntil)}`;
}

function normIcao(v = "") {
  return String(v).trim().toUpperCase();
}

function parseNum(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function formatNum(v) {
  if (!Number.isFinite(v)) return "";
  return String(v).replace(".", ",");
}

function setOut(name, value) {
  const el = qs(`[data-out="${name}"]`);
  if (!el) return;
  el.textContent = value ?? "";
}

function clearField(name) {
  const el = qs(`[data-field="${name}"]`);
  if (!el) return;
  el.value = "";
}

function getField(name) {
  return qs(`[data-field="${name}"]`);
}

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

function getRunwaysForIcao(icao) {
  const airport = runwayData[normIcao(icao)];
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

  if (prev && runways.includes(prev)) {
    selectEl.value = prev;
  }
}

function applyDeclaredDistances(icao, rwy, { toraField, ldaField } = {}) {
  const data = runwayData?.[normIcao(icao)]?.runways?.[rwy];
  if (!data) return;

  if (toraField) {
    const el = getField(toraField);
    if (el) el.value = data.tora ?? "";
  }

  if (ldaField) {
    const el = getField(ldaField);
    if (el) el.value = data.lda ?? "";
  }
}

// ---------- legs -> performance ----------
function getLastActiveLegFrame() {
  const frames = qsa(SEL.legs.frames);
  if (!frames.length) return null;

  let lastActive = frames[0] || null;

  for (let i = 1; i < frames.length; i++) {
    const legNum = i + 1;
    const btn = qs(SEL.legs.toggleByLeg(legNum));
    const isActive = btn?.dataset?.state !== "on";
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

  const depIcao = normIcao(firstFrom?.value || "");
  const destIcao = normIcao(lastTo?.value || "");

  const toIcao = getField("to_icao");
  const rtIcao = getField("rt_icao");
  const ldIcao = getField("ld_icao");

  if (toIcao) toIcao.value = depIcao;
  if (rtIcao) rtIcao.value = depIcao; // Return/Div = departure airfield
  if (ldIcao) ldIcao.value = destIcao;
}

// ---------- runway selects ----------
function syncRunwaySelectsFromIcao() {
  const toIcao = normIcao(getField("to_icao")?.value || "");
  const ldIcao = normIcao(getField("ld_icao")?.value || "");

  fillRunwaySelect(getField("to_rwy"), getRunwaysForIcao(toIcao));
  fillRunwaySelect(getField("ld_rwy"), getRunwaysForIcao(ldIcao));
}

function syncDeclaredDistances() {
  const toIcao = normIcao(getField("to_icao")?.value || "");
  const rtIcao = normIcao(getField("rt_icao")?.value || "");
  const ldIcao = normIcao(getField("ld_icao")?.value || "");

  const toRwy = getField("to_rwy")?.value || "";
  const ldRwy = getField("ld_rwy")?.value || "";

  clearField("to_tora");
  clearField("ld_lda");
  setOut("rt_rwy", "");
  setOut("rt_lda", "");

  if (toIcao && toRwy) {
    applyDeclaredDistances(toIcao, toRwy, {
      toraField: "to_tora",
    });

    // RETURN/DIV übernimmt TAKEOFF RWY + LDA vom Departure Airfield
    setOut("rt_rwy", toRwy);

    const rtData = runwayData?.[rtIcao]?.runways?.[toRwy];
    if (rtData?.lda != null) {
      setOut("rt_lda", String(rtData.lda));
    }
  }

  if (ldIcao && ldRwy) {
    applyDeclaredDistances(ldIcao, ldRwy, {
      ldaField: "ld_lda",
    });
  }
}

// ---------- RT LM ----------
function syncReturnLm() {
  const tom = parseNum(getField("to_tom")?.value || "");
  const eosid = getField("rt_eosid")?.value || "";

  if (!Number.isFinite(tom) || !eosid) {
    setOut("rt_lm", "");
    return;
  }

  const minus =
    eosid === "IFR" || eosid === "IFR/VFR OPT"
      ? 3
      : 1;

  setOut("rt_lm", formatNum(tom - minus));
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
  syncAiracHeader();
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