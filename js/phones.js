// js/phones.js
import { loadConfig } from "./config_store.js";
import { qs, setText, SEL } from "./ui/index.js";

function showToast(msg) {
  const toast = qs(SEL.checklist.toast) || document.querySelector("#checkToast");
  if (!toast) {
    alert(msg);
    return;
  }
  toast.classList.remove("is-hidden");
  toast.textContent = msg;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("is-hidden"), 3500);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function initPhones() {
  // Event Delegation: funktioniert auch für später nachgeladenes partial
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-phone-key]");
    if (!btn) return;

    e.preventDefault();

    // 1) Config laden (fordert Passwort an, falls locked – je nach eurem loadConfig Verhalten)
    let cfg;
    try {
      cfg = await loadConfig(); // nutzt eure bestehende Passwort-Logik
    } catch (err) {
      showToast("Config gesperrt oder Passwort falsch.");
      return;
    }

    const key = btn.getAttribute("data-phone-key");
    const entry = cfg?.phones?.[key];

    if (!entry) {
      showToast(`Telefonnummer nicht in Config: ${key}`);
      return;
    }

    const label = entry.label || btn.textContent.trim() || key;
    const tel = entry.tel || entry;

    // 2) Anzeige
    const copied = await copyToClipboard(tel);
    showToast(`${label}: ${tel}${copied ? " (kopiert)" : ""}`);

    // Optional: klickbares tel:-Link Verhalten statt/zusätzlich:
    // window.location.href = `tel:${tel.replace(/\s+/g, "")}`;
  });
}