// js/legs.js
export function initLegActivation({ onChange } = {}) {
  const LEG_MIN = 2;
  const LEG_MAX = 4;

  function getLegFrame(legNum) {
    // wir finden das Frame über den Toggle-Button mit data-leg
    const btn = document.querySelector(`.legToggle[data-leg="${legNum}"]`);
    return btn ? btn.closest(".frame") : null;
  }

  function setLegState(legNum, state) {
    const frame = getLegFrame(legNum);
    if (!frame) return;

    const btn = frame.querySelector(".legToggle");
    const inactive = state === "inactive";

    if (btn) {
      btn.dataset.state = state;
      btn.textContent = state.toUpperCase();
    }

    frame.classList.toggle("inactiveFields", inactive);

    // nur legFields deaktivieren (so wie bisher)
    frame.querySelectorAll(".legField").forEach((f) => {
      f.disabled = inactive;
    });
  }

  function applyCascade(clickedLeg, newState) {
    // Wenn ein niedriges Leg inaktiv wird -> alle höheren auch inaktiv
    if (newState === "inactive") {
      for (let l = clickedLeg; l <= LEG_MAX; l++) setLegState(l, "inactive");
    }

    // Wenn ein hohes Leg aktiv wird -> alle niedrigeren müssen aktiv sein
    if (newState === "active") {
      for (let l = LEG_MIN; l <= clickedLeg; l++) setLegState(l, "active");
    }
  }

  function copyPrevLegToThis(legNum) {
    // legNum (2..4) bekommt: from = prev.to
    const prevFrame = getLegFrame(legNum - 1);
    const thisFrame = getLegFrame(legNum);
    if (!prevFrame || !thisFrame) return;

    const prevTo = prevFrame.querySelector("input.aeroTo");
    const thisFrom = thisFrame.querySelector("input.aeroFrom");

    if (!prevTo || !thisFrom) return;

    const val = (prevTo.value || "").toUpperCase().trim();
    if (!val) return;

    // Nur überschreiben, wenn leer oder wenn du “immer überschreiben” willst:
    if (!thisFrom.value.trim()) {
      thisFrom.value = val;
      // damit deine Marker/Validation anspringen:
      thisFrom.dispatchEvent(new Event("input", { bubbles: true }));
      thisFrom.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function fillChainFrom(legStart) {
    // Wenn Leg 2/3/4 aktiv ist, ziehe automatisch die Kette nach
    for (let l = Math.max(2, legStart); l <= LEG_MAX; l++) {
      const frame = getLegFrame(l);
      if (!frame) continue;

      const btn = frame.querySelector(".legToggle");
      if (!btn || btn.dataset.state !== "active") continue;

      copyPrevLegToThis(l);
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target;
    if (!btn.classList?.contains("legToggle")) return;

    const legNum = Number(btn.dataset.leg);
    if (!Number.isFinite(legNum)) return;

    const isActive = btn.dataset.state === "active";
    const newState = isActive ? "inactive" : "active";

    applyCascade(legNum, newState);

    // Wenn ein Leg aktiv ist/aktiv wird -> From-Feld füllen
    if (newState === "active") {
      copyPrevLegToThis(legNum);
      fillChainFrom(legNum);
    }

    if (typeof onChange === "function") onChange();
  });

  // Initialzustand sauber anwenden (falls du später default inactive setzen willst)
  for (let l = LEG_MIN; l <= LEG_MAX; l++) {
    const frame = getLegFrame(l);
    if (!frame) continue;

    const btn = frame.querySelector(".legToggle");
    const state = btn?.dataset?.state || "active";
    setLegState(l, state);
  }

  // Initial: Kette füllen (falls Leg 2..4 schon aktiv sind)
  fillChainFrom(2);
}