import { qs, qsa, SEL } from "./ui/index.js";

function getLastActiveLegFrame() {
  const frames = qsa(SEL.legs.frames);
  if (!frames.length) return null;

  let lastActive = frames[0] || null; // Leg 1 ist immer vorhanden

  for (let i = 1; i < frames.length; i++) {
    const legNum = i + 1;
    const btn = qs(SEL.legs.toggleByLeg(legNum));
    const isActive = btn?.dataset?.state === "active";

    if (isActive) {
      lastActive = frames[i];
    }
  }

  return lastActive;
}

export function syncPerformanceAirfields() {
  const frames = qsa(SEL.legs.frames);
  if (!frames.length) return;

  const firstLeg = frames[0];
  const lastLeg = getLastActiveLegFrame();

  const firstFrom = firstLeg ? qs(SEL.legs.aeroFrom, firstLeg) : null;
  const lastTo = lastLeg ? qs(SEL.legs.aeroTo, lastLeg) : null;

  const depIcao = (firstFrom?.value || "").trim().toUpperCase();
  const destIcao = (lastTo?.value || "").trim().toUpperCase();

  const toIcao = qs('[data-field="to_icao"]');
  const rtIcao = qs('[data-field="rt_icao"]');
  const ldIcao = qs('[data-field="ld_icao"]');

  if (toIcao) toIcao.value = depIcao;
  if (rtIcao) rtIcao.value = depIcao;
  if (ldIcao) ldIcao.value = destIcao;
}

export function initPerformance() {
  syncPerformanceAirfields();
  initPerformance();

  document.addEventListener("input", (e) => {
    if (!e.target.closest(SEL.legs.container)) return;
    syncPerformanceAirfields();
  });

  document.addEventListener("change", (e) => {
    if (!e.target.closest(SEL.legs.container)) return;
    syncPerformanceAirfields();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(SEL.legs.toggle);
    if (!btn) return;

    // legs.js ändert den state erst im Click-Handler → danach synchronisieren
    queueMicrotask(() => {
      syncPerformanceAirfields();
    });
  });
}