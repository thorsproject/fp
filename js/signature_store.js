// js/signature_store.js
const KEY_DATAURL = "fp.sig.dataUrl.v1";

export function getSignatureDataUrl() {
  try {
    const v = localStorage.getItem(KEY_DATAURL);
    return v && v.startsWith("data:image/") ? v : null;
  } catch {
    return null;
  }
}

export function setSignatureDataUrl(dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:image/")) {
    throw new Error("Invalid signature dataUrl");
  }
  localStorage.setItem(KEY_DATAURL, dataUrl);
}

export function clearSignatureDataUrl() {
  localStorage.removeItem(KEY_DATAURL);
}

export function hasSignature() {
  return !!getSignatureDataUrl();
}