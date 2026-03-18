// performance.js

import { qs, qsa, SEL } from "./ui/index.js";
import { loadAirportWx } from "./metar.js";
import { loadPerformanceState, savePerformanceState } from "./storage.js";
import { getMilAirfieldsMeta, getAirfieldByIcao } from "./airfields.js";
import { BURN, FIX, CAP } from "./fuelConstants.js";

let runwayData = {};

const PERF_FIELDS = [
  "to_rwy",
  "to_tom",
  "to_roll",

  "rt_oei_roc",
  "rt_oei_sc",
  "rt_eosid",
  "rt_roll",
  "rt_ld_abn",

  "ld_rwy",
  "ld_lm",
  "ld_flaps",
  "ld_roll",
  "ld_ld",
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
  [
    "to_tora", "to_roll",
    "rt_lda", "rt_roll", "rt_ld_abn",
    "ld_lda", "ld_roll", "ld_ld",
  ].forEach((name) => bindUnitField(name, (v) => formatWithSuffix(v, "m")));

  ["to_temp", "ld_temp"].forEach((name) =>
    bindUnitField(name, (v) => formatWithSuffix(v, "°C"))
  );

  ["to_qnh", "ld_qnh"].forEach((name) =>
    bindUnitField(name, (v) => formatWithSuffix(v, "hpa"))
  );

  ["to_tom", "rt_lm", "ld_lm"].forEach((name) =>
    bindUnitField(name, (v) => formatWithSuffix(v, "kg"))
  );

  bindUnitField("rt_oei_roc", (v) => formatWithSuffix(v, "ft/Min"));

  ["to_wind", "ld_wind"].forEach((name) =>
    bindUnitField(name, (v) => formatWind(v))
  );

  const oeiSc = getField("rt_oei_sc");
  if (oeiSc) {
    ensureDefaultValue(oeiSc, ">10000 ft");
    oeiSc.addEventListener("blur", () => {
      ensureDefaultValue(oeiSc, ">10000 ft");
    });
  }
}

function applyPerformanceFormattingNow() {
  // m
  [
    "rt_roll",
    "rt_ld_abn",
    "ld_roll",
    "ld_ld",
  ].forEach((name) => {
    const el = getField(name);
    if (!el) return;
    el.value = formatWithSuffix(el.value, "m");
  });

  // kg
  [
    "to_tom",
    "ld_lm",
  ].forEach((name) => {
    const el = getField(name);
    if (!el) return;
    el.value = formatWithSuffix(el.value, "kg");
  });

  // ft/Min
  {
    const el = getField("rt_oei_roc");
    if (el) el.value = formatWithSuffix(el.value, "ft/Min");
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

// ---------- AIRAC Daten ---------
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

function formatIsoDateDE(value) {
  const s = String(value || "").trim();
  if (!s) return "";

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;

  return `${m[3]}.${m[2]}.${m[1]}`;
}

function applyMilValidTo() {
  const el = document.getElementById("performanceMilValidTo");
  if (!el) return;

  const meta = getMilAirfieldsMeta();
  const validTo = meta?.validTo || "";

  if (!validTo) {
    el.textContent = "";
    return;
  }

  el.textContent = `MIL gültig bis: ${formatIsoDateDE(validTo)}`;
}
// ---------- Ende AIRAC Daten ---------

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

function setDerivedOut(name, value) {
  setOut(name, value ?? "");
}

function getOutText(name) {
  const el = document.querySelector(`[data-out="${name}"]`);
  return (el?.textContent || "").trim();
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

  if (/^\d{3}\/\d{2,3}(G\d{2,3})?$/.test(raw)) return raw;

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

function getFlapsSpeedText(fieldName, flapsValue) {
  const v = String(flapsValue || "").trim().toUpperCase();

  if (fieldName === "to_flaps") {
    if (v === "UP") return "76 kt";
    if (v === "APP") return "74 kt";
    return "";
  }

  if (fieldName === "rt_flaps") {
    if (v === "UP") return "92 kt";
    if (v === "APP") return "88 kt";
    return "";
  }

  if (fieldName === "ld_flaps") {
    if (v === "UP") return "92 kt";
    if (v === "APP") return "88 kt";
    if (v === "LDG") return "86 kt";
    return "";
  }

  return "";
}

function numFromField(name) {
  const el = getField(name);
  if (!el) return 0;

  const raw = String(el.value || "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function numFromAny(name) {
  const fieldEl = getField(name);
  if (fieldEl) {
    const raw = String(fieldEl.value || "").replace(/[^\d.-]/g, "").trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  const outEl = document.querySelector(`[data-out="${name}"]`);
  if (outEl) {
    const raw = String(outEl.textContent || "").replace(/[^\d.-]/g, "").trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

function setFieldIfExists(name, value) {
  const el = getField(name);
  if (!el) return;
  el.value = value ?? "";
}

function syncFlapsSpeeds() {
  const toFlaps = getField("to_flaps")?.value || "";
  const rtFlaps = getField("rt_flaps")?.value || "";
  const ldFlaps = getField("ld_flaps")?.value || "";

  setOut("to_flaps_speed", getFlapsSpeedText("to_flaps", toFlaps));
  setOut("rt_flaps_speed", getFlapsSpeedText("rt_flaps", rtFlaps));
  setOut("ld_flaps_speed", getFlapsSpeedText("ld_flaps", ldFlaps));
}

function syncPerformanceMargins() {
  const to_roll = numFromField("to_roll");
  const rt_roll = numFromField("rt_roll");
  const to_tora = numFromField("to_tora");

  const rt_lda = numFromAny("rt_lda");
  const rt_ld_abn = numFromField("rt_ld_abn");
  const ld_ld = numFromField("ld_ld");

  const to_asd = to_roll + rt_roll + 100;
  setDerivedOut("to_asd", formatWithSuffix(to_asd, "m"));

  const to_stop = to_tora - to_asd;
  setDerivedOut("to_stop_margin", formatWithSuffix(to_stop, "m"));

  const rt_stop = rt_lda - rt_ld_abn;
  setDerivedOut("rt_stop_margin", formatWithSuffix(rt_stop, "m"));

  const ld_stop = rt_lda - ld_ld;
  setDerivedOut("ld_stop_margin", formatWithSuffix(ld_stop, "m"));
}

function bindMarginRecalc() {
  const sourceFields = [
    "to_roll",
    "rt_roll",
    "to_tora",
    "rt_ld_abn",
    "ld_ld",
  ];

  sourceFields.forEach((name) => {
    const el = getField(name);
    if (!el) return;

    const recalc = () => {
      syncPerformanceMargins();
    };

    el.addEventListener("input", recalc);
    el.addEventListener("change", recalc);
    el.addEventListener("blur", recalc);
  });
}

async function syncPerformanceWeather() {
  const toIcao = normIcao(getOutText("to_icao"));
  const ldIcao = normIcao(getOutText("ld_icao"));

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

      const sourceNote = getLandingTempQnhSourceNote();
      const offlineNote = getWxOfflineNotice(wx);

      setPerfWxOut(
        "perf_wx_ld_note",
        [sourceNote, offlineNote].filter(Boolean).join(" • ")
      );
    } catch {
      setPerfWxOut("perf_wx_ld_metar", "METAR konnte nicht geladen werden");
      setPerfWxOut("perf_wx_ld_taf", "TAF konnte nicht geladen werden");
      setPerfWxOut("perf_wx_ld_note", getLandingTempQnhSourceNote());
    }
  }
}

let perfWxSyncToken = 0;

const landingWxCache = new Map();

function getRouteDateIso() {
  const routeDate =
    document.getElementById("dateInput")?.value ||
    qs('[data-field="date"]')?.value ||
    "";

  const s = String(routeDate || "").trim();
  if (!s) return "";

  // 2026-03-15
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // 15.03.2026
  m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // 15.03.26
  m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

  // 15/03/2026
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // 15/03/26
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

  return "";
}

function getLastActiveLegEtaHm() {
  const lastLeg = getLastActiveLegFrameForPerf();
  const etaEl = lastLeg ? qs(SEL.legs.eta, lastLeg) : null;
  return normalizeHm(etaEl?.value || "");
}

function getActiveLegFramesForPerf() {
  return qsa(SEL.legs.frames).filter((frame, idx) => {
    if (idx === 0) return true; // Leg 1 immer aktiv
    const tb = qs(SEL.legs.toggle, frame);
    return !tb || tb.dataset.state !== "inactive";
  });
}

function buildLandingEtaLocalIso() {
  const dateIso = getRouteDateIso();
  if (!dateIso) return "";

  const frames = getActiveLegFramesForPerf();
  if (!frames.length) return "";

  let dayOffset = 0;
  let prevEtaMin = null;
  let lastEta = null;

  for (const frame of frames) {
    const etaEl = qs(SEL.legs.eta, frame);
    const eta = normalizeHm(etaEl?.value || "");
    if (!eta) continue;

    const etaMin = eta.hh * 60 + eta.mm;

    if (prevEtaMin != null && etaMin < prevEtaMin) {
      dayOffset += 1;
    }

    prevEtaMin = etaMin;
    lastEta = { ...eta, dayOffset };
  }

  if (!lastEta) return "";

  const base = new Date(`${dateIso}T00:00:00`);
  base.setDate(base.getDate() + lastEta.dayOffset);

  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  const hh = String(lastEta.hh).padStart(2, "0");
  const mi = String(lastEta.mm).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatEtaSourceLabel(etaLocalIso = "") {
  if (!etaLocalIso) return "";

  const m = String(etaLocalIso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return etaLocalIso;

  return `${m[4]}:${m[5]} LT`;
}

function getLandingTempQnhSourceNote() {
  const etaLocalIso = buildLandingEtaLocalIso();
  const etaLabel = formatEtaSourceLabel(etaLocalIso);

  if (!etaLabel) {
    return "Temp/QNH: Open-Meteo Forecast";
  }

  return `Temp/QNH: Open-Meteo Forecast (${etaLabel})`;
}

function findNearestHourlyIndex(times = [], targetIso = "") {
  if (!Array.isArray(times) || !times.length || !targetIso) return -1;

  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return -1;

  let bestIdx = -1;
  let bestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (Number.isNaN(t.getTime())) continue;

    const diff = Math.abs(t.getTime() - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx;
}

async function loadLandingForecastAtEta(icao, etaLocalIso) {
  const apt = getAirfieldByIcao(normIcao(icao));
  if (!apt) return null;

  const lat = Number(apt.lat);
  const lon = Number(apt.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const cacheKey = `${normIcao(icao)}|${etaLocalIso}`;
  if (landingWxCache.has(cacheKey)) {
    return landingWxCache.get(cacheKey);
  }

  const url =
    `https://api.open-meteo.com/v1/dwd-icon` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&hourly=temperature_2m,pressure_msl` +
    `&timezone=Europe%2FBerlin` +
    `&forecast_days=7`;

  const promise = fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const hourly = data?.hourly;
      const idx = findNearestHourlyIndex(hourly?.time || [], etaLocalIso);

      console.log("open-meteo hourly", {
        icao,
        etaLocalIso,
        idx,
        firstTime: hourly?.time?.[0],
        lastTime: hourly?.time?.[hourly?.time?.length - 1],
      });

      if (idx < 0) return null;

      const temp = hourly?.temperature_2m?.[idx];
      const qnh = hourly?.pressure_msl?.[idx];

      return {
        temp: Number.isFinite(Number(temp)) ? Number(temp) : null,
        qnh: Number.isFinite(Number(qnh)) ? Math.round(Number(qnh)) : null,
        time: hourly?.time?.[idx] || "",
      };
    })
    .catch((err) => {
      console.error("Open-Meteo landing forecast failed", { icao, etaLocalIso, err });
      return null;
    });

  landingWxCache.set(cacheKey, promise);
  return promise;
}

async function writeLandingForecastToFields(icao) {
  const etaLocalIso = buildLandingEtaLocalIso();
  console.log("ld forecast start", {
    icao,
    routeDate: document.getElementById("dateInput")?.value || "",
    etaLocalIso,
  });

  if (!icao || !etaLocalIso) {
    console.warn("ld forecast aborted: missing icao or etaLocalIso", {
      icao,
      etaLocalIso,
    });
    setFieldIfExists("ld_temp", "");
    setFieldIfExists("ld_qnh", "");
    return;
  }

  const fx = await loadLandingForecastAtEta(icao, etaLocalIso);
  console.log("ld forecast result", fx);

  if (!fx) {
    console.warn("ld forecast aborted: no forecast found", {
      icao,
      etaLocalIso,
    });
    setFieldIfExists("ld_temp", "");
    setFieldIfExists("ld_qnh", "");
    return;
  }

  setFieldIfExists(
    "ld_temp",
    formatWithSuffix(
      Number.isFinite(fx.temp) ? String(roundTempForDisplay(fx.temp)) : "",
      "°C"
    )
  );

  setFieldIfExists(
    "ld_qnh",
    formatWithSuffix(Number.isFinite(fx.qnh) ? String(fx.qnh) : "", "hpa")
  );

  console.log("ld forecast written", {
    icao,
    etaLocalIso,
    temp: fx.temp,
    qnh: fx.qnh,
  });
}

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

    if (state !== "off" && state !== "inactive" && state !== "disabled") {
      lastActive = frames[i];
    }
  }

  return lastActive;
}

function getRouteDateDay() {
  const iso = getRouteDateIso();
  if (!iso) return null;

  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Number(m[3]) : null;
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
  const m = txt.match(/\bTAF(?:\s+\w+)?\s+[A-Z]{4}\s+\d{6}Z\s+\d{4}\/\d{4}\s+((?:\d{3}|VRB)\d{2,3}(?:G\d{2,3})?)KT\b/);
  return m ? m[1] : "";
}

function parseTafWindForEta(rawTaf = "", etaHm = null) {
  const txt = String(rawTaf).toUpperCase();
  if (!txt) return "";

  let selectedWind = parseTafBaseWind(txt);

  if (!etaHm) return selectedWind;

  const validityMatch = txt.match(/\b\d{6}Z\s+(\d{2})\d{2}\/(\d{2})\d{2}\b/);
  if (!validityMatch) return selectedWind;

  const tafDayFrom = Number(validityMatch[1]);
  const etaAbs = absMinutes(tafDayFrom, etaHm.hh, etaHm.mm);

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
  const toIcao = normIcao(getOutText("to_icao"));
  const ldIcao = normIcao(getOutText("ld_icao"));

  if (!toIcao) {
    setFieldIfExists("to_wind", "");
    setFieldIfExists("to_temp", "");
    setFieldIfExists("to_qnh", "");
  }

  if (!ldIcao) {
    setFieldIfExists("ld_wind", "");
    setFieldIfExists("ld_temp", "");
    setFieldIfExists("ld_qnh", "");    
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

      await writeLandingForecastToFields(ldIcao);
      if (myToken !== perfWxSyncToken) return;
    } catch (err) {
      console.error("Landing wx sync failed:", err);
      if (myToken !== perfWxSyncToken) return;
      setFieldIfExists("ld_wind", "");
      setFieldIfExists("ld_temp", "");
      setFieldIfExists("ld_qnh", "");
    }
  }
}

function roundTempForDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  return n >= 0
    ? Math.floor(n + 0.5)
    : Math.ceil(n - 0.5);
}
// ---------- Ende helpers ----------

// ---------- Reset Helpers ----------
const PERF_RESET_GROUPS = {
  takeoff: ["to_tom", "to_roll"],
  return: ["rt_oei_roc", "rt_eosid", "rt_roll", "rt_ld_abn"],
  landing: ["ld_lm", "ld_roll", "ld_ld"],
};

function clearPerformanceFields(fieldNames = []) {
  const state = loadPerformanceState();

  for (const name of fieldNames) {
    clearField(name);
    state[name] = "";
  }

  savePerformanceState(state);

  applyPerformanceFormattingNow();
  syncPerformanceMargins();
  syncFlapsSpeeds();
}

function bindPerformanceResetButtons() {
  const actions = {
    "reset-performance-takeoff": () => {
      clearPerformanceFields(PERF_RESET_GROUPS.takeoff);
    },
    "reset-performance-return": () => {
      clearPerformanceFields(PERF_RESET_GROUPS.return);
    },
    "reset-performance-landing": () => {
      clearPerformanceFields(PERF_RESET_GROUPS.landing);
    },
    "reset-performance-all": () => {
      clearPerformanceFields([
        ...PERF_RESET_GROUPS.takeoff,
        ...PERF_RESET_GROUPS.return,
        ...PERF_RESET_GROUPS.landing,
      ]);
    },
  };

  Object.entries(actions).forEach(([action, handler]) => {
    const btn = document.querySelector(`[data-action="${action}"]`);
    if (!btn) return;
    if (btn.dataset.bound === "1") return;

    btn.dataset.bound = "1";
    btn.addEventListener("click", handler);
  });
}
// ---------- Ende Reset Helpers ----------

// ---------- data ----------
function normRwy(v = "") {
  return String(v).trim().toUpperCase();
}

function getMilRunwayMapForIcao(icao) {
  const airport = getAirfieldByIcao(normIcao(icao));
  if (!airport) return {};

  const rows = Array.isArray(airport?.rwys)
    ? airport.rwys
    : Array.isArray(airport?.RWYs)
      ? airport.RWYs
      : [];

  const out = {};

  for (const row of rows) {
    const rwy = normRwy(row?.rwy ?? row?.RWY);
    if (!rwy) continue;

    const tora = Number(row?.tora ?? row?.TORA);
    const lda = Number(row?.lda ?? row?.LDA);

    out[rwy] = {
      ...(Number.isFinite(tora) ? { tora } : {}),
      ...(Number.isFinite(lda) ? { lda } : {}),
    };
  }

  return out;
}

function getRunwayMapForIcao(icao) {
  const key = normIcao(icao);
  if (!key) return {};

  const perfRunways = runwayData?.[key]?.runways;
  if (perfRunways && Object.keys(perfRunways).length) {
    return perfRunways;
  }

  return getMilRunwayMapForIcao(key);
}

function getRunwayDataForIcaoRwy(icao, rwy) {
  const map = getRunwayMapForIcao(icao);
  return map?.[normRwy(rwy)] || null;
}

async function loadRunwayData() {
  try {
    const res = await fetch("./data/performance_runways.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    runwayData = await res.json();
  } catch {
    runwayData = {};
  }
}

function getRunwaysForIcao(icao) {
  return Object.keys(getRunwayMapForIcao(icao)).sort();
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
  const data = getRunwayDataForIcaoRwy(icao, rwy);
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

  if (frame && frame.classList.contains("is-hidden")) return false;

  return true;
}

function isLegFrameActive(frame, legNum) {
  if (!frame) return false;

  const toEl = qs(SEL.legs.aeroTo, frame);
  const fromEl = qs(SEL.legs.aeroFrom, frame);
  const btn = qs(SEL.legs.toggleByLeg(legNum));

  const state = String(btn?.dataset?.state || "").toLowerCase();
  if (state === "off" || state === "inactive" || state === "disabled") return false;
  if (state === "on" || state === "active" || state === "enabled") return true;

  if (toEl?.disabled && fromEl?.disabled) return false;
  if (frame.classList.contains("is-hidden")) return false;
  if (frame.hidden) return false;
  if (frame.getAttribute("aria-hidden") === "true") return false;

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

  setDerivedOut("to_icao", depIcao);
  setDerivedOut("rt_icao", depIcao);
  setDerivedOut("ld_icao", destIcao);
}

// ---------- runway selects ----------
function syncRunwaySelectsFromIcao() {
  const toIcao = normIcao(getOutText("to_icao"));
  const ldIcao = normIcao(getOutText("ld_icao"));

  fillRunwaySelect(getField("to_rwy"), getRunwaysForIcao(toIcao));
  fillRunwaySelect(getField("ld_rwy"), getRunwaysForIcao(ldIcao));
}

function syncDeclaredDistances() {
  const toIcao = normIcao(getOutText("to_icao"));
  const rtIcao = normIcao(getOutText("rt_icao"));
  const ldIcao = normIcao(getOutText("ld_icao"));

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

    setOut("rt_rwy", toRwy);

    const rtData = getRunwayDataForIcaoRwy(rtIcao, toRwy);
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
  const tom = parseNum(stripUnit(getField("to_tom")?.value || ""));
  const eosid = getField("rt_eosid")?.value || "";

  if (!Number.isFinite(tom) || !eosid) {
    setOut("rt_lm", "");
    return;
  }

  const minus =
    eosid === "IFR" || eosid === "IFR/VFR OPT"
      ? 3 * FIX.USG_LIT * FIX.JETA1_KG_PER_L
      : 1 * FIX.USG_LIT * FIX.JETA1_KG_PER_L;

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
  syncFlapsSpeeds();
  syncPerformanceMargins();
}

// ---------- init ----------
export async function initPerformance() {
  await loadRunwayData();
  syncAiracHeader();
  applyMilValidTo();
  restorePerfFields();
  bindPerformanceFormatting();
  applyPerformanceFormattingNow();
  syncPerformanceDerived();
  bindPerfPersistence();
  bindMarginRecalc();
  bindPerformanceResetButtons();

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
      syncPerformanceMargins();
    }

    if (
      e.target.matches('[data-field="to_flaps"]') ||
      e.target.matches('[data-field="rt_flaps"]') ||
      e.target.matches('[data-field="ld_flaps"]')
    ) {
      syncFlapsSpeeds();
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