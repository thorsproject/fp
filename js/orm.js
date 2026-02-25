// js/orm.js
import { viewerUrl } from "./path.js";
import { registerAttachment } from "./attachments.js";
import { qs, SEL, readValue, readText, setText } from "./ui/index.js";
import { checklistSetToggle } from "./checklist.js";
import { getSignatureDataUrl } from "./signature_store.js";
import { stampSignatureIntoPdf, lockFieldsInPdf, ORM_SIG_FIELDS, ORM_LOCK_FIELDS } from "./signature_stamp.js";

// ---------- Debug optional ----------
const DEBUG_ORM = false;
function dlog(...args) {
  if (!DEBUG_ORM) return;
  console.log("[orm]", ...args);
}
// -------------------------------

function getRouteScope() {
  return qs(SEL.route.container) || document;
}

let lastAutofill = { cs: null, dateIso: null };
let reAutofillTimer = null;

function sanitizeFilePart(s) {
  return (
    String(s || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\-]+/g, "")
      .slice(0, 32) || "NA"
  );
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

function getSuggestedOrmFilename() {
  const scope = getRouteScope();
  const datePart = toIsoDateForOrm(scope);
  const cs =
    readText(qs(SEL.route.callsignDisplay, scope)).trim() || "CALLSIGN";
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

    if (Date.now() - start < maxMs) requestAnimationFrame(tick);
  };

  tick();
}

// ---------- DOM Field helpers (Viewer-iframe) ----------
function setDomFieldValue(iframe, fieldName, value) {
  const doc = iframe.contentDocument;
  if (!doc) return 0;

  const esc = (s) =>
    window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"');

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

// ---------- Autofill ----------
function setOrmField(iframe, fields, storage, name, value) {
  const currentDomValue = getDomFieldValue(iframe, name);

  const canOverwrite =
    !currentDomValue ||
    (name === "CS" && currentDomValue === (lastAutofill.cs ?? "")) ||
    (name === "Datum_af_date" &&
      currentDomValue === (lastAutofill.dateIso ?? ""));

  if (!canOverwrite) return false;

  for (const f of fields[name] || []) storage.setValue(f.id, { value });

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

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso) && fields["Datum_af_date"]?.length) {
    setOrmField(iframe, fields, storage, "Datum_af_date", dateIso);
    okDate = true;
  }

  if (fields["CS"]?.length) {
    setOrmField(iframe, fields, storage, "CS", cs);
    okCs = true;
  }

  // mark modified + refresh
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

      setTimeout(() => {
        scheduled = false;
      }, 600);
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

// ---------- Export helpers ----------
async function getEditedPdfBytesFromViewer(iframe) {
  const app = iframe?.contentWindow?.PDFViewerApplication;
  if (!app?.pdfDocument) throw new Error("PDF noch nicht geladen.");

  const doc = app.pdfDocument;

  let out;
  if (typeof doc.saveDocument === "function") {
    out = await doc.saveDocument();
  } else if (typeof doc.getData === "function") {
    out = await doc.getData();
  } else {
    throw new Error("PDF Export nicht möglich.");
  }

  // ---- normalize to Uint8Array / ArrayBuffer ----
  if (out instanceof ArrayBuffer) return out;

  if (ArrayBuffer.isView(out)) {
    // Uint8Array etc.
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  }

  // pdf-lib akzeptiert auch string, aber das wäre hier komisch.
  if (typeof out === "string") return out;

  // das ist dein aktueller Fehlerfall:
  // manchmal kommt hier z.B. number/NaN raus, wenn irgendwo versehentlich überschrieben wird
  console.error("[ORM] getEditedPdfBytesFromViewer: unexpected export type", {
    type: typeof out,
    value: out,
    ctor: out?.constructor?.name,
  });

  throw new Error(`PDF Export lieferte ungültige Daten (${typeof out}).`);
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

function bytesToArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  throw new Error("Unsupported bytes type for ArrayBuffer conversion");
}

async function maybeStamp(bytes) {
  // Debug: was kommt hier wirklich an?
  // console.log("[ORM] maybeStamp input", {
  //  type: typeof bytes,
  //  isAB: bytes instanceof ArrayBuffer,
  //  isView: ArrayBuffer.isView(bytes),
  //  byteLength: bytes?.byteLength,
  //  ctor: bytes?.constructor?.name,
  //  value: bytes,
  //});

  const sig = getSignatureDataUrl();
  if (!sig) return bytes;
  // ---------- Einfachstempel (ohne Sperre) ----------
  return await stampSignatureIntoPdf(bytes, sig, ORM_SIG_FIELDS); // muss deaktiviert werden, wenn die Alternative (direkt mit Sperre) aktiviert wird
  // --------------------------------------------------

  // ---------- Alternative: direkt mit Sperre stempeln (ohne nochmaliges Laden) ----------
  //let out = await stampSignatureIntoPdf(bytes, sig, ORM_SIG_FIELDS); // pdf-lib akzeptiert ArrayBuffer direkt
  //out = await lockFieldsInPdf(out, ORM_LOCK_FIELDS); // NEU: Felder sperren
  //return out;
  // --------------------------------------------------------------------------------------
}

// ---------- MAIN ----------
export function initOrmChecklist() {
  const overlay = qs(SEL.orm.overlay);
  const frame = qs(SEL.orm.frame);

  const btnOpen = qs(SEL.orm.btnOpen);
  const btnSave = qs(SEL.orm.btnSave);
  const btnFinalize = qs(SEL.orm.btnFinalize);
  const btnClose = qs(SEL.orm.btnClose);

  if (!btnOpen || !btnSave || !btnClose || !btnFinalize || !overlay || !frame) return;

  let isOpen = false;

  function setHint(msg = "") {
    setText(SEL.orm.hint, msg);
  }

  function openOrm() {
    // GH-Pages-sicherer Pfad
    const pdfPath =
      new URL("./data/ORMBlatt.pdf", window.location.href).pathname +
      `?v=${Date.now()}`;

    // Muss vor Viewer init passieren
    const onWebViewerLoaded = (ev) => {
      const w = ev?.detail?.source;
      const opts = w?.PDFViewerApplicationOptions;
      if (opts?.set) {
        opts.set("enableScripting", false);
      }
    };
    document.addEventListener("webviewerloaded", onWebViewerLoaded, { once: true });

    // Viewer laden
    frame.src = viewerUrl(pdfPath, { page: 1, zoom: "page-width" });

    // Nach load: UI + Autofill verdrahten
    frame.addEventListener("load", () => {
      applyMinimalUiWhenReady(frame);
      wireOrmAutofill(frame);

      setTimeout(() => autofillOrmFields(frame), 300);
      setTimeout(() => autofillOrmFields(frame), 900);
    }, { once: true });

    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");

    isOpen = true;
  }

  function closeOrm() {
    if (overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    qs(SEL.orm.btnOpen)?.focus();

    const app = frame.contentWindow?.PDFViewerApplication;
    try {
      app?.pdfDocument?.annotationStorage?.resetModified?.();
    } catch {}

    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
    frame.src = "about:blank";
    setHint("");
    isOpen = false;
  }

  function confirmCloseOrm() {
    if (!isOpen) return false;

    const modified =
      frame.contentWindow?.PDFViewerApplication?.pdfDocument?.annotationStorage
        ?.modified;

    if (!modified) {
      closeOrm();
      return true;
    }

    const ok = confirm(
      "ORM schließen?\n\nNicht gespeicherte Änderungen gehen verloren."
    );
    if (!ok) return false;

    closeOrm();
    return true;
  }

  async function saveOrm() {
    setHint("Speichern…");
    const filename = getSuggestedOrmFilename();

    // Modern Save Picker
    if ("showSaveFilePicker" in window) {
      let handle;

      try {
        handle = await showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
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
        let bytes = await getEditedPdfBytesFromViewer(frame);
        bytes = await maybeStamp(bytes);

        const writable = await handle.createWritable();
        await writable.write(bytes);
        await writable.close();

        // Attachment erst nach erfolgreichem Schreiben registrieren
        registerAttachment("orm", {
          name: filename,
          type: "application/pdf",
          getArrayBuffer: async () => bytesToArrayBuffer(bytes),
        });

        checklistSetToggle("orm", true);

        setHint("Gespeichert. Hinweis: macOS Vorschau zeigt Formularwerte ggf. nicht (PDF Expert/Acrobat nutzen).");
        closeOrm();
        return;
      } catch (e) {
        console.error(e);
        setHint("Speichern fehlgeschlagen.");
        return;
      }
    }

    // Fallback Download
    try {
      let bytes = await getEditedPdfBytesFromViewer(frame);
      bytes = await maybeStamp(bytes);

      registerAttachment("orm", {
        name: filename,
        type: "application/pdf",
        getArrayBuffer: async () => bytesToArrayBuffer(bytes),
      });

      downloadPdfBytes(bytes, filename);
      checklistSetToggle("orm", true);

      setHint("Download gestartet. Hinweis: macOS Vorschau zeigt Formularwerte ggf. nicht (PDF Expert/Acrobat nutzen).");
    } catch (e) {
      console.error(e);
      setHint("Speichern nicht möglich.");
    }
  }
  async function finalizeOrm() {
    setHint("Finalisieren…");

    const filename = getSuggestedOrmFilename();

    try {
      // 1) Export aus PDF.js
      let bytes = await getEditedPdfBytesFromViewer(frame);

      // 2) Signature/Initials rein + lock fields
      const sig = getSignatureDataUrl();
      if (!sig) {
        setHint("Keine Unterschrift gespeichert. Bitte in Settings hochladen oder zeichnen.");
        return;
      }

      bytes = await stampSignatureIntoPdf(bytes, sig, ORM_SIG_FIELDS);
      bytes = await lockFieldsInPdf(bytes, ORM_LOCK_FIELDS);

      // 3) Speichern (Picker wenn möglich, sonst Download)
      if ("showSaveFilePicker" in window) {
        const handle = await showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(bytes);
        await writable.close();
      } else {
        downloadPdfBytes(bytes, filename);
      }

      // 4) Attachment registrieren (nach erfolgreichem Write/Download)
      registerAttachment("orm", {
        name: filename,
        type: "application/pdf",
        getArrayBuffer: async () => bytesToArrayBuffer(bytes),
      });

      checklistSetToggle("orm", true);

      setHint("Finalisiert & gespeichert. Hinweis: macOS Vorschau zeigt Formularwerte ggf. nicht (PDF Expert/Acrobat nutzen).");
      closeOrm();
    } catch (e) {
      console.error(e);
      setHint("Finalisieren fehlgeschlagen.");
    }
  }
  btnOpen.addEventListener("click", openOrm);

  btnSave.addEventListener("click", () => {
    if (isOpen) saveOrm();
  });

  btnFinalize.addEventListener("click", () => {
    if (isOpen) finalizeOrm();
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