// performance.js

import { qs, qsa, SEL } from "./ui/index.js";
import { loadAirportWx } from "./metar.js";
import { loadPerformanceState, savePerformanceState } from "./storage.js";

let runwayData = {};

const PERF_FIELDS = [
  "to_rwy",
  "to_tom",
  "to_roll",
  "to_asd",
  "to_stop_margin",

  "rt_oei_roc",
  "rt_oei_sc",
  "rt_eosid",
  "rt_roll",
  "rt_ld_abn",
  "rt_stop_margin",

  "ld_rwy",
  "ld_lm",
  "ld_flaps",
  "ld_roll",
  "ld_ld",
  "ld_stop_margin"
];

function restorePerfFields() {
  const state = loadPerformanceState();

  for (const name of PERF_FIELDS) {
    const el = getField(name);
    if (!el) continue;
    if (state[name] == null) continue;

    el.value = state[name];
  }
}

function bindPerfPersistence() {

  for (const name of PERF_FIELDS) {
    const el = getField(name);
    if (!el) continue;

    const save = () => {
      const state = loadPerformanceState();
      state[name] = el.value || "";
      savePerformanceState(state);
    };

    el.addEventListener("input", save);
    el.addEventListener("change", save);
  }
}

function bindPerformanceFormatting() {
  // Meter
  [
    "to_tora", "to_roll", "to_asd", "to_stop_margin",
    "rt_lda", "rt_roll", "rt_ld_abn", "rt_stop_margin",
    "ld_lda", "ld_roll", "ld_ld", "ld_stop_margin"
  ].forEach((name) => bindUnitField(name, (v) => formatWithSuffix(v, "m")));

  // Temperatur
  ["to_temp", "ld_temp"].forEach((name) =>
    bindUnitField(name, (v) => formatWithSuffix(v, "°C"))
  );

  // QNH
  ["to_qnh", "ld_qnh"].forEach((name) =>
    bindUnitField(name, (v) => formatWithSuffix(v, "hpa"))
  );

  // KG
  ["to_tom", "rt_lm", "ld_lm"].forEach((name) =>
    bindUnitField(name, (v) => formatWithSuffix(v, "kg"))
  );

  // ROC
  bindUnitField("rt_oei_roc", (v) => formatWithSuffix(v, "ft/Min"));

  // Wind
  ["to_wind", "ld_wind"].forEach((name) =>
    bindUnitField(name, (v) => formatWind(v))
  );

  // Standardwert für OEI SC
  const oeiSc = getField("rt_oei_sc");
  if (oeiSc) {
    ensureDefaultValue(oeiSc, ">10000 ft");

    oeiSc.addEventListener("blur", () => {
      ensureDefaultValue(oeiSc, ">10000 ft");
    });
  }
}

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

function getWxOfflineNotice(wx) {
  return wx?.offlineNotice || "";
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

function stripUnit(val = "") {
  return String(val)
    .replace(/\s*m$/i, "")
    .replace(/\s*°c$/i, "")
    .replace(/\s*hpa$/i, "")
    .replace(/\s*ft\/min$/i, "")
    .replace(/\s*kg$/i, "")
    .trim();
}

function formatWithSuffix(val, suffix) {
  const raw = stripUnit(val);
  if (!raw) return "";
  return `${raw} ${suffix}`;
}

function formatWind(val = "") {
  const raw = String(val).trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";

  // schon formatiert
  if (/^\d{3}\/\d{2,3}(G\d{2,3})?$/.test(raw)) return raw;

  // 23015 oder 230015
  const m = raw.match(/^(\d{3})(\d{2,3})(G\d{2,3})?$/);
  if (!m) return raw;

  return `${m[1]}/${m[2]}${m[3] || ""}`;
}

function ensureDefaultValue(el, defaultValue) {
  if (!el) return;
  const v = String(el.value || "").trim();
  if (!v) el.value = defaultValue;
}

function bindUnitField(name, formatter) {
  const el = getField(name);
  if (!el) return;

  el.addEventListener("focus", () => {
    el.value = stripUnit(el.value);
  });

  el.addEventListener("blur", () => {
    el.value = formatter(el.value);
  });

  el.addEventListener("change", () => {
    el.value = formatter(el.value);
  });
}
// ---------- Ende helpers ----------

async function syncPerformanceWeather() {
  const toIcao = normIcao(getField("to_icao")?.value || "");
  const ldIcao = normIcao(getField("ld_icao")?.value || "");

  setPerfWxOut("perf_wx_to_icao", toIcao);
  setPerfWxOut("perf_wx_ld_icao", ldIcao);

  setPerfWxOut("perf_wx_to_metar", "");
  setPerfWxOut("perf_wx_to_taf", "");
  setPerfWxOut("perf_wx_to_note", "");
  setPerfWxOut("perf_wx_ld_metar", "");
  setPerfWxOut("perf_wx_ld_taf", "");
  setPerfWxOut("perf_wx_ld_note", "");

  if (toIcao) {
    try {
      const wx = await loadAirportWx(toIcao);
      setPerfWxOut("perf_wx_to_metar", formatPerfMetar(wx));
      setPerfWxOut("perf_wx_to_taf", formatPerfTaf(wx));
      setPerfWxOut("perf_wx_to_note", getWxOfflineNotice(wx));
    } catch {
      setPerfWxOut("perf_wx_to_metar", "METAR konnte nicht geladen werden");
      setPerfWxOut("perf_wx_to_taf", "TAF konnte nicht geladen werden");
      setPerfWxOut("perf_wx_to_note", "");
    }
  }

  if (ldIcao) {
    try {
      const wx = await loadAirportWx(ldIcao);
      setPerfWxOut("perf_wx_ld_metar", formatPerfMetar(wx));
      setPerfWxOut("perf_wx_ld_taf", formatPerfTaf(wx));
      setPerfWxOut("perf_wx_ld_note", getWxOfflineNotice(wx));
    } catch {
      setPerfWxOut("perf_wx_ld_metar", "METAR konnte nicht geladen werden");
      setPerfWxOut("perf_wx_ld_taf", "TAF konnte nicht geladen werden");
      setPerfWxOut("perf_wx_ld_note", "");
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
  const m = String(raw).toUpperCase().match(/\b((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?)KT\b/);
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
  const m = txt.match(/\bTAF(?:\s+\w+)?\s+[A-Z]{4}\s+\d{6}Z\s+\d{4}\/\d{4}\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?)KT\b/);
  return m ? m[1] : "";
}

function parseTafWindForEta(rawTaf = "", etaHm = null) {
  const txt = String(rawTaf).toUpperCase();
  if (!txt) return "";

  let selectedWind = parseTafBaseWind(txt);

  if (!etaHm) {
    return selectedWind;
  }

  // Gültigkeit direkt aus dem TAF lesen, z. B. 1100/1112 -> Tag 11
  const validityMatch = txt.match(/\b\d{6}Z\s+(\d{2})\d{2}\/(\d{2})\d{2}\b/);
  if (!validityMatch) {
    return selectedWind;
  }

  const tafDayFrom = Number(validityMatch[1]);
  const etaAbs = absMinutes(tafDayFrom, etaHm.hh, etaHm.mm);

  // BECMG: neue Bedingungen gelten ab ENDZEIT
  const becmgRe =
    /\bBECMG\s+(\d{2})(\d{2})\/(\d{2})(\d{2})\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?)KT\b/g;

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

  // FM: gilt ab exakt diesem Zeitpunkt
  const fmRe =
    /\bFM(\d{2})(\d{2})(\d{2})\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?)KT\b/g;

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
  setFieldIfExists("to_wind", formatWind(parseMetarWind(rawMetar)));
  setFieldIfExists("to_temp", formatWithSuffix(parseMetarTemp(rawMetar), "°C"));
  setFieldIfExists("to_qnh", formatWithSuffix(parseMetarQnh(rawMetar), "hpa"));
}

function writeLandingTafWindToField(rawTaf) {
  const lastLeg = getLastActiveLegFrameForPerf();
  const etaEl = lastLeg ? qs(SEL.legs.eta, lastLeg) : null;

  const etaHm = normalizeHm(etaEl?.value || "");
  const wind = parseTafWindForEta(rawTaf, etaHm);

  setFieldIfExists("ld_wind", formatWind(wind));
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
    // console.error("[performance] runway data load failed:", err);
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
    if (el) el.value = formatWithSuffix(data.tora ?? "", "m");
  }

  if (ldaField) {
    const el = getField(ldaField);
    if (el) el.value = formatWithSuffix(data.lda ?? "", "m");
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

  for (let i = frames.length - 1; i >= 0; i--) {
    const legNum = i + 1;
    const frame = frames[i];

    if (!isLegFrameActive(frame, legNum)) continue;

    const toEl = qs(SEL.legs.aeroTo, frame);
    const toVal = normIcao(toEl?.value || "");

    if (toVal) return frame;
  }

  return frames[0] || null;
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
      setOut("rt_lda", formatWithSuffix(rtData.lda, "m"));
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

  setOut("rt_lm", formatWithSuffix(formatNum(tom - minus), "kg"));
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
  restorePerfFields();
  bindPerformanceFormatting();
  syncPerformanceDerived();
  bindPerfPersistence();

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