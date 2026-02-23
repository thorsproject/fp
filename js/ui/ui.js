// js/ui/ui.js – Schreiben + UI Events
// Ziel: EIN Weg, Text/Value/Classes/Disabled zu setzen.

import { el } from "./dom.js";

export function setText(ref, text = "", root = document) {
  const node = el(ref, root);
  if (!node) return false;
  node.textContent = text ?? "";
  return true;
}

export function setHTML(ref, html = "", root = document) {
  const node = el(ref, root);
  if (!node) return false;
  node.innerHTML = html ?? "";
  return true;
}

/**
 * Für input/select/textarea
 * by default feuern wir input+change, weil deine App darauf reagiert (autosave, calc, validation)
 */
export function setValue(ref, value = "", { root = document, emit = true } = {}) {
  const node = el(ref, root);
  if (!node) return false;

  node.value = value ?? "";

  if (emit) {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return true;
}

export function setDisabled(ref, disabled = true, root = document) {
  const node = el(ref, root);
  if (!node) return false;
  node.disabled = !!disabled;
  return true;
}

export function toggleClass(ref, className, on = true, root = document) {
  const node = el(ref, root);
  if (!node) return false;
  node.classList.toggle(className, !!on);
  return true;
}

export function setData(ref, key, value, root = document) {
  const node = el(ref, root);
  if (!node) return false;
  node.dataset[key] = String(value);
  return true;
}

/**
 * “Batch” Helper: mehrere Felder auf einmal leeren.
 * emit default true, weil deine App darauf reagiert.
 */
export function clearValues(refs, { emit = true } = {}) {
  for (const r of refs) setValue(r, "", { emit });
}