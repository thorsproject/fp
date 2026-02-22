// js/storage.js
const KEY = "fp.v2"; // bei Breaking Changes erhöhen (v2, v3...)
const SCHEMA_VERSION = 2;
const LEGACY_KEYS = ["fp.v1"]; //  alte Keys mit prüfen
const EXPORT_COUNTER_KEY = "fp.exportCounter";
const LAST_AUTOEXPORT_KEY = "fp.lastAutoExportBase";

// ---------- MIGRATION PIPELINE ---------- //
function normalizeIncoming(obj) {
  if (!obj || typeof obj !== "object") return null;
  // wenn v fehlt, ist es “v0” (deine ganz frühen Daten)
  if (!("v" in obj)) obj.v = 0;
  return obj;
}

function migrateToV1(d) {
  // Beispiel: früher hieß route.head.date evtl. route.date
  if (!d.route?.head && d.route) {
    d.route.head = d.route.head || {};
  }
  return { ...d, v: 1 };
}

function migrateToV2(d) {
  // Beispiel: du willst ab v2 "fuel.finres" immer garantiert setzen
  if (d.fuel && !d.fuel.finres) d.fuel.finres = "IFR";

  // Beispiel: du willst toggles immer "on/off" statt "active/inactive"
  // (nur als Demo – bei dir aktuell nicht nötig)
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

  // Optional: hier final noch “Defaults” setzen
  d.route = d.route || { head:{}, legs:[], toggles:{} };
  d.fuel  = d.fuel  || {};
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
  const el = document.getElementById("saveIndicator");
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
  try { return JSON.parse(json); } catch { return fallback; }
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function getValue(el) {
  if (!el) return null;
  if (el.type === "checkbox") return !!el.checked;
  return el.value ?? "";
}

function setValue(el, val) {
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!val;
  else el.value = val ?? "";
}

// ---------- eMail EO-Funktion ---------- //
// kommt später //

// ---------- Export-Funktion ---------- //
function sanitizeFilePart(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .slice(0, 32) || "NA";
}

function getDateForFilename() {
  const el = document.getElementById("dateInput");
  const raw = el?.value?.trim() || "";

  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    return `20${yy}-${mm}-${dd}`;
  }

  return new Date().toISOString().slice(0, 10);
}

function getCallsignForFilename() {
  const el = document.getElementById("callSignDisplay");
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

function legFrames() {
  return qsa("#legsContainer .c-panel");
}

function captureRoute() {
  const route = {
    head: {
      date: getValue(qs("#dateInput")),
      fdl: getValue(qs("#FDLinput")),
      tel: getValue(qs("#TELinput")),
      lfz: getValue(qs("#lfzSelect")),
      tac: getValue(qs("#tacSelect")),
    },
    legs: [],
    toggles: {},
  };

  // Leg Toggles (2–4)
  qsa(".legToggle[data-leg]").forEach((btn) => {
    route.toggles[String(btn.dataset.leg)] = btn.dataset.state || "active";
  });

  // Legs: Reihenfolge = 1..4 über DOM (dein Aufbau ist konstant)
  const frames = legFrames(); // 4 frames
  frames.forEach((frame, idx) => {
    const legNum = idx + 1;
    route.legs.push({
      leg: legNum,
      etd: getValue(qs("input.etd", frame)),
      eta: getValue(qs("input.eta", frame)),
      aeroFrom: getValue(qs("input.aeroFrom", frame)),
      aeroTo: getValue(qs("input.aeroTo", frame)),
      alt1: getValue(qsa("input.alt", frame)[0]),
      alt2: getValue(qsa("input.alt", frame)[1]),
    });
  });

  return route;
}

function applyRoute(route) {
  if (!route) return;

  // Kopf
  setValue(qs("#dateInput"), route.head?.date);
  setValue(qs("#FDLinput"), route.head?.fdl);
  setValue(qs("#TELinput"), route.head?.tel);

  // selects: erst setzen, wenn Optionen evtl. async geladen wurden.
  // -> wir setzen sofort UND nochmal später (siehe init)
  setValue(qs("#lfzSelect"), route.head?.lfz);
  setValue(qs("#tacSelect"), route.head?.tac);

  // Legs
  const frames = legFrames();
  (route.legs || []).forEach((l, idx) => {
    const frame = frames[idx];
    if (!frame) return;
    setValue(qs("input.etd", frame), l.etd);
    setValue(qs("input.eta", frame), l.eta);
    setValue(qs("input.aeroFrom", frame), l.aeroFrom);
    setValue(qs("input.aeroTo", frame), l.aeroTo);

    const alts = qsa("input.alt", frame);
    setValue(alts[0], l.alt1);
    setValue(alts[1], l.alt2);
  });

  // Toggles
  Object.entries(route.toggles || {}).forEach(([leg, state]) => {
    const btn = qs(`.legToggle[data-leg="${leg}"]`);
    if (!btn) return;
    btn.dataset.state = state;
    btn.textContent = state === "inactive" ? "INACTIVE" : "ACTIVE";
    btn.classList.toggle("inactive", state === "inactive");
  });

  // Events triggern, damit Berechnungen/Validation reagieren
  qsa("#routePanel input, #routePanel select").forEach((el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function captureFuel() {
  const panel = qs("#fuelPanel");
  if (!panel) return null;

  const fuel = {
    toggles: {
      std_block: qs(`.fuelToggle[data-field="std_block"]`, panel)?.dataset.state || "off",
      aux_on: qs(`.fuelToggle[data-field="aux_on"]`, panel)?.dataset.state || "off",
    },
    main_usg: getValue(qs(`[data-field="main_usg"]`, panel)),
    trip: {
      1: getValue(qs(`[data-trip-usg="1"]`, panel)),
      2: getValue(qs(`[data-trip-usg="2"]`, panel)),
      3: getValue(qs(`[data-trip-usg="3"]`, panel)),
      4: getValue(qs(`[data-trip-usg="4"]`, panel)),
    },
    appr_ifr_n: getValue(qs(`[data-field="appr_ifr_n"]`, panel)),
    appr_vfr_n: getValue(qs(`[data-field="appr_vfr_n"]`, panel)),
    alt_usg_log: getValue(qs(`[data-field="alt_usg_log"]`, panel)),
    finres: getValue(qs(`#finres`, panel)) || "IFR",
  };

  return fuel;
}

function applyFuel(fuel) {
  const panel = qs("#fuelPanel");
  if (!panel || !fuel) return;

  // Toggles setzen (nur state + Text; deine fuel.js reagiert auf click,
  // daher anschließend sync über Events)
  const stdBtn = qs(`.fuelToggle[data-field="std_block"]`, panel);
  const auxBtn = qs(`.fuelToggle[data-field="aux_on"]`, panel);

  if (stdBtn) stdBtn.dataset.state = fuel.toggles?.std_block || stdBtn.dataset.state;
  if (auxBtn) auxBtn.dataset.state = fuel.toggles?.aux_on || auxBtn.dataset.state;

  // Inputs
  setValue(qs(`[data-field="main_usg"]`, panel), fuel.main_usg);

  setValue(qs(`[data-trip-usg="1"]`, panel), fuel.trip?.["1"] ?? fuel.trip?.[1]);
  setValue(qs(`[data-trip-usg="2"]`, panel), fuel.trip?.["2"] ?? fuel.trip?.[2]);
  setValue(qs(`[data-trip-usg="3"]`, panel), fuel.trip?.["3"] ?? fuel.trip?.[3]);
  setValue(qs(`[data-trip-usg="4"]`, panel), fuel.trip?.["4"] ?? fuel.trip?.[4]);

  setValue(qs(`[data-field="appr_ifr_n"]`, panel), fuel.appr_ifr_n);
  setValue(qs(`[data-field="appr_vfr_n"]`, panel), fuel.appr_vfr_n);
  setValue(qs(`[data-field="alt_usg_log"]`, panel), fuel.alt_usg_log);

  const finres = qs("#finres", panel);
  if (finres) finres.value = fuel.finres || "IFR";

  // Trigger, damit dein fuel.js alles neu berechnet & Toggles-Visuals sauber werden
  qsa("#fuelPanel input, #fuelPanel select").forEach((el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Falls du in fuel.js applyVisual() beim Start nutzt:
  // einmal click-event simulieren wollen wir NICHT (würde togglen),
  // daher nur change/input reicht.
}

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
        // Zustand ist effektiv saved
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
  // 1) aktueller Key
  const rawCurrent = localStorage.getItem(KEY);
  if (rawCurrent) return rawCurrent;

  // 2) fallback: alte Keys
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

  // optional: alte Keys löschen, wenn sie existieren
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);

  // dann anwenden
  setApplying(true);
  try {
    applyRoute(migrated.route);
    applyFuel(migrated.fuel);
  } finally {
    setTimeout(() => setApplying(false), 0);
  }

  // Fingerprint setzen (ohne t)
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
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (!t) return;
    // nur echte Inputs/Selects/Textareas
    if (!(t.matches?.("input, select, textarea"))) return;
    scheduleSave(delay);
  }, { passive: true });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!t) return;
    if (!(t.matches?.("input, select, textarea"))) return;
    scheduleSave(delay);
  }, { passive: true });

  // Toggles/Resets -> nach UI Update speichern (debounced reicht)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const isToggle =
      btn.classList.contains("legToggle") ||
      btn.classList.contains("fuelToggle");

    const isReset =
      typeof btn.dataset.action === "string" &&
      btn.dataset.action.startsWith("reset-");

    if (isToggle || isReset) scheduleSave(0);
  }, { passive: true });

  window.addEventListener("beforeunload", (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = ""; // Browser zeigt Standard-Warnung
  });
}

export function exportDataJSON({ auto = false } = {}) {
  const raw = localStorage.getItem(KEY) || JSON.stringify({ t: Date.now() }, null, 2);

  const datePart = sanitizeFilePart(getDateForFilename());
  const csPart   = sanitizeFilePart(getCallsignForFilename());
  const base = `FP-${datePart}-${csPart}`;

  // --------------------------
  // AUTO EXPORT GUARD
  // --------------------------
  if (auto) {
    const last = localStorage.getItem(LAST_AUTOEXPORT_KEY);
    if (last === base) return; // bereits automatisch exportiert
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
  } catch (e) {
    alert("Import fehlgeschlagen: ungültiges JSON.");
    return false;
  }

  // Minimal-Validation: muss wenigstens ein Objekt sein
  if (!obj || typeof obj !== "object") {
    alert("Import fehlgeschlagen: ungültige Datenstruktur.");
    return false;
  }

  // speichern
  const migrated = migrate(obj);
  localStorage.setItem(KEY, JSON.stringify(migrated));
  if (apply) loadAll();

  // optional direkt anwenden
  if (apply) {
    // loadAll kommt aus storage.js selbst – also hier direkt aufrufen
    loadAll();
    setTimeout(loadAll, 400); // safety-reload für selects
  }

  return true;
}

export async function importDataJSONFromFile(file, { apply = true } = {}) {
  const text = await file.text();
  return importDataJSONFromText(text, { apply });
}