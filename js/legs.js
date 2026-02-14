// js/legs.js
export function initLegActivation({ onChange } = {}) {
  // Reagiert auch, wenn du später dynamisch Legs hinzufügen würdest
  document.addEventListener("change", (e) => {
    const sel = e.target;
    if (!sel.classList?.contains("activeToggle")) return;

    const frame = sel.closest(".frame");
    if (!frame) return;

    const fields = frame.querySelectorAll(".legField");
    const inactive = sel.value === "inactive";

    fields.forEach((f) => {
      f.disabled = inactive;
      // optional: leeren wenn inactive
      // if (inactive) f.value = "";
    });

    frame.classList.toggle("inactiveFields", inactive);

    // Callback (z.B. Marker neu zeichnen)
    if (typeof onChange === "function") onChange();
  });

  // Beim Laden direkt einmal anwenden (falls Leg 2–4 schon auf inactive stehen)
  document.querySelectorAll(".activeToggle").forEach((sel) => {
    const frame = sel.closest(".frame");
    if (!frame) return;

    const fields = frame.querySelectorAll(".legField");
    const inactive = sel.value === "inactive";

    fields.forEach((f) => (f.disabled = inactive));
    frame.classList.toggle("inactiveFields", inactive);
  });
}
