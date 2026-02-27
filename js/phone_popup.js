// js/phone_popup.js
import { qs, setText } from "./ui/index.js";

const SEL_POPUP = {
  root: "#phonePopup",
  label: "#phonePopupLabel",
  number: "#phonePopupNumber",
  copy: "#phonePopupCopy",
  close: "[data-phone-popup-close]",
};

let lastNumber = "";

function showRoot(show) {
  const root = qs(SEL_POPUP.root);
  if (!root) return;
  root.classList.toggle("is-hidden", !show);
  root.setAttribute("aria-hidden", show ? "false" : "true");
}

export function showPhonePopup({ label = "", number = "" }) {
  lastNumber = String(number || "");

  setText(SEL_POPUP.label, label);
  setText(SEL_POPUP.number, lastNumber);

  showRoot(true);
}

export function hidePhonePopup() {
  showRoot(false);
}

export function initPhonePopup() {
  const root = qs(SEL_POPUP.root);
  if (!root) return;

  // Close handlers (backdrop + button)
  root.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.closest?.(SEL_POPUP.close)) hidePhonePopup();
  });

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !root.classList.contains("is-hidden")) {
      hidePhonePopup();
    }
  });

  // Copy
  const btnCopy = qs(SEL_POPUP.copy);
  btnCopy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastNumber);
      // optional: kurzes Feedback
      btnCopy.textContent = "Kopiert!";
      setTimeout(() => (btnCopy.textContent = "Kopieren"), 900);
    } catch {
      // fallback: nix
    }
  });
}