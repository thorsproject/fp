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
  const el = document.querySelector("#lfzSelect");
  if (!el) return "";

  if (el.tagName === "SELECT") {
    return (el.options[el.selectedIndex]?.text || "").trim();
  }

  return (el.value || el.textContent || "").trim();
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

  const dep = normIcao(getFieldOrOut("to_icao"));
  const dest = normIcao(getFieldOrOut("ld_icao"));

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

function getEosidPdfText() {
  const eosid = String(field("rt_eosid") || "").trim().toUpperCase();
  const rtRwy = String(getFieldOrOut("rt_rwy") || "").trim().toUpperCase();

  if (!eosid) return "";
  if (!rtRwy) return "";

  const ifr = `RadVec ILS RWY ${rtRwy}`;
  const vfr = `VisPattern RWY ${rtRwy}`;

  if (eosid === "IFR") return ifr;
  if (eosid === "VFR") return vfr;
  if (eosid === "IFR/VFR OPT") return `${ifr}\n--------------------------–------------\nOPTION: ${vfr}`;
  if (eosid === "VFR/IFR OPT") return `${vfr}\n--------------------------–------------\nOPTION: ${ifr}`;

  return eosid;
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
  const previewWin = window.open("", "_blank");
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
    const { PDFDocument, StandardFonts } = window.PDFLib || {};
    if (!PDFDocument) throw new Error("pdf-lib nicht geladen");

    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

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
    setTextField(form, "TOICAO", getFieldOrOut("to_icao"));
    setTextField(form, "TORWY", getFieldOrOut("to_rwy"));
    setTextField(form, "TOWIND", getFieldOrOut("to_wind"));
    setTextField(form, "TOTEMP", getFieldOrOut("to_temp"));
    setTextField(form, "TOQNH", getFieldOrOut("to_qnh"));

    setTextField(form, "TOM", getFieldOrOut("to_tom"));
    setTextField(form, "TOFLAPS", getFieldOrOut("to_flaps"));
    setTextField(form, "TOSPEED", getFieldOrOut("to_flaps_speed"));
    setTextField(form, "TOTORA", getFieldOrOut("to_tora"));
    setTextField(form, "TOASD", getFieldOrOut("to_asd"));
    setTextField(form, "TOSTOPMARGIN", getFieldOrOut("to_stop_margin"));

    // ---------- Return / Diversion ----------
    setTextField(form, "RTICAO", getFieldOrOut("rt_icao"));
    setTextField(form, "RTRWY", getFieldOrOut("rt_rwy"));
    setTextField(form, "RTLDA", getFieldOrOut("rt_lda"));
    setTextField(form, "RTLM", getFieldOrOut("rt_lm"));

    setTextField(form, "EOSID", getEosidPdfText());
    setTextField(form, "OEIROC", getFieldOrOut("rt_oei_roc"));
    setTextField(form, "OEISC", getFieldOrOut("rt_oei_sc"));
    setTextField(form, "RTLDABN", getFieldOrOut("rt_ld_abn"));

    setTextField(form, "RTFLAPS", getFieldOrOut("rt_flaps"));
    setTextField(form, "RTSPEED", getFieldOrOut("rt_flaps_speed"));
    setTextField(form, "RTSTOPMARGIN", getFieldOrOut("rt_stop_margin"));

    // ---------- Landing ----------
    setTextField(form, "LDICAO", getFieldOrOut("ld_icao"));
    setTextField(form, "LDRWY", getFieldOrOut("ld_rwy"));
    setTextField(form, "LDWIND", getFieldOrOut("ld_wind"));
    setTextField(form, "LDTEMP", getFieldOrOut("ld_temp"));
    setTextField(form, "LDQNH", getFieldOrOut("ld_qnh"));

    setTextField(form, "LDFLAPS", getFieldOrOut("ld_flaps"));
    setTextField(form, "LDSPEED", getFieldOrOut("ld_flaps_speed"));
    setTextField(form, "LDLDA", getFieldOrOut("ld_lda"));
    setTextField(form, "LDLM", getFieldOrOut("ld_lm"));
    setTextField(form, "LDLD", getFieldOrOut("ld_ld"));
    setTextField(form, "LDSTOPMARGIN", getFieldOrOut("ld_stop_margin"));

    form.updateFieldAppearances(font);

    const pdfBytes = await pdfDoc.save();

    const cs = safeFilenamePart(getCallsign() || "FP");
    const date = safeFilenamePart(getDate() || "undated");
    await downloadBytes(pdfBytes, `Fuel_Perf_${date}_${cs}.pdf`);

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    if (previewWin) {
    previewWin.location.href = url;
    } else {
    window.open(url, "_blank");
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);

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