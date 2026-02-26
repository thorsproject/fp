// js/ui/events.js
// Zentrale Quelle für Custom Events (keine Magic-Strings mehr)

export const EVT = {
  includesLoaded: "fp:includes-loaded",
  attachmentsChanged: "fp:attachments-changed",

  // falls ihr später mehr braucht:
  // storageLoaded: "fp:storage-loaded",
  // configLoaded: "fp:config-loaded",
};

/**
 * Dispatch helper
 * @param {string} type - EVT.*
 * @param {any} detail - optional payload
 * @param {EventTarget} target - default window
 */
export function emit(type, detail, target = window) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

/**
 * Listener helper
 */
export function on(type, handler, target = window, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

export function off(type, handler, target = window, options) {
  target.removeEventListener(type, handler, options);
}