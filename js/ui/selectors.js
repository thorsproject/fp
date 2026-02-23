// js/ui/selectors.js

export const SEL = {

  // ---------- ROUTE HEADER ----------
  route: {
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


  // ---------- FUEL ----------
  fuel: {
    panel: "#fuelPanel",

    mainInput: '[data-field="main_usg"]',

    tripInput: (leg) => `[data-trip-usg="${leg}"]`,

    apprIfn: '[data-field="appr_ifr_n"]',
    apprVfr: '[data-field="appr_vfr_n"]',

    altInput: '[data-field="alt_usg_log"]',

    finresSelect: "#finres",

    toggleStd: '.fuelToggle[data-field="std_block"]',
    toggleAux: '.fuelToggle[data-field="aux_on"]',
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


  // ---------- IMPORT / EXPORT ----------
  io: {

    importFileInput: "#importFile",
  }

};