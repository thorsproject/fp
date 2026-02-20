const STORAGE_KEY = "fp_checklist_v1";

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

function applyToggle(el, checked) {
  el.classList.toggle("is-checked", !!checked);
  el.textContent = checked ? "CHECK" : "UNCHECK";
}

export function checklistSetToggle(key, checked = true) {

  const tb = document.querySelector(`.tb[data-tb="${key}"]`);
  if (!tb) return;

  applyToggle(tb, checked);

  const s = readState();
  s.toggles = s.toggles || {};
  s.toggles[key] = !!checked;
  writeState(s);
}

export function initChecklistUI() {
  const toast = document.getElementById("checkToast");

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
  const fields  = state.fields  || {};

  document.querySelectorAll(".tb[data-tb]").forEach((tb) => {
    const key = tb.dataset.tb;
    if (key in toggles) applyToggle(tb, toggles[key]);
  });

  document.querySelectorAll("[data-field]").forEach((inp) => {
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

  // INITIALS automatisch uppercase
  document.addEventListener("input", (e) => {
    const el = e.target.closest('[data-field="wx_init"]');
    if (!el) return;

    const pos = el.selectionStart;
    el.value = el.value.toUpperCase();
    el.setSelectionRange(pos, pos);
  });

  document.getElementById("btnResetChecklist")?.addEventListener("click", () => {

    // kompletten Checklist State löschen
    localStorage.removeItem(STORAGE_KEY);

    // alle Checkmarks resetten
    document.querySelectorAll(".tb[data-tb]").forEach((tb) => {
      applyToggle(tb, false);
    });

    // alle Eingabefelder resetten
    document.querySelectorAll("[data-field]").forEach((el) => {
      el.value = "";
    });

  });

  document.getElementById("btnResetCheckmarks")?.addEventListener("click", () => {

    // if (!confirm("Alle Checkmarks zurücksetzen?")) return;    <--- aktivieren, wenn Abfrage erfolgen soll

    const s = readState();
    s.toggles = {};
    writeState(s);

    document.querySelectorAll(".tb[data-tb]").forEach((tb) => {
      applyToggle(tb, false);
    });

  });

  document.getElementById("btnResetWx")?.addEventListener("click", () => {

    // if (!confirm("Wx Felder zurücksetzen?")) return;    <--- aktivieren, wenn Abfrage erfolgen soll

    const s = readState();
    s.fields = s.fields || {};

    delete s.fields.wx_nr;
    delete s.fields.wx_void;
    delete s.fields.wx_init;

    writeState(s);

    document.querySelectorAll('[data-field="wx_nr"],[data-field="wx_void"],[data-field="wx_init"]')
      .forEach(el => el.value = "");

  });

  // ---------- Toggle click ----------
  document.addEventListener("click", (e) => {
    const tb = e.target.closest(".tb[data-tb]");
    if (!tb) return;

    const checked = !tb.classList.contains("is-checked");
    applyToggle(tb, checked);
    saveToggle(tb.dataset.tb, checked);
  });

  // ---------- Inputs ----------
  // input + change => speichern (debounced pro field)
  const timers = new Map();

  function debounceSaveField(key, value) {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => saveField(key, value), 200));
  }

  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-field]");
    if (!el) return;
    debounceSaveField(el.dataset.field, el.value);
    // Wx Autofill Check
    const nr   = document.querySelector('[data-field="wx_nr"]')?.value?.trim();
    const voidv= document.querySelector('[data-field="wx_void"]')?.value?.trim();
    const init = document.querySelector('[data-field="wx_init"]')?.value?.trim();
    if (nr && voidv && init) {
      checklistSetToggle("wx", true);
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-field]");
    if (!el) return;
    saveField(el.dataset.field, el.value);
  });

  // ---------- Phone Buttons ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".phone-btn");
    if (!b) return;
    const label = b.dataset.phoneLabel || b.textContent.trim();
    const phone = b.dataset.phone || "";
    if (!phone) return;
    showToast(`${label}: ${phone}`);
  });
}