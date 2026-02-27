// js/phones.js
import { loadConfig } from "./config_store.js";
import { initPhonePopup, showPhonePopup } from "./phone_popup.js";

export function initPhones() {
  initPhonePopup();

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-phone-key]");
    if (!btn) return;

    e.preventDefault();

    let cfg;
    try {
      cfg = await loadConfig();
    } catch {
      showPhonePopup({
        label: "Telefonnummer",
        number: "Die Telefonnummer kann erst angezeigt werden, wenn unter Settings das Passwort eingegeben wurde.",
      });
      return;
    }

    const key = btn.getAttribute("data-phone-key");
    const entry = cfg?.phones?.[key];

    if (!entry) {
      showPhonePopup({ label: "Telefon", number: `Nicht in Config: ${key}` });
      return;
    }

    const label = entry.label || btn.textContent.trim() || key;
    const tel = entry.tel || entry;

    showPhonePopup({ label, number: tel });
  });
}