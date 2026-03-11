// performance.js

import { qs, qsa, SEL } from "./ui/index.js";
import { loadAirportWx } from "./metar.js";

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

function setPerfWxOut(name, value) {
  const el = qs(`[data-out="${name}"]`);
  if (!el) return;
  el.textContent = value ?? "";
}

function formatPerfMetar(wx) {
  return (
    wx?.metar?.rawOb ||
    wx?.metar?.raw_text ||
    "Kein aktuelles METAR verfügbar"
  );
}

function formatPerfTaf(wx) {
  return (
    wx?.taf?.rawTAF ||
    wx?.taf?.raw_text ||
    "Kein aktueller TAF verfügbar"
  );
}

async function syncPerformanceWeather() {
  const toIcao = normIcao(getField("to_icao")?.value || "");
  const ldIcao = normIcao(getField("ld_icao")?.value || "");

  setPerfWxOut("perf_wx_to_icao", toIcao);
  setPerfWxOut("perf_wx_ld_icao", ldIcao);

  setPerfWxOut("perf_wx_to_metar", "");
  setPerfWxOut("perf_wx_to_taf", "");
  setPerfWxOut("perf_wx_ld_metar", "");
  setPerfWxOut("perf_wx_ld_taf", "");

  if (toIcao) {
    try {
      const wx = await loadAirportWx(toIcao);
      setPerfWxOut("perf_wx_to_metar", formatPerfMetar(wx));
      setPerfWxOut("perf_wx_to_taf", formatPerfTaf(wx));
    } catch {
      setPerfWxOut("perf_wx_to_metar", "METAR konnte nicht geladen werden");
      setPerfWxOut("perf_wx_to_taf", "TAF konnte nicht geladen werden");
    }
  }

  if (ldIcao) {
    try {
      const wx = await loadAirportWx(ldIcao);
      setPerfWxOut("perf_wx_ld_metar", formatPerfMetar(wx));
      setPerfWxOut("perf_wx_ld_taf", formatPerfTaf(wx));
    } catch {
      setPerfWxOut("perf_wx_ld_metar", "METAR konnte nicht geladen werden");
      setPerfWxOut("perf_wx_ld_taf", "TAF konnte nicht geladen werden");
    }
  }
}

let perfWxSyncToken = 0;

function normalizeHm(raw = "") {
  const s = String(raw).trim().replace(":", "");
  if (!/^\d{4}$/.test(s)) return null;

  const hh = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));

  if (hh > 23 || mm > 59) return null;
  return { hh, mm };
}

function absMinutes(day, hh, mm = 0) {
  return day * 1440 + hh * 60 + mm;
}

function getLastActiveLegFrameForPerf() {
  const frames = qsa(SEL.legs.frames);
  if (!frames.length) return null;

  let lastActive = frames[0] || null;

  for (let i = 1; i < frames.length; i++) {
    const legNum = i + 1;
    const btn = qs(SEL.legs.toggleByLeg(legNum));
    const state = String(btn?.dataset?.state || "").toLowerCase();

    if (state !== "off") {
      lastActive = frames[i];
    }
  }

  return lastActive;
}

function getRouteDateDay() {
  const routeDate =
    document.getElementById("dateInput")?.value ||
    qs('[data-field="date"]')?.value ||
    "";

  const m = String(routeDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  return Number(m[3]);
}

function parseMetarWind(raw = "") {
  const m = String(raw).toUpperCase().match(/\b((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?KT)\b/);
  return m ? m[1] : "";
}

function parseMetarTemp(raw = "") {
  const m = String(raw).toUpperCase().match(/\b(M?\d{2})\/M?\d{2}\b/);
  return m ? m[1].replace(/^M/, "-") : "";
}

function parseMetarQnh(raw = "") {
  const m = String(raw).toUpperCase().match(/\bQ(\d{4})\b/);
  return m ? m[1] : "";
}

function parseTafBaseWind(raw = "") {
  const txt = String(raw).toUpperCase();

  // TAF ICAO DDHHMMZ DDHH/DDHH WIND...
  const m = txt.match(/\bTAF(?:\s+\w+)?\s+[A-Z]{4}\s+\d{6}Z\s+\d{4}\/\d{4}\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?KT)\b/);
  return m ? m[1] : "";
}

function parseTafWindForEta(rawTaf = "", etaHm = null, routeDay = null) {
  const txt = String(rawTaf).toUpperCase();
  if (!txt) return "";

  let selectedWind = parseTafBaseWind(txt);

  if (!etaHm || routeDay == null) {
    return selectedWind;
  }

  const etaAbs = absMinutes(routeDay, etaHm.hh, etaHm.mm);

  // 1) BECMG: neue Bedingungen gelten ab ENDZEIT
  const becmgRe = /\bBECMG\s+(\d{2})(\d{2})\/(\d{2})(\d{2})\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?KT)\b/g;
  let m;

  while ((m = becmgRe.exec(txt)) !== null) {
    const endDay = Number(m[3]);
    const endHour = Number(m[4]);
    const wind = m[5];

    const endAbs = absMinutes(endDay, endHour, 0);

    if (etaAbs >= endAbs) {
      selectedWind = wind;
    }
  }

  // 2) FM: gilt ab exakt diesem Zeitpunkt und überschreibt alles davor
  const fmRe = /\bFM(\d{2})(\d{2})(\d{2})\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?KT)\b/g;

  while ((m = fmRe.exec(txt)) !== null) {
    const day = Number(m[1]);
    const hour = Number(m[2]);
    const minute = Number(m[3]);
    const wind = m[4];

    const fmAbs = absMinutes(day, hour, minute);

    if (etaAbs >= fmAbs) {
      selectedWind = wind;
    }
  }

  return selectedWind;
}function parseTafWindForEta(rawTaf = "", etaHm = null, routeDay = null) {
  const txt = String(rawTaf).toUpperCase();
  if (!txt) return "";

  let selectedWind = parseTafBaseWind(txt);

  if (!etaHm || routeDay == null) {
    return selectedWind;
  }

  const etaAbs = absMinutes(routeDay, etaHm.hh, etaHm.mm);

  // 1) BECMG: neue Bedingungen gelten ab ENDZEIT
  const becmgRe = /\bBECMG\s+(\d{2})(\d{2})\/(\d{2})(\d{2})\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?KT)\b/g;
  let m;

  while ((m = becmgRe.exec(txt)) !== null) {
    const endDay = Number(m[3]);
    const endHour = Number(m[4]);
    const wind = m[5];

    const endAbs = absMinutes(endDay, endHour, 0);

    if (etaAbs >= endAbs) {
      selectedWind = wind;
    }
  }

  // 2) FM: gilt ab exakt diesem Zeitpunkt und überschreibt alles davor
  const fmRe = /\bFM(\d{2})(\d{2})(\d{2})\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?KT)\b/g;

  while ((m = fmRe.exec(txt)) !== null) {
    const day = Number(m[1]);
    const hour = Number(m[2]);
    const minute = Number(m[3]);
    const wind = m[4];

    const fmAbs = absMinutes(day, hour, minute);

    if (etaAbs >= fmAbs) {
      selectedWind = wind;
    }
  }

  return selectedWind;
}

function setFieldIfExists(name, value) {
  const el = getField(name);
  if (!el) return;
  el.value = value ?? "";
}

// Feldnamen hier anpassen, falls sie bei dir anders heißen
function writeTakeoffMetarToFields(rawMetar) {
  setFieldIfExists("to_wind", parseMetarWind(rawMetar));
  setFieldIfExists("to_temp", parseMetarTemp(rawMetar));
  setFieldIfExists("to_qnh", parseMetarQnh(rawMetar));
}

function writeLandingTafWindToField(rawTaf) {
  const lastLeg = getLastActiveLegFrameForPerf();
  const etaEl = lastLeg ? qs(SEL.legs.eta, lastLeg) : null;

  const etaHm = normalizeHm(etaEl?.value || "");
  const routeDay = getRouteDateDay();

  const wind = parseTafWindForEta(rawTaf, etaHm, routeDay);
  setFieldIfExists("ld_wind", wind);
}

async function syncPerformanceWeatherFields() {
  const myToken = ++perfWxSyncToken;

  const toIcao = normIcao(getField("to_icao")?.value || "");
  const ldIcao = normIcao(getField("ld_icao")?.value || "");

  if (!toIcao) {
    setFieldIfExists("to_wind", "");
    setFieldIfExists("to_temp", "");
    setFieldIfExists("to_qnh", "");
  }

  if (!ldIcao) {
    setFieldIfExists("ld_wind", "");
  }

  if (toIcao) {
    try {
      const wx = await loadAirportWx(toIcao);
      if (myToken !== perfWxSyncToken) return;

      const rawMetar = wx?.metar?.rawOb || wx?.metar?.raw_text || "";
      writeTakeoffMetarToFields(rawMetar);
    } catch {
      if (myToken !== perfWxSyncToken) return;
      setFieldIfExists("to_wind", "");
      setFieldIfExists("to_temp", "");
      setFieldIfExists("to_qnh", "");
    }
  }

  if (ldIcao) {
    try {
      const wx = await loadAirportWx(ldIcao);
      if (myToken !== perfWxSyncToken) return;

      const rawTaf = wx?.taf?.rawTAF || wx?.taf?.raw_text || "";
      writeLandingTafWindToField(rawTaf);
    } catch {
      if (myToken !== perfWxSyncToken) return;
      setFieldIfExists("ld_wind", "");
    }
  }
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
function isLegActive(frame, legNum) {
  const btn = qs(SEL.legs.toggleByLeg(legNum));

  // Falls kein Toggle gefunden wird, Leg lieber als aktiv behandeln
  if (!btn) return true;

  const state = String(btn.dataset?.state || "").toLowerCase();

  if (state === "off" || state === "inactive" || state === "disabled") return false;
  if (state === "on" || state === "active" || state === "enabled") return true;

  if (btn.classList.contains("is-off")) return false;
  if (btn.classList.contains("is-inactive")) return false;
  if (btn.classList.contains("is-disabled")) return false;

  if (btn.classList.contains("is-on")) return true;
  if (btn.classList.contains("is-active")) return true;

  if (btn.getAttribute("aria-pressed") === "false") return false;
  if (btn.getAttribute("aria-pressed") === "true") return true;

  // Fallback: wenn Frame sichtbar ist, als aktiv behandeln
  if (frame && frame.classList.contains("is-hidden")) return false;

  return true;
}

function isLegFrameActive(frame, legNum) {
  if (!frame) return false;

  const toEl = qs(SEL.legs.aeroTo, frame);
  const fromEl = qs(SEL.legs.aeroFrom, frame);
  const btn = qs(SEL.legs.toggleByLeg(legNum));

  // 1) expliziter Toggle-State, falls vorhanden
  const state = String(btn?.dataset?.state || "").toLowerCase();
  if (state === "off" || state === "inactive" || state === "disabled") return false;
  if (state === "on" || state === "active" || state === "enabled") return true;

  // 2) disabled Inputs sind praktisch inaktiv
  if (toEl?.disabled && fromEl?.disabled) return false;

  // 3) versteckte Frames als inaktiv behandeln
  if (frame.classList.contains("is-hidden")) return false;
  if (frame.hidden) return false;
  if (frame.getAttribute("aria-hidden") === "true") return false;

  // 4) Fallback: aktiv
  return true;
}

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
export function syncPerformanceDerived() {
  syncPerformanceAirfields();
  syncRunwaySelectsFromIcao();
  syncDeclaredDistances();
  syncReturnLm();
  syncPerformanceWeather();
  syncPerformanceWeatherFields();
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