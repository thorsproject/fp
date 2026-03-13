// js/ui/index.js
export { qs, qsa, el, closest } from "./dom.js";

export {
  setText,
  setHTML,
  setValue,
  setDisabled,
  toggleClass,
  setData,
  clearValues,
} from "./ui.js";

export {
  readText,
  readValue,
  readData,
  isDisabled,
  hasClass,
} from "./read.js";

export {
  setMuteLegAutofill,
  isLegAutofillMuted,
  withMuteLegAutofill,
} from "./state.js";

export { SEL } from "./selectors.js";
export { EVT, emit, on, off } from "./events.js";

// ----- zentraler Sync-Trigger -----
export function triggerAppSync() {
  emit("fp:sync");
}

export function onAppSync(handler) {
  on(document, "fp:sync", handler);
}
// ----- Ende: zentraler Sync-Trigger -----