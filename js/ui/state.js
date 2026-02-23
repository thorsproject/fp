// js/ui/state.js – zentraler UI State + Guards
// Ziel: Keine “globalen Flags” in 10 Dateien. Ein Ort für Mutes/Guards.

const state = {
  // Guards
  muteLegAutofill: false,
  // später: muteFuelAutocalc, muteAutosave, etc.
};

/**
 * Wenn true: Autokopieren (ETA->ETD, TO->FROM etc.) wird unterdrückt.
 * Nutzen wir z.B. beim Reset, damit die Kaskade nicht sofort wieder ETDs füllt.
 */
export function setMuteLegAutofill(on) {
  state.muteLegAutofill = !!on;
}

export function isLegAutofillMuted() {
  return !!state.muteLegAutofill;
}

/**
 * Helper: führt fn aus, während ein Guard aktiv ist.
 * Nützlich für Reset-Operationen.
 */
export function withMuteLegAutofill(fn) {
  setMuteLegAutofill(true);
  try {
    return fn();
  } finally {
    // wichtig: erst nach den ausgelösten Events wieder aktivieren
    // microtask: erst nachdem alle change/input Events durch sind
    queueMicrotask(() => setMuteLegAutofill(false));
  }
}