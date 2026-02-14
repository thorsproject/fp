export function initLegActivation({ onChange } = {}) {
  const LEG_MIN = 2;
  const LEG_MAX = 4;

  function getLegFrame(legNum) {
    if (legNum === 1) {
      // Leg 1 hat keinen Toggle → wir nehmen das erste Leg-Frame
      return document.querySelector("#legsContainer .frame:nth-of-type(1)");
    }
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

  function fillChain() {
    for (let l = LEG_MIN; l <= LEG_MAX; l++) {
      const frame = getLegFrame(l);
      if (!frame) continue;

      const btn = frame.querySelector(".legToggle");
      if (btn && btn.dataset.state === "inactive") continue;

      copyPrevLegToThis(l);
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
    const btn = e.target;
    if (!btn.classList?.contains("legToggle")) return;

    const legNum = Number(btn.dataset.leg);
    const isActive = btn.dataset.state === "active";
    const newState = isActive ? "inactive" : "active";

    applyCascade(legNum, newState);

    fillChain();

    if (typeof onChange === "function") onChange();
  });

  // 🔥 NEU: Reagiere auf Änderungen im aeroTo
  document.addEventListener("change", (e) => {
    if (!e.target.classList.contains("aeroTo")) return;

    fillChain();

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