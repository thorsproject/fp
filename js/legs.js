// js/legs.js

import { isLegAutofillMuted } from "./ui/state.js";

export function initLegActivation({ onChange } = {}) {
  const LEG_MIN = 2;
  const LEG_MAX = 4;

  function getLegFrame(legNum) {
    if (legNum === 1) {
      // Leg 1 hat keinen Toggle → wir nehmen das erste Leg-Panel
      return document.querySelector("#legsContainer .c-panel:nth-of-type(1)");
    }
    const btn = document.querySelector(`.legToggle[data-leg="${legNum}"]`);
    return btn ? btn.closest(".c-panel") : null;
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

    frame.querySelectorAll(".legField").forEach((f) => {
      f.disabled = inactive;
    });
  }

  function copyPrevLegToThis(legNum, force = false) {
    if (legNum < 2) return;

    const prevFrame = getLegFrame(legNum - 1);
    const thisFrame = getLegFrame(legNum);
    if (!prevFrame || !thisFrame) return;

    const prevTo = prevFrame.querySelector("input.aeroTo");
    const thisFrom = thisFrame.querySelector("input.aeroFrom");

    if (!prevTo || !thisFrom) return;

    const val = (prevTo.value || "").toUpperCase().trim();
    if (!val) return;

    if (force || !thisFrom.value.trim()) {
      thisFrom.value = val;
      thisFrom.dispatchEvent(new Event("input", { bubbles: true }));
      thisFrom.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function copyPrevTimesToThis(legNum, force = false) {
    if (legNum < 2) return;

    const prevFrame = getLegFrame(legNum - 1);
    const thisFrame = getLegFrame(legNum);
    if (!prevFrame || !thisFrame) return;

    const prevETA = prevFrame.querySelector("input.eta");
    const thisETD = thisFrame.querySelector("input.etd");
    if (!prevETA || !thisETD) return;

    const val = (prevETA.value || "").trim();
    if (!val) return;

    if (force || !thisETD.value.trim()) {
      thisETD.value = val;
      thisETD.dispatchEvent(new Event("input", { bubbles: true }));
      thisETD.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function resetFromAndEtdFromPrev(legNum) {
    if (legNum < 2) return;

    const prevFrame = getLegFrame(legNum - 1);
    const thisFrame = getLegFrame(legNum);

    if (!prevFrame || !thisFrame) {
      console.warn("[LEG RESET] frames not found", { legNum, prevFrame: !!prevFrame, thisFrame: !!thisFrame });
      return;
    }

    const prevTo = prevFrame.querySelector("input.aeroTo");
    const prevETA = prevFrame.querySelector("input.eta");

    const thisFrom = thisFrame.querySelector("input.aeroFrom");
    const thisETD = thisFrame.querySelector("input.etd");

    // ICAO FROM übernehmen
    if (prevTo && thisFrom) {
      const icao = (prevTo.value || "").toUpperCase().trim();
      if (icao) {
        thisFrom.value = icao;
        thisFrom.dispatchEvent(new Event("input", { bubbles: true }));
        thisFrom.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    // ETD übernehmen = ETA vom Vorleg
    if (prevETA && thisETD) {
      const t = (prevETA.value || "").trim();
      if (t) {
        thisETD.value = t;
        thisETD.dispatchEvent(new Event("input", { bubbles: true }));
        thisETD.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  function fillChain() {
    for (let l = LEG_MIN; l <= LEG_MAX; l++) {
      const frame = getLegFrame(l);
      if (!frame) continue;

      const btn = frame.querySelector(".legToggle");
      if (btn && btn.dataset.state === "inactive") continue;

      copyPrevLegToThis(l);
      copyPrevTimesToThis(l);
    }
  }

  function applyCascade(clickedLeg, newState) {
    if (newState === "inactive") {
      for (let l = clickedLeg; l <= LEG_MAX; l++) setLegState(l, "inactive");
    }

    if (newState === "active") {
      for (let l = LEG_MIN; l <= clickedLeg; l++) setLegState(l, "active");
    }
  }

  // Toggle-Klick
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".legToggle");
    if (!btn) return;

    const legNum = Number(btn.dataset.leg);
    const isActive = btn.dataset.state === "active";
    const newState = isActive ? "inactive" : "active";

    applyCascade(legNum, newState);
    fillChain();

    // Wenn gerade aktiviert wurde → Reset FROM + ETD
    if (newState === "active") {
      resetFromAndEtdFromPrev(legNum);
    }

    if (typeof onChange === "function") onChange();
  });

  // Wenn sich TO (oder ETA) ändert: nächstes Leg hart updaten (wenn aktiv)
  document.addEventListener("change", (e) => {
    if (isLegAutofillMuted()) return;

    const isTo = e.target.classList.contains("aeroTo");
    const isEta = e.target.classList.contains("eta");
    if (!isTo && !isEta) return;

    const frame = e.target.closest(".c-panel");
    if (!frame) return;

    // Leg-Nummer aus Toggle-Button im selben Frame ableiten:
    // Leg1 hat keinen Toggle -> behandeln wir als 1
    const toggle = frame.querySelector(".legToggle");
    const thisLegNum = toggle ? Number(toggle.dataset.leg) : 1;

    const nextLegNum = thisLegNum + 1;
    if (nextLegNum < 2 || nextLegNum > 4) return;

    // nur wenn nächstes Leg aktiv ist
    const nextFrame = getLegFrame(nextLegNum);
    const nextBtn = nextFrame?.querySelector(".legToggle");
    const nextIsInactive = nextBtn && nextBtn.dataset.state === "inactive";
    if (nextIsInactive) return;

    // erst normal, dann hart setzen
    fillChain();
    resetFromAndEtdFromPrev(nextLegNum);

    if (typeof onChange === "function") onChange();
  });

  // Initialzustand
  for (let l = LEG_MIN; l <= LEG_MAX; l++) {
    const frame = getLegFrame(l);
    if (!frame) continue;

    const btn = frame.querySelector(".legToggle");
    const state = btn?.dataset?.state || "active";
    setLegState(l, state);
  }

  fillChain();
}