// js/orm.js
import { viewerUrl } from "./path.js";
import { registerAttachment } from "./attachments.js";
import { qs, SEL, readValue, readText, setText } from "./ui/index.js";
import { checklistSetToggle } from "./checklist.js";

// ---------- Debug-Funktion bei Bedarf ----------
const DEBUG_ORM = true;
function dlog(...args) {
  if (!DEBUG_ORM) return;
  console.log("[orm]", ...args);
}
// ---------- Debug-Funktion Ende ----------

function getRouteScope() {
  return qs(SEL.route.container) || document;
}

let lastAutofill = { cs: null, dateIso: null };
let reAutofillTimer = null;

function sanitizeFilePart(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .slice(0, 32) || "NA";
}

function getSuggestedOrmFilename() {
  const scope = getRouteScope();
  const datePart = toIsoDateForOrm(scope);
  const cs = readText(qs(SEL.route.callsignDisplay, scope)).trim() || "CALLSIGN";
  return `ORM-${sanitizeFilePart(datePart)}-${sanitizeFilePart(cs)}.pdf`;
}

// ---------- PDF.js UI minimieren ----------
function injectPdfJsMinimalUi(iframe) {
  const doc = iframe.contentDocument;
  if (!doc || doc.getElementById("fp-minimal-pdfjs")) return;

  const style = doc.createElement("style");
  style.id = "fp-minimal-pdfjs";
  style.textContent = `
    #sidebarContainer,
    #toolbarContainer,
    #secondaryToolbar,
    #findbar,
    #editorModeButtons,
    #toolbarViewerRight,
    #toolbarViewerLeft,
    #toolbarViewerMiddle,
    #toolbarSidebar,
    #loadingBar,
    .doorHanger {
      display:none !important;
    }

    #viewerContainer {
      top:0 !important;
      padding:0 !important;
    }
    html, body {
      background:transparent !important;
    }
    .pdfViewer .page {
      margin:0 !important;
    }
  `;
  doc.head.appendChild(style);
}

function applyMinimalUiWhenReady(iframe) {
  const start = Date.now();
  const maxMs = 3000;

  const tick = () => {
    const w = iframe.contentWindow;
    const doc = iframe.contentDocument;

    if (doc?.getElementById("outerContainer")) {
      injectPdfJsMinimalUi(iframe);

      // Sidebar schließen
      w?.PDFViewerApplication?.pdfSidebar?.close?.();

      // Zoom setzen
      const pv = w?.PDFViewerApplication?.pdfViewer;
      if (pv) pv.currentScaleValue = "page-width";

      return;
    }

    if (Date.now() - start < maxMs) {
      requestAnimationFrame(tick);
    }
  };

  tick();
}

function toIsoDateForOrm(scope = document) {
  const raw0 = readValue(qs(SEL.route.dateInput, scope)) ?? "";
  const raw = String(raw0).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  let m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  m = raw.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

  m = raw.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

  m = raw.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  return new Date().toISOString().slice(0, 10);
}

function setDomFieldValue(iframe, fieldName, value) {
  const doc = iframe.contentDocument;
  if (!doc) return 0;

  const esc = (s) =>
    (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"');

  const sels = [
    `input[name="${esc(fieldName)}"]`,
    `textarea[name="${esc(fieldName)}"]`,
    `select[name="${esc(fieldName)}"]`,
    `[data-field-name="${esc(fieldName)}"] input`,
    `[data-field-name="${esc(fieldName)}"] textarea`,
    `[data-field-name="${esc(fieldName)}"] select`,
    `[data-name="${esc(fieldName)}"] input`,
    `[data-name="${esc(fieldName)}"] textarea`,
    `[data-name="${esc(fieldName)}"] select`,
  ];

  const els = sels.flatMap((sel) => Array.from(doc.querySelectorAll(sel)));
  if (!els.length) return 0;

  for (const el of els) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return els.length;
}

function getDomFieldValue(iframe, fieldName) {
  const doc = iframe.contentDocument;
  if (!doc) return "";

  const sel = [
    `input[name="${fieldName}"]`,
    `textarea[name="${fieldName}"]`,
    `select[name="${fieldName}"]`,
    `[data-field-name="${fieldName}"] input`,
    `[data-field-name="${fieldName}"] textarea`,
    `[data-field-name="${fieldName}"] select`,
    `[data-name="${fieldName}"] input`,
    `[data-name="${fieldName}"] textarea`,
    `[data-name="${fieldName}"] select`,
  ].join(",");

  const el = doc.querySelector(sel);
  return (el?.value ?? "").trim();
}

function setOrmField(iframe, fields, storage, name, value) {
  const currentDomValue = getDomFieldValue(iframe, name);

  const canOverwrite =
    !currentDomValue ||
    (name === "CS" && currentDomValue === (lastAutofill.cs ?? "")) ||
    (name === "Datum1_af_date" && currentDomValue === (lastAutofill.dateIso ?? ""));

  if (!canOverwrite) return false;

  for (const f of fields[name] || []) {
    storage.setValue(f.id, { value });
  }

  const domHits = setDomFieldValue(iframe, name, value);
  return domHits > 0;
}

async function autofillOrmFields(iframe) {
  const app = iframe.contentWindow?.PDFViewerApplication;
  const pdf = app?.pdfDocument;
  const storage = pdf?.annotationStorage;

  if (!pdf || !storage) return;

  const fields = await pdf.getFieldObjects();
  if (!fields) return;

  const scope = getRouteScope();
  const dateIso = toIsoDateForOrm(scope);
  const cs = readText(qs(SEL.route.callsignDisplay, scope)).trim() || "";

  let okDate = false;
  let okCs = false;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso) && (fields["Datum1_af_date"]?.length)) {
    setOrmField(iframe, fields, storage, "Datum1_af_date", dateIso);
    okDate = true;
  } else {
    console.warn("[ORM] Datum nicht gesetzt (leer/ungültig/kein Feld):", dateIso);
  }

  if (fields["CS"]?.length) {
    setOrmField(iframe, fields, storage, "CS", cs);
    okCs = true;
  } else {
    console.warn("[ORM] CS Feld nicht gefunden");
  }

  storage.onSetModified?.(true);
  app?.eventBus?.dispatch?.("annotationstoragechanged", { source: storage });
  app?.pdfViewer?.refresh?.();

  lastAutofill.cs = cs;
  lastAutofill.dateIso = dateIso;

  dlog("autofill okDate/okCs:", okDate, okCs, "dateIso:", dateIso, "cs:", cs);
}

function wireOrmAutofill(iframe) {
  const app = iframe.contentWindow?.PDFViewerApplication;
  if (!app) return;

  const ready = app.initializedPromise ?? Promise.resolve();

  ready.then(() => {
    const start = Date.now();
    const maxMs = 2000;
    let scheduled = false;

    const scheduleFillBurst = () => {
      if (scheduled) return;
      scheduled = true;

      setTimeout(() => autofillOrmFields(iframe).catch(console.error), 0);
      setTimeout(() => autofillOrmFields(iframe).catch(console.error), 150);
      setTimeout(() => autofillOrmFields(iframe).catch(console.error), 500);

      setTimeout(() => { scheduled = false; }, 600);
    };

    const onAnyRender = () => {
      if (!app.pdfDocument) return;
      if (Date.now() - start > maxMs) return;
      scheduleFillBurst();
    };

    app.eventBus?.on?.("annotationlayerrendered", onAnyRender);
    app.eventBus?.on?.("pagerendered", onAnyRender);
    app.eventBus?.on?.("pagesloaded", onAnyRender);
    app.eventBus?.on?.("documentloaded", onAnyRender);

    onAnyRender();
  });
}

// ---------- PDF Export ----------
async function getEditedPdfBytesFromViewer(iframe) {
  const app = iframe?.contentWindow?.PDFViewerApplication;

  if (!app?.pdfDocument) throw new Error("PDF noch nicht geladen.");

  if (app.pdfDocument.saveDocument) return await app.pdfDocument.saveDocument();
  if (app.pdfDocument.getData) return await app.pdfDocument.getData();

  throw new Error("PDF Export nicht möglich.");
}

function downloadPdfBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function u8ToArrayBuffer(u8) {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

// ---------- MAIN ----------
export function initOrmChecklist() {
  const overlay = qs(SEL.orm.overlay);
  const frame = qs(SEL.orm.frame);
  const hint = qs(SEL.orm.hint);

  const btnOpen = qs(SEL.orm.btnOpen);
  const btnSave = qs(SEL.orm.btnSave);
  const btnClose = qs(SEL.orm.btnClose);

  if (!btnOpen || !btnSave || !btnClose || !overlay || !frame) return;

  let isOpen = false;

  function setHint(msg = "") {
    setText(SEL.orm.hint, msg);
  }

  function openOrm() {
    const pdfPath = `data/ORMBlatt.pdf?v=${Date.now()}`;

    // ---------- Wichtig: Listener im PARENT-Dokument, bevor der Viewer initialisiert! ----------
    const onWebViewerLoaded = (ev) => {
      const w = ev?.detail?.source; // = viewer window
      const opts = w?.PDFViewerApplicationOptions;
      if (opts?.set) {
        opts.set("enableScripting", false);

        // optional (falls euer Build das kennt): verhindert Sandbox-Bundle-Pfad
        // opts.set("sandboxBundleSrc", null);

        console.log("[ORM] pdfjs: enableScripting=false (set via webviewerloaded)");
      } else {
        console.warn("[ORM] pdfjs: PDFViewerApplicationOptions not available on webviewerloaded");
      }
    };

    document.addEventListener("webviewerloaded", onWebViewerLoaded, { once: true });
    // ------------------------------ Ende ------------------------------

    frame.src = viewerUrl(pdfPath, { page: 1, zoom: "page-width" });

    frame.addEventListener("load", () => {
      applyMinimalUiWhenReady(frame);
      wireOrmAutofill(frame);

      setTimeout(() => autofillOrmFields(frame), 300);
      setTimeout(() => autofillOrmFields(frame), 900);
    }, { once: true });

    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
    setHint("ORM geöffnet (editierbar).");
    isOpen = true;
  }  
  function openOrm() {
    const pdfPath = `data/ORMBlatt.pdf?v=${Date.now()}`;


    frame.src = viewerUrl(pdfPath, { page: 1, zoom: "page-width" });

    frame.addEventListener("load", () => {
      applyMinimalUiWhenReady(frame);
      wireOrmAutofill(frame);

      setTimeout(() => autofillOrmFields(frame), 300);
      setTimeout(() => autofillOrmFields(frame), 900);
    }, { once: true });

    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
    setHint("ORM geöffnet (editierbar).");
    isOpen = true;
  }

  function closeOrm() {
    if (overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    qs(SEL.orm.btnOpen)?.focus();

    const app = frame.contentWindow?.PDFViewerApplication;
    try { app?.pdfDocument?.annotationStorage?.resetModified?.(); } catch {}

    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
    frame.src = "about:blank";
    setHint("");
    isOpen = false;
  }

  function confirmCloseOrm() {
    if (!isOpen) return false;

    const modified =
      frame.contentWindow?.PDFViewerApplication?.pdfDocument
        ?.annotationStorage?.modified;

    if (!modified) {
      closeOrm();
      return true;
    }

    const ok = confirm("ORM schließen?\n\nNicht gespeicherte Änderungen gehen verloren.");
    if (!ok) return false;

    closeOrm();
    return true;
  }

  async function saveOrm() {
    setHint("Speichern…");

    const filename = getSuggestedOrmFilename();

    if ("showSaveFilePicker" in window) {
      let handle;

      try {
        handle = await showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: "PDF",
            accept: { "application/pdf": [".pdf"] }
          }]
        });
      } catch (e) {
        if (e?.name === "AbortError") {
          setHint("Speichern abgebrochen.");
          return;
        }
        setHint("Save-Dialog fehlgeschlagen.");
        return;
      }

      try {
        const bytes = await getEditedPdfBytesFromViewer(frame);

        registerAttachment("orm", {
          name: filename,
          type: "application/pdf",
          getArrayBuffer: async () => u8ToArrayBuffer(bytes),
        });

        const writable = await handle.createWritable();
        await writable.write(bytes);
        await writable.close();

        setHint("Gespeichert.");
        closeOrm();

        checklistSetToggle("orm", true);
        return;
      } catch (e) {
        console.error(e);
        setHint("Speichern fehlgeschlagen.");
        return;
      }
    }

    // fallback download
    try {
      const bytes = await getEditedPdfBytesFromViewer(frame);

      registerAttachment("orm", {
        name: filename,
        type: "application/pdf",
        getArrayBuffer: async () => u8ToArrayBuffer(bytes),
      });

      downloadPdfBytes(bytes, filename);
      setHint("Download gestartet.");
    } catch (e) {
      console.error(e);
      setHint("Speichern nicht möglich.");
    }
  }

  btnOpen.addEventListener("click", openOrm);

  btnSave.addEventListener("click", () => {
    if (isOpen) saveOrm();
  });

  btnClose.addEventListener("click", () => {
    confirmCloseOrm();
  });

  function scheduleReAutofill() {
    if (!isOpen) return;

    clearTimeout(reAutofillTimer);
    reAutofillTimer = setTimeout(() => {
      autofillOrmFields(frame).catch?.(() => {});
    }, 250);
  }

  const csEl = qs(SEL.route.callsignDisplay);
  if (csEl) {
    const mo = new MutationObserver(scheduleReAutofill);
    mo.observe(csEl, { childList: true, characterData: true, subtree: true });
  }

  const dateEl = qs(SEL.route.dateInput);
  dateEl?.addEventListener("input", scheduleReAutofill);
  dateEl?.addEventListener("change", scheduleReAutofill);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) confirmCloseOrm();
  });
}