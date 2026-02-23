// js/ui/read.js
import { el } from "./dom.js";

/**
 * Liest textContent aus output, div, span, etc.
 */
export function readText(ref, root = document) {
  const node = el(ref, root);
  if (!node) return "";
  return node.textContent ?? "";
}


/**
 * Liest value aus input, select, textarea
 */
export function readValue(ref, root = document) {
  const node = el(ref, root);
  if (!node) return "";

  if (node.type === "checkbox") return !!node.checked;

  return node.value ?? "";
}


/**
 * Liest dataset value
 */
export function readData(ref, key, root = document) {
  const node = el(ref, root);
  if (!node) return undefined;

  return node.dataset?.[key];
}


/**
 * Prüft ob Element disabled ist
 */
export function isDisabled(ref, root = document) {
  const node = el(ref, root);
  if (!node) return false;

  return !!node.disabled;
}


/**
 * Prüft ob Klasse vorhanden ist
 */
export function hasClass(ref, className, root = document) {
  const node = el(ref, root);
  if (!node) return false;

  return node.classList.contains(className);
}