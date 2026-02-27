// js/phones.js
import { loadConfig } from "./config_store.js";
import { qs, setText, SEL } from "./ui/index.js";
import { showPhonePopup, initPhonePopup } from "./phone_popup.js";

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function initPhones() {
  // sorgt dafür, dass das Popup DOM existiert
  initPhonePopup();
  // Event Delegation: funktioniert auch für später nachgeladenes partial
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-phone-key]");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    // 1) Config laden (fordert Passwort an, falls locked – je nach eurem loadConfig Verhalten)
    let cfg;
    try {
      cfg = await loadConfig(); // nutzt eure bestehende Passwort-Logik
    } catch (err) {
      showPhonePopup({ label: "Config", number: "Gesperrt oder Passwort falsch." });
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

    // 2) Popup anzeigen
    showPhonePopup({ label, number: tel });

    // Optional: trotzdem automatisch kopieren (wenn du willst)
    // await copyToClipboard(tel);
  });
}