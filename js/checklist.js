// js/checklist.js
// Local-only Planning Checklist state (NOT part of fp storage.js)

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
function applyToggle(btn, checked) {
  btn.classList.toggle("is-checked", !!checked);
  btn.textContent = checked ? "CHECK" : "UNCHECK";
}

function flashReset(btn) {
  if (!btn) return;
  btn.classList.add("reset-success");
  setTimeout(() => btn.classList.remove("reset-success"), 300);
}

// ---------- Public helper for other modules (orm.js / app.js) ----------
export function checklistSetToggle(key, checked = true) {
  const btn = document.querySelector(`.tb[data-tb="${key}"]`);
  if (!btn) return;

  applyToggle(btn, checked);

  const s = readState();
  s.toggles = s.toggles || {};
  s.toggles[key] = !!checked;
  writeState(s);
}

// ---------- Main ----------
export function initChecklistUI() {
  // Scope to checklist view to avoid side effects in other views
  const scope = document.getElementById("view-checklist") || document;

  const toast = scope.querySelector("#checkToast") || document.getElementById("checkToast");

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("is-hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("is-hidden"), 2200);
  }

  // ---------- Restore ----------
  const state = readState();
  const toggles = state.toggles || {};
  const fields = state.fields || {};

  scope.querySelectorAll(".tb[data-tb]").forEach((tb) => {
    const key = tb.dataset.tb;
    if (key in toggles) applyToggle(tb, toggles[key]);
  });

  scope.querySelectorAll("[data-field]").forEach((inp) => {
    const key = inp.dataset.field;
    if (key in fields) inp.value = fields[key] ?? "";
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

  // ---------- Reset buttons ----------
  scope.querySelector("#btnResetChecklist")?.addEventListener("click", (e) => {
    // wipe whole checklist state
    localStorage.removeItem(STORAGE_KEY);

    // reset toggles
    scope.querySelectorAll(".tb[data-tb]").forEach((tb) => applyToggle(tb, false));

    // reset inputs
    scope.querySelectorAll("[data-field]").forEach((el) => (el.value = ""));

    flashReset(e.currentTarget);
  });

  scope.querySelector("#btnResetCheckmarks")?.addEventListener("click", (e) => {
    const s = readState();
    s.toggles = {};
    writeState(s);

    scope.querySelectorAll(".tb[data-tb]").forEach((tb) => applyToggle(tb, false));

    flashReset(e.currentTarget);
  });

  scope.querySelector("#btnResetWx")?.addEventListener("click", (e) => {
    const s = readState();
    s.fields = s.fields || {};

    delete s.fields.wx_nr;
    delete s.fields.wx_void;
    delete s.fields.wx_init;

    writeState(s);

    scope
      .querySelectorAll('[data-field="wx_nr"],[data-field="wx_void"],[data-field="wx_init"]')
      .forEach((el) => (el.value = ""));

    flashReset(e.currentTarget);
  });

  // ---------- Toggle click ----------
  scope.addEventListener("click", (e) => {
    const tb = e.target.closest(".tb[data-tb]");
    if (!tb || !scope.contains(tb)) return;

    const checked = !tb.classList.contains("is-checked");
    applyToggle(tb, checked);
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
    const el = e.target.closest("[data-field]");
    if (!el || !scope.contains(el)) return;

    // initials: uppercase while typing
    if (el.dataset.field === "wx_init") {
      const pos = el.selectionStart ?? el.value.length;
      el.value = String(el.value).toUpperCase();
      try { el.setSelectionRange(pos, pos); } catch {}
    }

    debounceSaveField(el.dataset.field, el.value);

    // Wx auto-check if complete
    const nr = scope.querySelector('[data-field="wx_nr"]')?.value?.trim();
    const voidv = scope.querySelector('[data-field="wx_void"]')?.value?.trim();
    const init = scope.querySelector('[data-field="wx_init"]')?.value?.trim();

    if (nr && voidv && init) {
      checklistSetToggle("wx", true);
    }
  });

  scope.addEventListener("change", (e) => {
    const el = e.target.closest("[data-field]");
    if (!el || !scope.contains(el)) return;
    saveField(el.dataset.field, el.value);
  });

  // ---------- Phone Buttons ----------
  scope.addEventListener("click", (e) => {
    const b = e.target.closest(".phone-btn");
    if (!b || !scope.contains(b)) return;

    const label = b.dataset.phoneLabel || b.textContent.trim();
    const phone = b.dataset.phone || "";
    if (!phone) return;

    showToast(`${label}: ${phone}`);
  });
}