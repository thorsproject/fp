// js/ui/selectors.js

export const SEL = {

  // ---------- ROUTE HEADER ----------
  route: {
    kopfContainer: "#kopfContainer",
    container: "#routePanel",

    dateInput: "#dateInput",

    lfzSelect: "#lfzSelect",
    tacSelect: "#tacSelect",

    callsignDisplay: "#callSignDisplay",

    fdlOutput: "#FDLoutput",
    telOutput: "#TELoutput",
  },


  // ---------- LEGS ----------
  legs: {
    container: "#legsContainer",

    frames: "#legsContainer .c-panel",

    etd: ".legField.etd",
    eta: ".legField.eta",

    aeroFrom: ".legField.aeroFrom",
    aeroTo: ".legField.aeroTo",

    alt: ".legField.alt",

    toggle: ".legToggle",
    toggleByLeg: (leg) => `.legToggle[data-leg="${leg}"]`,
  },


  // ---------- CHECKLIST ----------
  checklist: {
    view: "#view-checklist",

    toast: "#checkToast",

    // toggles
    toggleBtn: '.tb[data-tb]',
    toggleByKey: (key) => `.tb[data-tb="${key}"]`,

    // fields
    fieldAny: "[data-field]",
    fieldByKey: (key) => `[data-field="${key}"]`,

    // reset buttons
    resetChecklist: "#btnResetChecklist",
    resetCheckmarks: "#btnResetCheckmarks",
    resetWx: "#btnResetWx",

    // phone buttons
    phoneBtn: ".phone-btn",
  },


  // ---------- FUEL ----------
  fuel: {
    panel: "#fuelPanel",

    mainInput: '[data-field="main_usg"]',

    tripInput: (leg) => `[data-trip-usg="${leg}"]`,
    tripCells: '.trip[data-trip-leg]',          // ✅ NEU

    apprIfn: '[data-field="appr_ifr_n"]',
    apprVfr: '[data-field="appr_vfr_n"]',

    altInput: '[data-field="alt_usg_log"]',

    finresSelect: "#finres",

    toggleAll: ".fuelToggle",                   // ✅ NEU
    toggleStd: '.fuelToggle[data-field="std_block"]',
    toggleAux: '.fuelToggle[data-field="aux_on"]',

    out: (key) => `[data-out="${key}"]`,         // ✅ NEU (damit setOut nur SEL nutzt)
  },


  // ---------- SETTINGS ----------
  settings: {

    cfgPass: "#cfgPass",

    fdlSelect: "#fdlSelect",
    fdlTelDisplay: "#fdlTel",

    cfgStatus: "#cfgStatus",

    loadBtn: "#btnCfgLoad",
    clearBtn: "#btnCfgClearPass",
  },


  // ---------- TOPBAR ----------
  topbar: {

    nav: "#topNav",

    saveIndicator: "#saveIndicator",

    configBadge: "#configBadge",
  },


  // ---------- RESET ----------
  reset: {
    // Validation messages
    aeroError: ".aero-error",
    altError: ".alt-error",
  },


  // ---------- IMPORT / EXPORT ----------
  io: {

    importFileInput: "#importFile",
  }

};