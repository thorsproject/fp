// js/ui/selectors.js
export const SEL = {
  // ---------- ROUTE ----------
  route: {
    panel: "#routePanel",
    kopfContainer: "#kopfContainer",

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

    // fields inside a leg frame
    etd: ".legField.etd",
    eta: ".legField.eta",
    aeroFrom: ".legField.aeroFrom",
    aeroTo: ".legField.aeroTo",
    alt: ".legField.alt",

    // toggle
    toggle: "button.legToggle[data-leg]",
    toggleByLeg: (leg) => `button.legToggle[data-leg="${leg}"]`,
  },

  // ---------- CHECKLIST ----------
  checklist: {
    view: "#view-checklist",
    toast: "#checkToast",

    // toggles
    toggleBtn: 'button[data-tb]',
    toggleByKey: (key) => `button[data-tb="${key}"]`,

    // fields
    fieldAny: "[data-field]",
    fieldByKey: (key) => `[data-field="${key}"]`,

    // phone buttons (empfohlen: über data-phone statt Klasse)
    phoneBtn: "button[data-phone]",
  },

  // ---------- ORM (Overlay) ----------
  orm: {
    overlay: "#ormOverlay",
    frame: "#ormFrameOverlay",
    hint: "#ormHintOverlay",

    btnOpen: "#btnOrm",
    btnSave: "#btnOrmSaveOverlay",
    btnClose: "#btnOrmCloseOverlay",
  },

  // ---------- MAIL (Checklist Mail EO) ----------
  // Nur "Mail-spezifisch", KEINE wx Felder duplizieren (die sind checklist.fieldByKey)
  mail: {
    btnSend: "#btnMailEO",
    cbUsePicker: "#mailEoUsePicker",

    recipient: ".email",
    intranet: ".intranet",
  },

  // ---------- FUEL ----------
  fuel: {
    panel: "#fuelPanel",

    // inputs
    mainInput: '[data-field="main_usg"]',
    tripInput: (leg) => `[data-trip-usg="${leg}"]`,
    tripCells: '[data-trip-leg]', // robust: unabhängig von .trip class

    apprIfn: '[data-field="appr_ifr_n"]',
    apprVfr: '[data-field="appr_vfr_n"]',
    altInput: '[data-field="alt_usg_log"]',
    finresSelect: "#finres",

    // toggles
    toggleAll: 'button.fuelToggle[data-field][data-state]',
    toggleStd: 'button.fuelToggle[data-field="std_block"]',
    toggleAux: 'button.fuelToggle[data-field="aux_on"]',

    // outputs
    out: (key) => `[data-out="${key}"]`,
  },

  // ---------- SETTINGS ----------
  settings: {
    cfgPass: "#cfgPass",
    cfgStatus: "#cfgStatus",

    loadBtn: "#btnCfgLoad",
    clearBtn: "#btnCfgClearPass",

    fdlSelect: "#fdlSelect",
    fdlTelDisplay: "#fdlTel",
  },

  // ---------- TOPBAR ----------
  topbar: {
    nav: "#topNav",
    saveIndicator: "#saveIndicator",
    configBadge: "#configBadge",
  },

  // ---------- RESET ----------
  reset: {
    // validation messages (route/legs)
    aeroError: ".aero-error",
    altError: ".alt-error",
  },

  // ---------- IMPORT / EXPORT ----------
  io: {
    importFileInput: "#importFile",
  },
};