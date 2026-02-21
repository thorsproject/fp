// js/attachments.js
const ATTACHMENTS = new Map(); // key -> { name, type, getArrayBuffer() }

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
  window.dispatchEvent(new CustomEvent("fp:attachments-changed"));
}

export function registerAttachment(key, { name, type, getArrayBuffer }) {
  ATTACHMENTS.set(key, { name, type, getArrayBuffer });
  emitChanged();
}

export function removeAttachment(key) {
  ATTACHMENTS.delete(key);
  emitChanged();
}