// js/pdf_export.js

function text(sel) {
  const el = document.querySelector(sel);
  return (el?.textContent || "").trim();
}

function value(sel) {
  const el = document.querySelector(sel);
  return (el?.value || "").trim();
}

function out(name) {
  const el = document.querySelector(`[data-out="${name}"]`);
  return (el?.textContent || "").trim();
}

function field(name) {
  const el = document.querySelector(`[data-field="${name}"]`);
  return (el?.value || "").trim();
}

function selectedText(sel) {
  const el = document.querySelector(sel);
  if (!el) return "";
  if (el.tagName === "SELECT") {
    return (el.options[el.selectedIndex]?.text || "").trim();
  }
  return (el.value || el.textContent || "").trim();
}

function normIcao(v = "") {
  return String(v).trim().toUpperCase();
}

function safeFilenamePart(v = "") {
  return String(v).replace(/[^\w.-]+/g, "_");
}

function getCallsign() {
  return text("#callSignDisplay");
}

function getReg() {
  return value("#lfzSelect") || selectedText("#lfzSelect");
}

function getDate() {
  return value("#dateInput");
}

function getCsRegLine() {
  const cs = getCallsign();
  const reg = getReg();
  return [cs, reg].filter(Boolean).join(" / ");
}

function getActiveLegFrames() {
  const frames = Array.from(document.querySelectorAll("#legsContainer .c-panel"));

  return frames.filter((frame, idx) => {
    const legNum = idx + 1;
    if (legNum === 1) return true;

    const btn = document.querySelector(`.legToggle[data-leg="${legNum}"]`);
    const state = String(btn?.dataset?.state || "").toLowerCase();

    if (state === "inactive" || state === "off" || state === "disabled") return false;
    if (frame.classList.contains("is-hidden")) return false;
    if (frame.hidden) return false;
    if (frame.getAttribute("aria-hidden") === "true") return false;

    return true;
  });
}

function getLegInput(frame, sel) {
  const el = frame?.querySelector(sel);
  return (el?.value || "").trim().toUpperCase();
}

function getRouteLine() {
  const frames = getActiveLegFrames();
  const parts = [];

  const dep = normIcao(field("to_icao"));
  const dest = normIcao(field("ld_icao"));

  if (dep) parts.push(dep);

  for (const frame of frames) {
    const to = getLegInput(frame, '.legField.aeroTo');
    if (!to) continue;
    if (parts[parts.length - 1] !== to) parts.push(to);
  }

  if (dest && parts[parts.length - 1] !== dest) {
    parts.push(dest);
  }

  return parts.filter(Boolean).join(" - ");
}

function getAlternateLine() {
  const frames = getActiveLegFrames();
  const last = frames[frames.length - 1];
  return getLegInput(last, '.legField.alt');
}

function getRouteAltLine() {
  const route = getRouteLine();
  const alt = getAlternateLine();
  return alt ? `${route} / ${alt}` : route;
}

function getFieldOrOut(...names) {
  for (const name of names) {
    const fv = field(name);
    if (fv) return fv;
    const ov = out(name);
    if (ov) return ov;
  }
  return "";
}

function setTextField(form, name, value) {
  try {
    const field = form.getField(name);

    if (!field) {
      console.warn(`[pdf_export] Feld nicht gefunden: ${name}`);
      return;
    }

    if (typeof field.setText !== "function") {
      console.warn(`[pdf_export] Feld ist kein Textfeld: ${name}`, field);
      return;
    }

    field.setText(String(value ?? ""));
  } catch (err) {
    console.warn(`[pdf_export] Fehler bei Feld ${name}:`, err);
  }
}

function clearTextField(form, name) {
  setTextField(form, name, "");
}

async function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportFuelPerfPdf() {
  const btn = document.getElementById("btnExportFuelPerf");
  const oldLabel = btn?.textContent || "Export PDF";

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Erzeuge PDF...";
    }

    const res = await fetch("./data/Fuel+Perf.pdf", { cache: "no-store" });
    if (!res.ok) throw new Error(`PDF-Vorlage nicht gefunden (HTTP ${res.status})`);

    const bytes = await res.arrayBuffer();

    const { PDFDocument } = window.PDFLib || {};
    if (!PDFDocument) throw new Error("pdf-lib nicht geladen");

    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();

    const pdfBytes = await pdfDoc.save({
    updateFieldAppearances: false,
    });

    // ---------- Kopf ----------
    setTextField(form, "CSREG", getCsRegLine());
    setTextField(form, "ROUTEALT", getRouteAltLine());
    setTextField(form, "DATE", getDate());

    // ---------- Fuel ----------
    setTextField(form, "TRIPFUEL", out("trip_usg_sum"));
    setTextField(form, "TRIPTIME", out("trip_time_sum"));

    setTextField(form, "COMPFUEL", out("company_usg"));
    setTextField(form, "COMPTIME", out("company_time"));

    setTextField(form, "CONTFUEL", out("cont_usg"));

    setTextField(form, "ALTFUEL", out("alt_usg"));
    setTextField(form, "ALTTIME", out("alt_time_out"));

    setTextField(form, "FIRESFUEL", out("res_usg"));
    setTextField(form, "FIRESTIME", out("res_time"));

    setTextField(form, "PLATOFUEL", out("planned_usg"));
    setTextField(form, "PLATOTIME", out("planned_time"));

    setTextField(form, "EXTRAFUEL", out("extra_lrc_usg"));
    setTextField(form, "EXTRATIME", out("extra_lrc_time"));

    setTextField(form, "TOFUEL", out("takeoff_usg"));
    setTextField(form, "TOTIME", out("takeoff_time"));

    setTextField(form, "TAXIFUELP", out("taxi_usg"));
    setTextField(form, "BLOCKFUEL", out("block_usg_out"));
    setTextField(form, "TAXIFUELM", out("taxi_usg"));

    setTextField(form, "TRCOFUEL", out("trip_company_usg"));
    setTextField(form, "TRCOTIME", out("trip_company_time"));

    setTextField(form, "LDFUEL", out("landing_usg"));
    setTextField(form, "LDTIME", out("landing_time"));

    // ---------- Takeoff ----------
    setTextField(form, "TOICAO", field("to_icao"));
    setTextField(form, "TORWY", field("to_rwy"));
    setTextField(form, "TOWIND", field("to_wind"));
    setTextField(form, "TOTEMP", field("to_temp"));
    setTextField(form, "TOQNH", field("to_qnh"));

    setTextField(form, "TOM", field("to_tom"));
    setTextField(form, "TOFLAPS", field("to_flaps"));
    setTextField(form, "TOTORA", field("to_tora"));
    setTextField(form, "TOASD", field("to_asd"));
    setTextField(form, "TOSTOPMARGIN", field("to_stop_margin"));

    // VREF/Speed aktuell in deiner App offenbar nicht separat vorhanden
    clearTextField(form, "TOSPEED");

    // ---------- Return / Diversion ----------
    setTextField(form, "RTICAO", field("rt_icao"));
    setTextField(form, "RTRWY", getFieldOrOut("rt_rwy"));
    setTextField(form, "RTLDA", getFieldOrOut("rt_lda"));
    setTextField(form, "RTLM", getFieldOrOut("rt_lm"));

    setTextField(form, "EOSID", field("rt_eosid"));
    setTextField(form, "OEIROC", field("rt_oei_roc"));
    setTextField(form, "OEISC", field("rt_oei_sc"));
    setTextField(form, "RTLDABN", field("rt_ld_abn"));

    setTextField(form, "RTFLAPS", field("rt_flaps"));
    setTextField(form, "RTSTOPMARGIN", field("rt_stop_margin"));
    clearTextField(form, "RTSPEED");

    // ---------- Landing ----------
    setTextField(form, "LDICAO", field("ld_icao"));
    setTextField(form, "LDRWY", field("ld_rwy"));
    setTextField(form, "LDWIND", field("ld_wind"));
    setTextField(form, "LDTEMP", field("ld_temp"));
    setTextField(form, "LDQNH", field("ld_qnh"));

    setTextField(form, "LDFLAPS", field("ld_flaps"));
    setTextField(form, "LDLDA", field("ld_lda"));
    setTextField(form, "LDLM", field("ld_lm"));
    setTextField(form, "LDLD", field("ld_ld"));
    setTextField(form, "LDSTOPMARGIN", field("ld_stop_margin"));

    clearTextField(form, "LDSPEED");

    // const pdfBytes = await pdfDoc.save();

    const cs = safeFilenamePart(getCallsign() || "FP");
    const date = safeFilenamePart(getDate() || "undated");
    await downloadBytes(pdfBytes, `Fuel_Perf_${date}_${cs}.pdf`);
  } catch (err) {
    console.error("[pdf_export]", err);
    alert(`PDF-Export fehlgeschlagen:\n${err?.message || err}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldLabel;
    }
  }
}

export function initPdfExport() {
  const btn = document.getElementById("btnExportFuelPerf");
  if (!btn) return;
  if (btn.dataset.bound === "1") return;

  btn.dataset.bound = "1";
  btn.addEventListener("click", exportFuelPerfPdf);
}