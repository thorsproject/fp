// js/legs.js
import { qs, qsa, closest, isLegAutofillMuted, SEL } from "./ui/index.js";

// ---------- Debug-Funktion bei Bedarf ----------
const DEBUG_LEGS = false; // <- auf true setzen, wenn du Logs willst
function dlog(...args) {
  if (!DEBUG_LEGS) return;
  console.log("[legs]", ...args);
}
// ---------- Debug-Funktion Ende ----------

export function initLegActivation({ onChange } = {}) {
  const LEG_MIN = 2;
  const LEG_MAX = 4;

  // ---------- helpers ----------
  function getLegFrames() {
    return qsa(SEL.legs.frames);
  }

  function getLegFrame(legNum) {
    const frames = getLegFrames();
    if (!frames.length) return null;

    // Leg 1 hat keinen Toggle → ist immer das erste Panel
    if (legNum === 1) return frames[0] || null;

    const btn = qs(SEL.legs.toggleByLeg(legNum));
    return btn ? closest(btn, SEL.legs.frames) : null; // <— nutzt eure zentrale Struktur
  }

  function setLegState(legNum, state) {
    const frame = getLegFrame(legNum);
    if (!frame) return;

    const btn = qs(SEL.legs.toggle, frame);
    const inactive = state === "inactive";

    if (btn) {
      btn.dataset.state = state;
      btn.textContent = state.toUpperCase(); // ACTIVE / INACTIVE
      btn.classList.toggle("inactive", inactive);
    }

    frame.classList.toggle("inactiveFields", inactive);

    qsa(".legField", frame).forEach((f) => {
      f.disabled = inactive;
    });

    dlog("setLegState", { legNum, state });
  }

  function copyPrevLegToThis(legNum, force = false) {
    if (legNum < 2) return;

    const prevFrame = getLegFrame(legNum - 1);
    const thisFrame = getLegFrame(legNum);
    if (!prevFrame || !thisFrame) return;

    const prevTo = qs("input.aeroTo", prevFrame);
    const thisFrom = qs("input.aeroFrom", thisFrame);
    if (!prevTo || !thisFrom) return;

    const val = (prevTo.value || "").toUpperCase().trim();
    if (!val) return;

    if (force || !thisFrom.value.trim()) {
      thisFrom.value = val;
      thisFrom.dispatchEvent(new Event("input", { bubbles: true }));
      thisFrom.dispatchEvent(new Event("change", { bubbles: true }));
      dlog("copyPrevLegToThis", { legNum, val });
    }
  }

  function copyPrevTimesToThis(legNum, force = false) {
    if (legNum < 2) return;

    const prevFrame = getLegFrame(legNum - 1);
    const thisFrame = getLegFrame(legNum);
    if (!prevFrame || !thisFrame) return;

    const prevETA = qs("input.eta", prevFrame);
    const thisETD = qs("input.etd", thisFrame);
    if (!prevETA || !thisETD) return;

    const val = (prevETA.value || "").trim();
    if (!val) return;

    if (force || !thisETD.value.trim()) {
      thisETD.value = val;
      thisETD.dispatchEvent(new Event("input", { bubbles: true }));
      thisETD.dispatchEvent(new Event("change", { bubbles: true }));
      dlog("copyPrevTimesToThis", { legNum, val });
    }
  }

  function resetFromAndEtdFromPrev(legNum) {
    if (legNum < 2) return;

    const prevFrame = getLegFrame(legNum - 1);
    const thisFrame = getLegFrame(legNum);

    if (!prevFrame || !thisFrame) {
      dlog("resetFromAndEtdFromPrev: frames missing", {
        legNum,
        prevFrame: !!prevFrame,
        thisFrame: !!thisFrame,
      });
      return;
    }

    const prevTo = qs("input.aeroTo", prevFrame);
    const prevETA = qs("input.eta", prevFrame);

    const thisFrom = qs("input.aeroFrom", thisFrame);
    const thisETD = qs("input.etd", thisFrame);

    // ICAO FROM übernehmen
    if (prevTo && thisFrom) {
      const icao = (prevTo.value || "").toUpperCase().trim();
      if (icao) {
        thisFrom.value = icao;
        thisFrom.dispatchEvent(new Event("input", { bubbles: true }));
        thisFrom.dispatchEvent(new Event("change", { bubbles: true }));
        dlog("reset FROM", { legNum, icao });
      }
    }

    // ETD übernehmen = ETA vom Vorleg
    if (prevETA && thisETD) {
      const t = (prevETA.value || "").trim();
      if (t) {
        thisETD.value = t;
        thisETD.dispatchEvent(new Event("input", { bubbles: true }));
        thisETD.dispatchEvent(new Event("change", { bubbles: true }));
        dlog("reset ETD", { legNum, t });
      }
    }
  }

  function fillChain() {
    dlog("fillChain start");
    for (let l = LEG_MIN; l <= LEG_MAX; l++) {
      const frame = getLegFrame(l);
      if (!frame) continue;

      const btn = qs(SEL.legs.toggle, frame);
      if (btn && btn.dataset.state === "inactive") {
        dlog("fillChain skip inactive", { leg: l });
        continue;
      }

      copyPrevLegToThis(l);
      copyPrevTimesToThis(l);
    }
    dlog("fillChain end");
  }

  function applyCascade(clickedLeg, newState) {
    dlog("applyCascade", { clickedLeg, newState });

    if (newState === "inactive") {
      for (let l = clickedLeg; l <= LEG_MAX; l++) setLegState(l, "inactive");
    }

    if (newState === "active") {
      for (let l = LEG_MIN; l <= clickedLeg; l++) setLegState(l, "active");
    }
  }

  // ---------- Toggle-Klick ----------
  document.addEventListener("click", (e) => {
    const btn = closest(e.target, SEL.legs.toggle);
    if (!btn) return;

    const legNum = Number(btn.dataset.leg);
    if (!Number.isFinite(legNum)) {
      dlog("toggle click ignored: invalid data-leg", { raw: btn.dataset.leg });
      return;
    }

    const isActive = btn.dataset.state === "active";
    const newState = isActive ? "inactive" : "active";

    dlog("toggle click", { legNum, from: btn.dataset.state, to: newState });

    applyCascade(legNum, newState);
    fillChain();

    if (newState === "active") {
      resetFromAndEtdFromPrev(legNum);
    }

    if (typeof onChange === "function") onChange();
  });

  // ---------- Wenn sich TO (oder ETA) ändert: nächstes Leg hart updaten ----------
  document.addEventListener("change", (e) => {
    if (isLegAutofillMuted()) return;

    const t = e.target;
    const isTo = t?.classList?.contains("aeroTo");
    const isEta = t?.classList?.contains("eta");
    if (!isTo && !isEta) return;

    const frame = closest(t, SEL.legs.frames);
    if (!frame) return;

    const toggle = qs(SEL.legs.toggle, frame);
    const thisLegNum = toggle ? Number(toggle.dataset.leg) : 1;

    const nextLegNum = thisLegNum + 1;
    if (nextLegNum < 2 || nextLegNum > 4) return;

    const nextFrame = getLegFrame(nextLegNum);
    const nextBtn = nextFrame ? qs(SEL.legs.toggle, nextFrame) : null;
    const nextIsInactive = nextBtn && nextBtn.dataset.state === "inactive";
    if (nextIsInactive) return;

    dlog("change cascade", { field: isTo ? "aeroTo" : "eta", thisLegNum, nextLegNum });

    fillChain();
    resetFromAndEtdFromPrev(nextLegNum);

    if (typeof onChange === "function") onChange();
  });

  // ---------- Initialzustand ----------
  dlog("init start");
  for (let l = LEG_MIN; l <= LEG_MAX; l++) {
    const frame = getLegFrame(l);
    if (!frame) continue;

    const btn = qs(SEL.legs.toggle, frame);
    const state = btn?.dataset?.state || "active";
    setLegState(l, state);
  }

  fillChain();
  dlog("init done");
}