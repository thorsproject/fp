// js/fuelConstants.js
// Aircraft / Company constants for Fuel Planning

export const BURN = {
  NC: 13.2,
  LRC: 10.3,
  MEC: 6.5,
};

export const FIX = {
  IFR_APPR_USG: 3,
  IFR_APPR_MIN: 20,

  VFR_APPR_USG: 1,
  VFR_APPR_MIN: 5,

  RES_IFR_USG: 4.9,
  RES_IFR_MIN: 45,

  RES_VFR_USG: 3.3,
  RES_VFR_MIN: 30,

  ALT_EXTRA_USG: 2.0,
  TAXI_USG: 1.0,

  // Conversions
  USG_LIT: 3.785,
  JETA1_KG_PER_L: 0.804,

  // CO2 factor (kg CO2 per kg fuel)
  CO2_PER_KG_FUEL: 3.15,
};

export const CAP = {
  MAIN_MAX: 50.0,
  MAIN_STANDARD: 44.0,
  AUX: 26.4,
};