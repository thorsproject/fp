// js/phone_popup.js
import { qs } from "./ui/index.js";

const ID = {
  root: "#phonePopup",
  label: "#phonePopupLabel",
  number: "#phonePopupNumber",
  hint: "#phonePopupHint",
  copyBtn: "#phonePopupCopyBtn",
  callLink: "#phonePopupCallLink",
};

function normalizeTel(tel) {
  return String(tel || "").trim();
}
function toTelHref(tel) {
  const cleaned = normalizeTel(tel).replace(/[()\-\s]/g, "");
  return cleaned ? `tel:${cleaned}` : "#";
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function initPhonePopup() {
  const root = qs(ID.root);
  if (!root) return;

  // Close (Backdrop + Buttons)
  root.addEventListener("click", (e) => {
    if (!e.target.closest("[data-phone-popup-close]")) return;
    hidePhonePopup();
  });

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (root.classList.contains("is-hidden")) return;
    hidePhonePopup();
  });

  // Copy
  qs(ID.copyBtn)?.addEventListener("click", async () => {
    const numberEl = qs(ID.number);
    const hintEl = qs(ID.hint);
    const tel = numberEl?.textContent || "";
    const ok = await copyToClipboard(tel);
    if (hintEl) hintEl.textContent = ok ? "Nummer kopiert ✅" : "Kopieren nicht möglich.";

    clearTimeout(initPhonePopup._t);
    initPhonePopup._t = setTimeout(() => {
      if (hintEl) hintEl.textContent = "";
    }, 1500);
  });
}

export function showPhonePopup({ label = "Telefon", number = "" } = {}) {
  const root = qs(ID.root);
  if (!root) return;

  const labelEl = qs(ID.label);
  const numberEl = qs(ID.number);
  const hintEl = qs(ID.hint);
  const callLink = qs(ID.callLink);

  if (labelEl) labelEl.textContent = String(label || "");
  if (numberEl) numberEl.textContent = normalizeTel(number);
  if (hintEl) hintEl.textContent = "";

  if (callLink) {
    const href = toTelHref(number);
    callLink.setAttribute("href", href);
    if (href === "#") callLink.classList.add("is-disabled");
    else callLink.classList.remove("is-disabled");
  }

  root.classList.remove("is-hidden");
  root.setAttribute("aria-hidden", "false");

  // Fokus auf Close
  root.querySelector(".phone-popup__close")?.focus?.();
}

export function hidePhonePopup() {
  const root = qs(ID.root);
  if (!root) return;
  root.classList.add("is-hidden");
  root.setAttribute("aria-hidden", "true");
}