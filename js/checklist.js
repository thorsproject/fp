// js/checklist.js
// Local-only Planning Checklist state (NOT part of fp storage.js)

import { qs, qsa, closest, readValue, setValue, SEL } from "./ui/index.js";

// ---------- Debug-Funktion bei Bedarf ----------
const DEBUG_CHECKLIST = false; // <- auf true setzen, wenn du Logs willst
function dlog(...args) {
  if (!DEBUG_CHECKLIST) return;
  console.log("[checklist]", ...args);
}
// ---------- Debug-Funktion Ende ----------

const STORAGE_KEY = "fp_checklist_v1";

// ---------- Storage helpers ----------
function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- UI helpers ----------
export function checklistApplyToggle(btn, checked) {
  if (!btn) return;
  btn.classList.toggle("is-checked", !!checked);
  btn.textContent = checked ? "CHECK" : "UNCHECK";
}

function flashReset(btn) {
  if (!btn) return;
  btn.classList.add("reset-success");
  setTimeout(() => btn.classList.remove("reset-success"), 300);
}

function getScope() {
  return qs(SEL.checklist.view) || document;
}

function getToast(scope) {
  return qs(SEL.checklist.toast, scope) || qs(SEL.checklist.toast);
}

function showToast(scope, msg) {
  const toast = getToast(scope);
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.remove("is-hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("is-hidden"), 2200);
}

// ---------- Public helper for other modules (orm.js / app.js) ----------
export function checklistSetToggle(key, checked = true) {
  const scope = getScope();
  const btn =
    qs(SEL.checklist.toggleByKey(key), scope) || qs(SEL.checklist.toggleByKey(key));
  if (!btn) return;

  checklistApplyToggle(btn, checked);

  const s = readState();
  s.toggles = s.toggles || {};
  s.toggles[key] = !!checked;
  writeState(s);
}

export function checklistResetUI({ resetToggles = false, resetFields = [] } = {}) {
  const scope = getScope();

  if (resetToggles) {
    qsa(SEL.checklist.toggleBtn, scope).forEach((tb) => checklistApplyToggle(tb, false));
  }

  if (resetFields === "all") {
    qsa(SEL.checklist.fieldAny, scope).forEach((el) => setValue(el, "", { emit: false }));
  } else if (Array.isArray(resetFields) && resetFields.length) {
    resetFields
      .map((k) => qs(SEL.checklist.fieldByKey(k), scope))
      .filter(Boolean)
      .forEach((el) => setValue(el, "", { emit: false }));
  }
}

// ---------- Main ----------
export function initChecklistUI() {
  const scope = getScope();

  // ---------- Restore ----------
  const state = readState();
  dlog("restore state", state);
  const toggles = state.toggles || {};
  const fields = state.fields || {};

  qsa(SEL.checklist.toggleBtn, scope).forEach((tb) => {
    const key = tb.dataset.tb;
    if (key in toggles) {
      dlog("restore toggle", key, toggles[key]);
      checklistApplyToggle(tb, toggles[key]);
    }
  });

  qsa(SEL.checklist.fieldAny, scope).forEach((inp) => {
    const key = inp.dataset.field;
    if (key in fields) {
      dlog("restore field", key, fields[key]);
      setValue(inp, fields[key] ?? "", { emit: false });
    }
  });

  // ---------- Persist helpers ----------
  function saveToggle(key, checked) {
    const s = readState();
    s.toggles = s.toggles || {};
    s.toggles[key] = !!checked;
    writeState(s);
  }

  function saveField(key, value) {
    const s = readState();
    s.fields = s.fields || {};
    s.fields[key] = value ?? "";
    writeState(s);
  }

  // ---------- Toggle click ----------
  scope.addEventListener("click", (e) => {
    const tb = closest(e.target, SEL.checklist.toggleBtn);
    if (!tb || !scope.contains(tb)) return;

    const checked = !tb.classList.contains("is-checked");

    dlog("toggle click", { key: tb.dataset.tb, checked });

    checklistApplyToggle(tb, checked);
    saveToggle(tb.dataset.tb, checked);
  });

  // ---------- Inputs (debounced save) ----------
  const timers = new Map();

  function debounceSaveField(key, value) {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => saveField(key, value), 200));
  }

  // INITIALS uppercase + save + wx auto-check
  scope.addEventListener("input", (e) => {
    const el = closest(e.target, SEL.checklist.fieldAny);
    if (!el || !scope.contains(el)) return;

    // initials: uppercase while typing
    if (el.dataset.field === "wx_init") {
      const pos = el.selectionStart ?? el.value.length;
      el.value = String(el.value).toUpperCase();
      try { el.setSelectionRange(pos, pos); } catch {}
    }

    const fieldKey = el.dataset.field;
    const value = readValue(el);

    dlog("field input", { key: fieldKey, value });

    debounceSaveField(fieldKey, value);

    // Wx auto-check if complete
    const nr = String(readValue(qs(SEL.checklist.fieldByKey("wx_nr"), scope)) || "").trim();
    const voidv = String(readValue(qs(SEL.checklist.fieldByKey("wx_void"), scope)) || "").trim();
    const init = String(readValue(qs(SEL.checklist.fieldByKey("wx_init"), scope)) || "").trim();

    if (nr && voidv && init) {
      checklistSetToggle("wx", true);
    }
  });

  scope.addEventListener("change", (e) => {
    const el = closest(e.target, SEL.checklist.fieldAny);
    if (!el || !scope.contains(el)) return;
    saveField(el.dataset.field, readValue(el));
  });
}