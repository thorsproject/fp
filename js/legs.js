export function initLegActivation({ onChange } = {}) {

  document.addEventListener("click", (e) => {
    const btn = e.target;
    if (!btn.classList?.contains("legToggle")) return;

    const frame = btn.closest(".frame");
    if (!frame) return;

    const fields = frame.querySelectorAll(".legField");

    const isActive = btn.dataset.state === "active";
    const newState = isActive ? "inactive" : "active";

    btn.dataset.state = newState;
    btn.textContent = newState.toUpperCase();

    const inactive = newState === "inactive";

    fields.forEach((f) => {
      f.disabled = inactive;
    });

    frame.classList.toggle("inactiveFields", inactive);

    if (typeof onChange === "function") onChange();
  });

  // Initialzustand anwenden
  document.querySelectorAll(".legToggle").forEach((btn) => {
    const frame = btn.closest(".frame");
    const fields = frame.querySelectorAll(".legField");
    const inactive = btn.dataset.state === "inactive";

    fields.forEach((f) => (f.disabled = inactive));
    frame.classList.toggle("inactiveFields", inactive);
  });
}