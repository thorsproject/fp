// js/ui/dom.js - DOM Zugriff (lesen, finden)
// Ziel: Keine “wild verstreuten” querySelector mehr + zentrale Fehlerfreiheit.

export function qs(sel, root = document) {
  if (!root) return null;
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(sel));
}

/**
 * Robust: gibt Element zurück, auch wenn du ein Element statt Selector übergibst.
 */
export function el(ref, root = document) {
  if (!ref) return null;
  if (typeof ref === "string") return qs(ref, root);
  return ref; // HTML-Element
}

/**
 * closest wrapper
 */
export function closest(target, sel) {
  return target?.closest?.(sel) || null;
}