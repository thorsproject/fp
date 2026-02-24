// js/attachments.js
import { EVT, emit } from "./ui/index.js";
const ATTACHMENTS = new Map(); // key -> { name, type, getArrayBuffer() }

// ---------- Debug-Option ----------
const DEBUG_ATTACH = false;
function dlog(...args) {
  if (DEBUG_ATTACH) console.log("[attachments]", ...args);
}
// ---------- Debug-Option Ende ----------

export async function collectAttachments() {
  const out = [];
  for (const item of ATTACHMENTS.values()) {
    const ab = await item.getArrayBuffer();
    out.push(new File([ab], item.name, { type: item.type || "application/octet-stream" }));
  }
  return out;
}

export function hasAttachment(key) {
  return ATTACHMENTS.has(key);
}

function emitChanged() {
  emit(EVT.attachmentsChanged, { keys: Array.from(registry.keys()) });
}

export function registerAttachment(key, { name, type, getArrayBuffer }) {
  ATTACHMENTS.set(key, { name, type, getArrayBuffer });
  emitChanged({ action: "register", key, name, type });
  dlog("register", key, name);
}

export function removeAttachment(key) {
  const existed = ATTACHMENTS.delete(key);
  if (existed) emitChanged({ action: "remove", key });
  dlog("remove", key);
}

// ---------- Debug / UI helpers ----------
/**
 * Liefert Liste aller Attachments (ohne Daten zu laden)
 * @returns Array<{ key, name, type }>
 */
export function listAttachments() {
  const out = [];
  for (const [key, item] of ATTACHMENTS.entries()) {
    out.push({
      key,
      name: item.name,
      type: item.type || "application/octet-stream",
    });
  }
  return out;
}

/**
 * Liefert Metadaten eines Attachments
 */
export function getAttachment(key) {
  const item = ATTACHMENTS.get(key);
  if (!item) return null;

  return {
    key,
    name: item.name,
    type: item.type || "application/octet-stream",
  };
}

/**
 * Optional: alle Attachments löschen (z.B. Reset / Debug)
 */
export function clearAttachments() {
  if (ATTACHMENTS.size === 0) return;
  ATTACHMENTS.clear();
  emitChanged({ action: "clear" });
}