// js/excel_export.js

function v(sel) {
  const el = document.querySelector(sel);
  if (!el) return "";
  return el.value || el.textContent || "";
}

async function exportFuelPerfExcel() {

  const res = await fetch("/data/FuelPerfTemplate.xlsx");
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf);
  const ws = wb.Sheets["AUSGABE"];

  // ---------- HEAD DATA ----------
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="XXX"]')]], { origin: "B1" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="to_icao"][" - "][data-out="ld_icao"][" - "][data-out="alt_icao"]')]], { origin: "B2" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="dateInput"]')]], { origin: "B3" });

  // ---------- FUEL ----------
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="trip_usg_sum"]')]], { origin: "D6" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="trip_time_sum"]')]], { origin: "F6" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="company_usg"]')]], { origin: "D7" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="company_time"]')]], { origin: "F7" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="cont_usg"]')]], { origin: "D8" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="alt_usg"]')]], { origin: "D9" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="alt_time_out"]')]], { origin: "F9" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="res_usg"]')]], { origin: "D11" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="res_time"]')]], { origin: "F11" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="planned_usg"]')]], { origin: "D12" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="planned_usg"]')]], { origin: "D12" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="extra_lrc_usg"]')]], { origin: "D13" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="extra_lrc_time"]')]], { origin: "F13" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="takeoff_usg"]')]], { origin: "D14" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="takeoff_time"]')]], { origin: "F14" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="taxi_usg"]')]], { origin: "D15" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="block_usg_out"]')]], { origin: "D16" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="taxi_usg"]')]], { origin: "D17" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="trip_company_usg"]')]], { origin: "D18" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="trip_company_time"]')]], { origin: "F18" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="landing_usg"]')]], { origin: "D19" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-out="landing_time"]')]], { origin: "F19" });

  // ---------- PERFORMANCE ----------
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_icao"]')]], { origin: "I7" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_rwy"]')]], { origin: "L7" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_tora"]')]], { origin: "M7" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_tom"]')]], { origin: "N7" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_wind"]')]], { origin: "I9" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_temp"]')]], { origin: "M9" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_qnh"]')]], { origin: "N9" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_flaps"]')]], { origin: "I11" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_XXX"]')]], { origin: "L11" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_asd"]')]], { origin: "M11" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="to_stop_margin"]')]], { origin: "N11" });

  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_eosid"]')]], { origin: "J13" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_eosid"]')]], { origin: "J14" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_oei_roc"]')]], { origin: "N13" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_oei_sc"]')]], { origin: "N15" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_icao"]')]], { origin: "I17" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_rwy"]')]], { origin: "L17" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_lda"]')]], { origin: "M17" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_lm"]')]], { origin: "N17" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_flaps"]')]], { origin: "I19" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_XXX"]')]], { origin: "L19" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_ld_abn"]')]], { origin: "M19" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="rt_stop_margin"]')]], { origin: "N19" });

  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_icao"]')]], { origin: "I22" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_rwy"]')]], { origin: "L22" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_lda"]')]], { origin: "M22" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_lm"]')]], { origin: "N22" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_wind"]')]], { origin: "I25" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_temp"]')]], { origin: "M25" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_qnh"]')]], { origin: "N25" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_flaps"]')]], { origin: "I27" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_XXX"]')]], { origin: "L27" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_ld"]')]], { origin: "M27" });
  XLSX.utils.sheet_add_aoa(ws, [[v('[data-field="ld_stop_margin"]')]], { origin: "N27" });

  XLSX.writeFile(wb, "Fuel_Performance.xlsx");
}

export function initExcelExport() {

  const btn = document.getElementById("btnExportFuelPerf");
  if (!btn) return;

  btn.addEventListener("click", exportFuelPerfExcel);
}