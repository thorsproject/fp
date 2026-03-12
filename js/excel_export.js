// js/excel_export.js

function text(sel) {
  const el = document.querySelector(sel);
  if (!el) return "";
  return (el.textContent || "").trim();
}

function value(sel) {
  const el = document.querySelector(sel);
  if (!el) return "";
  return (el.value || "").trim();
}

function out(name) {
  const el = document.querySelector(`[data-out="${name}"]`);
  if (!el) return "";
  return (el.textContent || "").trim();
}

function field(name) {
  const el = document.querySelector(`[data-field="${name}"]`);
  if (!el) return "";
  return (el.value || "").trim();
}

function selectedText(sel) {
  const el = document.querySelector(sel);
  if (!el) return "";
  if (el.tagName === "SELECT") {
    return (el.options[el.selectedIndex]?.text || "").trim();
  }
  return (el.value || el.textContent || "").trim();
}

function getCallsign() {
  return text("#callSignDisplay");
}

function getReg() {
  // Falls value gesetzt ist: value, sonst sichtbarer Select-Text
  const val = value("#lfzSelect");
  return val || selectedText("#lfzSelect");
}

function getDate() {
  return value("#dateInput");
}

function getActiveLegFrames() {
  const frames = Array.from(document.querySelectorAll("#legsContainer .c-panel"));
  return frames.filter((frame, idx) => {
    const legNum = idx + 1;
    const btn = document.querySelector(`button.legToggle[data-leg="${legNum}"]`);
    const state = String(btn?.dataset?.state || "active").toLowerCase();

    if (state === "inactive" || state === "off" || state === "disabled") return false;
    if (frame.classList.contains("is-hidden")) return false;
    if (frame.hidden) return false;
    if (frame.getAttribute("aria-hidden") === "true") return false;

    return true;
  });
}

function getLegValue(frame, sel) {
  const el = frame?.querySelector(sel);
  return (el?.value || "").trim().toUpperCase();
}

function getRouteString() {
  const toIcao = field("to_icao").toUpperCase();
  const ldIcao = field("ld_icao").toUpperCase();

  const frames = getActiveLegFrames();
  const routeParts = [];

  if (toIcao) routeParts.push(toIcao);

  for (const frame of frames) {
    const to = getLegValue(frame, ".legField.aeroTo");
    if (!to) continue;

    // departure nicht doppelt anhängen
    if (routeParts.length === 0 || routeParts[routeParts.length - 1] !== to) {
      routeParts.push(to);
    }
  }

  // Falls ld_icao aus Performance vom letzten Leg kommt, nicht doppeln
  if (ldIcao && routeParts[routeParts.length - 1] !== ldIcao) {
    routeParts.push(ldIcao);
  }

  return routeParts.filter(Boolean).join(" - ");
}

function getAlternateString() {
  const frames = getActiveLegFrames();
  if (!frames.length) return "";

  const lastFrame = frames[frames.length - 1];
  return getLegValue(lastFrame, ".legField.alt");
}

function put(ws, cell, val) {
  XLSX.utils.sheet_add_aoa(ws, [[val ?? ""]], { origin: cell });
}

async function exportFuelPerfExcel() {
  const res = await fetch("/data/FuelPerfTemplate.xlsx");
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf);
  const ws = wb.Sheets["AUSGABE"];

  // ---------- HEAD DATA ----------
  put(ws, "B1", getCallsign());
  put(ws, "B2", getReg());
  put(ws, "B3", getRouteString());
  put(ws, "B4", getAlternateString());
  put(ws, "B5", getDate());

  // ---------- FUEL ----------
  put(ws, "D6", out("trip_usg_sum"));
  put(ws, "F6", out("trip_time_sum"));
  put(ws, "D7", out("company_usg"));
  put(ws, "F7", out("company_time"));
  put(ws, "D8", out("cont_usg"));
  put(ws, "F8", out("cont_time"));
  put(ws, "D9", out("alt_usg"));
  put(ws, "F9", out("alt_time_out"));
  put(ws, "D11", out("res_usg"));
  put(ws, "F11", out("res_time"));
  put(ws, "D12", out("planned_usg"));
  put(ws, "F12", out("planned_time"));
  put(ws, "D13", out("extra_lrc_usg"));
  put(ws, "F13", out("extra_lrc_time"));
  put(ws, "D14", out("takeoff_usg"));
  put(ws, "F14", out("takeoff_time"));
  put(ws, "D15", out("taxi_usg"));
  put(ws, "F15", out("taxi_time"));
  put(ws, "D16", out("block_usg_out"));
  put(ws, "F16", out("block_time_out"));
  put(ws, "D17", out("trip_company_usg"));
  put(ws, "F17", out("trip_company_time"));
  put(ws, "D18", out("landing_usg"));
  put(ws, "F18", out("landing_time"));
  put(ws, "D20", out("bingo_usg"));
  put(ws, "D21", out("minblock_usg"));

  // ---------- PERFORMANCE ----------
  put(ws, "I6", field("to_icao"));
  put(ws, "L6", field("to_rwy"));
  put(ws, "I9", field("to_wind"));
  put(ws, "M9", field("to_temp"));
  put(ws, "N9", field("to_qnh"));
  put(ws, "I11", field("to_tom"));
  put(ws, "L11", out("to_mtom"));
  put(ws, "I13", field("to_flaps"));
  put(ws, "L13", field("to_tora"));
  put(ws, "M13", field("to_roll"));
  put(ws, "N13", field("to_asd"));
  put(ws, "O13", field("to_stop_margin"));

  put(ws, "I16", field("rt_icao"));
  put(ws, "L16", out("rt_rwy"));
  put(ws, "M16", out("rt_lda"));
  put(ws, "N16", out("rt_lm"));
  put(ws, "I18", field("rt_eosid"));
  put(ws, "L18", field("rt_oei_roc"));
  put(ws, "M18", field("rt_oei_sc"));
  put(ws, "N18", field("rt_ld_abn"));

  put(ws, "I22", field("ld_icao"));
  put(ws, "L22", field("ld_rwy"));
  put(ws, "M22", field("ld_lda"));
  put(ws, "N22", field("ld_lm"));
  put(ws, "I25", field("ld_wind"));
  put(ws, "M25", field("ld_temp"));
  put(ws, "N25", field("ld_qnh"));
  put(ws, "I27", field("ld_flaps"));
  put(ws, "M27", field("ld_ld"));
  put(ws, "N27", field("ld_stop_margin"));

  XLSX.writeFile(wb, "Fuel_Performance.xlsx");
}

export function initExcelExport() {
  const btn = document.getElementById("btnExportFuelPerf");
  if (!btn) return;
  btn.addEventListener("click", exportFuelPerfExcel);
}