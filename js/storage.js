// js/storage.js// Lesen: qs/qsa aus ui/dom.js
// Schreiben: setValue aus ui/ui.js
// Lesen: readValue aus ui/read.js
// Strings aus ui/selectors.js
// Keine eigenen qs/qsa/getValue/setValue mehr in storage.js
// Optional: getInputValue(el) als kleine lokale Helper-Funktion (weil ui/ui.js absichtlich nur Schreibfunktionen enthält)

import { qs, qsa, readValue, setValue, SEL } from "./ui/index.js";

const KEY = "fp.v2"; // bei Breaking Changes erhöhen (v2, v3...)
const SCHEMA_VERSION = 2;
const LEGACY_KEYS = ["fp.v1"]; // alte Keys mit prüfen
const EXPORT_COUNTER_KEY = "fp.exportCounter";
const LAST_AUTOEXPORT_KEY = "fp.lastAutoExportBase";

// ---------- MIGRATION PIPELINE ---------- //
function normalizeIncoming(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (!("v" in obj)) obj.v = 0; // wenn v fehlt, ist es “v0”
  return obj;
}

function migrateToV1(d) {
  if (!d.route?.head && d.route) {
    d.route.head = d.route.head || {};
  }
  return { ...d, v: 1 };
}

function migrateToV2(d) {
  if (d.fuel && !d.fuel.finres) d.fuel.finres = "IFR";
  return { ...d, v: 2 };
}

function migrate(data) {
  let d = normalizeIncoming(data);
  if (!d) return null;

  while (d.v < SCHEMA_VERSION) {
    if (d.v === 0) d = migrateToV1(d);
    else if (d.v === 1) d = migrateToV2(d);
    else throw new Error("Keine Migration definiert für v=" + d.v);
  }

  d.route = d.route || { head: {}, legs: [], toggles: {} };
  d.fuel = d.fuel || {};
  return d;
}
// ---------- MIGRATION PIPELINE ENDE ---------- //

// ---------- AUTOSAVE DIRTY GUARD ---------- //
let isApplying = false;
let lastFP = "";
let saveTimer = null;
let isDirty = false;

// stabil stringify + kleiner Hash (FNV-1a)
function stableStringify(obj) {
  const seen = new WeakSet();

  function norm(v) {
    if (v && typeof v === "object") {
      if (seen.has(v)) return null;
      seen.add(v);

      if (Array.isArray(v)) return v.map(norm);

      const out = {};
      Object.keys(v).sort().forEach((k) => {
        out[k] = norm(v[k]);
      });
      return out;
    }
    return v;
  }

  return JSON.stringify(norm(obj));
}

function fpOf(obj) {
  const s = stableStringify(obj);
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

function setApplying(on) {
  isApplying = on;
}

function scheduleSave(delay = 300) {
  if (isApplying) return;

  isDirty = true;
  setSaveIndicator("dirty", "Änderungen…");

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (isApplying) return;
    saveAll({ onlyIfChanged: true });
  }, delay);
}
// ---------- AUTOSAVE DIRTY GUARD ENDE ---------- //

// ---------- SAVE INDICATOR ---------- //
function setSaveIndicator(state, msg = "") {
  const el = qs(SEL.topbar.saveIndicator);
  if (!el) return;

  el.classList.remove("is-dirty", "is-saved", "is-error");

  if (state === "dirty") {
    el.classList.add("is-dirty");
    el.textContent = msg || "Änderungen…";
  } else if (state === "saved") {
    el.classList.add("is-saved");
    el.textContent = msg || "Gespeichert";
  } else if (state === "error") {
    el.classList.add("is-error");
    el.textContent = msg || "Speichern fehlgeschlagen";
  } else {
    el.textContent = msg || "";
  }
}
// ---------- SAVE INDICATOR ENDE ---------- //

function safeParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// ---------- Export-Funktion ---------- //
function sanitizeFilePart(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .slice(0, 32) || "NA";
}

function getDateForFilename() {
  const raw = String(readValue(SEL.route.dateInput) || "").trim();
  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    return `20${yy}-${mm}-${dd}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function getCallsignForFilename() {
  const el = qs(SEL.route.callsignDisplay);
  return el?.textContent?.trim() || "CALLSIGN";
}

function buildFilename(base) {
  const last = Number(localStorage.getItem(EXPORT_COUNTER_KEY) || "0");
  const next = last + 1;

  localStorage.setItem(EXPORT_COUNTER_KEY, next);

  if (next === 1) return `${base}.json`;
  return `${base} (${next}).json`;
}
// ---------- Export Funktion Ende ---------- //

// ---------- ROUTE ----------
function legFrames() {
  return qsa(SEL.legs.frames);
}

function captureRoute() {
  const route = {
    head: {
      date: readValue(SEL.route.dateInput),
      lfz: readValue(SEL.route.lfzSelect),
      tac: readValue(SEL.route.tacSelect),
    },
    legs: [],
    toggles: {},
  };

  // Leg Toggles (2–4)
  qsa(`${SEL.legs.toggle}[data-leg]`).forEach((btn) => {
    route.toggles[String(btn.dataset.leg)] = btn.dataset.state || "active";
  });

  // Legs: Reihenfolge = 1..4 über DOM
  const frames = legFrames();
  frames.forEach((frame, idx) => {
    const legNum = idx + 1;
    route.legs.push({
      leg: legNum,
      etd: readValue(qs("input.etd", frame)),
      eta: readValue(qs("input.eta", frame)),
      aeroFrom: readValue(qs("input.aeroFrom", frame)),
      aeroTo: readValue(qs("input.aeroTo", frame)),
      alt1: readValue(qsa("input.alt", frame)[0]),
      alt2: readValue(qsa("input.alt", frame)[1]),
    });
  });

  return route;
}

function applyLegToggleToFrame(btn, state) {
  if (!btn) return;

  const frame = btn.closest(".c-panel");
  const inactive = state === "inactive";

  btn.dataset.state = state;
  btn.textContent = inactive ? "INACTIVE" : "ACTIVE";
  btn.classList.toggle("inactive", inactive);

  if (frame) {
    frame.classList.toggle("inactiveFields", inactive);
    qsa(".legField", frame).forEach((f) => {
      f.disabled = inactive;
    });
  }
}

function applyRoute(route) {
  if (!route) return;

  // Kopf
  setValue(SEL.route.dateInput, route.head?.date, { emit: true });

  // selects: setzen (Options können async kommen; dein app.js macht safety reload)
  setValue(SEL.route.lfzSelect, route.head?.lfz, { emit: true });
  setValue(SEL.route.tacSelect, route.head?.tac, { emit: true });

  // Legs
  const frames = legFrames();
  (route.legs || []).forEach((l, idx) => {
    const frame = frames[idx];
    if (!frame) return;

    setValue(qs("input.etd", frame), l.etd, { emit: true });
    setValue(qs("input.eta", frame), l.eta, { emit: true });
    setValue(qs("input.aeroFrom", frame), l.aeroFrom, { emit: true });
    setValue(qs("input.aeroTo", frame), l.aeroTo, { emit: true });

    const alts = qsa("input.alt", frame);
    setValue(alts[0], l.alt1, { emit: true });
    setValue(alts[1], l.alt2, { emit: true });
  });

  // Toggles inkl. Field-Disable (wichtig!)
  Object.entries(route.toggles || {}).forEach(([leg, state]) => {
    const btn = qs(SEL.legs.toggleByLeg(leg));
    if (!btn) return;
    applyLegToggleToFrame(btn, state);
  });
}

// ---------- FUEL ----------
function captureFuel() {
  const panel = qs(SEL.fuel.panel);
  if (!panel) return null;

  const fuel = {
    toggles: {
      std_block: qs(SEL.fuel.toggleStd, panel)?.dataset.state || "off",
      aux_on: qs(SEL.fuel.toggleAux, panel)?.dataset.state || "off",
    },
    main_usg: readValue(qs(SEL.fuel.mainInput, panel)),
    trip: {
      1: readValue(qs(SEL.fuel.tripInput(1), panel)),
      2: readValue(qs(SEL.fuel.tripInput(2), panel)),
      3: readValue(qs(SEL.fuel.tripInput(3), panel)),
      4: readValue(qs(SEL.fuel.tripInput(4), panel)),
    },
    appr_ifr_n: readValue(qs(SEL.fuel.apprIfn, panel)),
    appr_vfr_n: readValue(qs(SEL.fuel.apprVfr, panel)),
    alt_usg_log: readValue(qs(SEL.fuel.altInput, panel)),
    finres: readValue(qs(SEL.fuel.finresSelect, panel)) || "IFR",
  };

  return fuel;
}

function applyFuel(fuel) {
  const panel = qs(SEL.fuel.panel);
  if (!panel || !fuel) return;

  // Toggles: nur dataset + Text setzen (kein Click, sonst würde es togglen)
  const stdBtn = qs(SEL.fuel.toggleStd, panel);
  const auxBtn = qs(SEL.fuel.toggleAux, panel);

  if (stdBtn) stdBtn.dataset.state = fuel.toggles?.std_block || stdBtn.dataset.state;
  if (auxBtn) auxBtn.dataset.state = fuel.toggles?.aux_on || auxBtn.dataset.state;

  // Inputs
  setValue(qs(SEL.fuel.mainInput, panel), fuel.main_usg, { emit: true });

  setValue(qs(SEL.fuel.tripInput(1), panel), fuel.trip?.["1"] ?? fuel.trip?.[1], { emit: true });
  setValue(qs(SEL.fuel.tripInput(2), panel), fuel.trip?.["2"] ?? fuel.trip?.[2], { emit: true });
  setValue(qs(SEL.fuel.tripInput(3), panel), fuel.trip?.["3"] ?? fuel.trip?.[3], { emit: true });
  setValue(qs(SEL.fuel.tripInput(4), panel), fuel.trip?.["4"] ?? fuel.trip?.[4], { emit: true });

  setValue(qs(SEL.fuel.apprIfn, panel), fuel.appr_ifr_n, { emit: true });
  setValue(qs(SEL.fuel.apprVfr, panel), fuel.appr_vfr_n, { emit: true });
  setValue(qs(SEL.fuel.altInput, panel), fuel.alt_usg_log, { emit: true });

  const finres = qs(SEL.fuel.finresSelect, panel);
  if (finres) setValue(finres, fuel.finres || "IFR", { emit: true });

  // fuel.js reagiert bei dir auch auf panel-change:
  panel.dispatchEvent(new Event("change", { bubbles: true }));
}

// ---------- PUBLIC API ----------
export function saveAll({ onlyIfChanged = false } = {}) {
  const data = {
    v: SCHEMA_VERSION,
    t: Date.now(),
    route: captureRoute(),
    fuel: captureFuel(),
  };

  try {
    if (onlyIfChanged) {
      const fp = fpOf({ route: data.route, fuel: data.fuel });
      if (fp === lastFP) {
        isDirty = false;
        setSaveIndicator("saved", "unverändert");
        return;
      }
      lastFP = fp;
    }

    localStorage.setItem(KEY, JSON.stringify(data));

    isDirty = false;
    setSaveIndicator("saved", "Gespeichert");
  } catch (e) {
    console.error(e);
    setSaveIndicator("error", "Speichern fehlgeschlagen");
  }
}

function loadRaw() {
  const rawCurrent = localStorage.getItem(KEY);
  if (rawCurrent) return rawCurrent;

  for (const k of LEGACY_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw) return raw;
  }
  return null;
}

export function loadAll() {
  const raw = loadRaw();
  const data = safeParse(raw, null);
  if (!data) return;

  const migrated = migrate(data);
  if (!migrated) return;

  // unter aktuellem KEY ablegen
  localStorage.setItem(KEY, JSON.stringify(migrated));

  // optional: alte Keys löschen
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);

  setApplying(true);
  try {
    applyRoute(migrated.route);
    applyFuel(migrated.fuel);
  } finally {
    setTimeout(() => setApplying(false), 0);
  }

  lastFP = fpOf({ route: migrated.route, fuel: migrated.fuel });
  isDirty = false;
  setSaveIndicator("saved", "Geladen");
}

export function clearAll() {
  localStorage.removeItem(KEY);
  isDirty = false;
  lastFP = "";
  setSaveIndicator("saved", "Zurückgesetzt");
}

export function initAutosave({ delay = 300 } = {}) {
  // initial fingerprint setzen (aus localStorage, falls vorhanden)
  try {
    const raw = localStorage.getItem(KEY);
    const data = safeParse(raw, null);
    if (data) lastFP = fpOf({ route: data.route, fuel: data.fuel });
    else lastFP = fpOf({ route: captureRoute(), fuel: captureFuel() });
  } catch {
    lastFP = "";
  }

  setSaveIndicator("saved", "Bereit");
  setTimeout(() => setSaveIndicator("saved", "Gespeichert"), 500);

  // input/change -> debounced save
  document.addEventListener(
    "input",
    (e) => {
      const t = e.target;
      if (!t?.matches?.("input, select, textarea")) return;
      scheduleSave(delay);
    },
    { passive: true }
  );

  document.addEventListener(
    "change",
    (e) => {
      const t = e.target;
      if (!t?.matches?.("input, select, textarea")) return;
      scheduleSave(delay);
    },
    { passive: true }
  );

  // Toggles/Resets -> nach UI Update speichern
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const isToggle =
        btn.classList.contains("legToggle") || btn.classList.contains("fuelToggle");

      const isReset =
        typeof btn.dataset.action === "string" && btn.dataset.action.startsWith("reset-");

      if (isToggle || isReset) scheduleSave(0);
    },
    { passive: true }
  );

  window.addEventListener("beforeunload", (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

// ---------- Export / Import ----------
export function exportDataJSON({ auto = false } = {}) {
  const raw = localStorage.getItem(KEY) || JSON.stringify({ t: Date.now() }, null, 2);

  const datePart = sanitizeFilePart(getDateForFilename());
  const csPart = sanitizeFilePart(getCallsignForFilename());
  const base = `FP-${datePart}-${csPart}`;

  if (auto) {
    const last = localStorage.getItem(LAST_AUTOEXPORT_KEY);
    if (last === base) return;
    localStorage.setItem(LAST_AUTOEXPORT_KEY, base);
  }

  const filename = buildFilename(base);

  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export function importDataJSONFromText(jsonText, { apply = true } = {}) {
  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    alert("Import fehlgeschlagen: ungültiges JSON.");
    return false;
  }

  if (!obj || typeof obj !== "object") {
    alert("Import fehlgeschlagen: ungültige Datenstruktur.");
    return false;
  }

  const migrated = migrate(obj);
  localStorage.setItem(KEY, JSON.stringify(migrated));

  if (apply) {
    loadAll();
    setTimeout(loadAll, 400); // safety reload für async selects
  }

  return true;
}

export async function importDataJSONFromFile(file, { apply = true } = {}) {
  const text = await file.text();
  return importDataJSONFromText(text, { apply });
}