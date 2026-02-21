// js/orm.js
import { viewerUrl } from "./path.js";
import { registerAttachment } from "./attachments.js";

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
  const date = document.getElementById("dateInput")?.value?.trim() || "";
  const cs = document.getElementById("callSignDisplay")?.textContent?.trim() || "CALLSIGN";

  const m = date.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  const datePart = m
    ? `20${m[3]}-${m[2]}-${m[1]}`
    : new Date().toISOString().slice(0, 10);

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

function toIsoDateForOrm() {
  const raw0 = document.getElementById("dateInput")?.value ?? "";
  const raw = raw0.trim();

  // 1) schon ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // 2) dd.mm.yyyy
  let m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // 3) dd.mm.yy
  m = raw.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

  // 4) ddmmyy (z.B. 250213)
  m = raw.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

  // 5) ddmmyyyy
  m = raw.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // 6) fallback: heute
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

    // manche PDF.js Builds nutzen data-* statt name
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

function setOrmField(iframe, fields, storage, name, value) {
  // Aktuellen DOM-Wert prüfen (falls vorhanden)
  const currentDomValue = getDomFieldValue(iframe, name);

  // Nur überschreiben, wenn:
  // - Feld leer ist
  // - oder es noch den letzten von uns gesetzten Wert hat
  const canOverwrite =
    !currentDomValue ||
    (name === "CS" && currentDomValue === (lastAutofill.cs ?? "")) ||
    (name === "Datum1_af_date" && currentDomValue === (lastAutofill.dateIso ?? ""));

  if (!canOverwrite) return false;

  // Storage setzen (für saveDocument)
  for (const f of fields[name] || []) {
    storage.setValue(f.id, { value });
  }

  // DOM setzen (für Anzeige)
  const domHits = setDomFieldValue(iframe, name, value);
  return domHits > 0;
}

// liest DOM-Wert nach Feldnamen (passt zu deiner funktionierenden Lösung)
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

async function autofillOrmFields(iframe) {
  // ----- debug option ----- //
  // console.log("[ORM] autofillOrmFields() fired"); //
  // ------------------------ //

  const app = iframe.contentWindow?.PDFViewerApplication;
  const pdf = app?.pdfDocument;
  const storage = pdf?.annotationStorage;

  if (!pdf || !storage) return;

  const fields = await pdf.getFieldObjects();
  if (!fields) return;

  const dateIso = toIsoDateForOrm();
  const cs = document.getElementById("callSignDisplay")?.textContent?.trim() || "";

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
  
  // ----- debug option ----- //
  // console.log("[ORM] okDate/okCs:", okDate, okCs, "dateIso:", dateIso, "cs:", cs); //
  // ------------------------ //
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

      // 3 Versuche, falls PDF.js nochmal drüber rendert
      setTimeout(() => autofillOrmFields(iframe).catch(console.error), 0);
      setTimeout(() => autofillOrmFields(iframe).catch(console.error), 150);
      setTimeout(() => autofillOrmFields(iframe).catch(console.error), 500);

      // danach wieder erlauben, falls nochmal gerendert wird
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

    // sofort einmal anstoßen
    onAnyRender();
  });
}

// ---------- PDF Export ----------
async function getEditedPdfBytesFromViewer(iframe) {

  const app = iframe?.contentWindow?.PDFViewerApplication;

  if (!app?.pdfDocument)
    throw new Error("PDF noch nicht geladen.");

  if (app.pdfDocument.saveDocument)
    return await app.pdfDocument.saveDocument();

  if (app.pdfDocument.getData)
    return await app.pdfDocument.getData();

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

  const overlay = document.getElementById("ormOverlay");
  const frame   = document.getElementById("ormFrameOverlay");
  const hint    = document.getElementById("ormHintOverlay");

  const btnOpen = document.getElementById("btnOrm"); // bleibt in Checklist Controls
  const btnSave = document.getElementById("btnOrmSaveOverlay");
  const btnClose= document.getElementById("btnOrmCloseOverlay");


  if (!btnOpen || !btnSave || !btnClose || !overlay || !frame) return;

  let isOpen = false;

  function setHint(msg="") {
    if (hint) hint.textContent = msg;
  }


  function openOrm() {
    const pdfPath = `data/ORMBlatt.pdf?v=${Date.now()}`;

    frame.src = viewerUrl(pdfPath, {
      page: 1,
      zoom: "page-width"
    });

    frame.addEventListener("load", () => {
      applyMinimalUiWhenReady(frame);
      wireOrmAutofill(frame);

      setTimeout(() => autofillOrmFields(frame), 300);
      setTimeout(() => autofillOrmFields(frame), 900);

    }, { once:true });

    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
    setHint("ORM geöffnet (editierbar).");
    isOpen = true;
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

  function closeOrm() {
    // ✅ Fokus aus dem Overlay entfernen (verhindert aria-hidden warning)
    if (overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    document.getElementById("btnOrm")?.focus();

    // PDF.js dirty state reset...
    const app = frame.contentWindow?.PDFViewerApplication;
    try { app?.pdfDocument?.annotationStorage?.resetModified?.(); } catch {}

    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
    frame.src = "about:blank";
    setHint("");
    isOpen = false;
  }

  async function saveOrm() {

    setHint("Speichern…");

    const filename = getSuggestedOrmFilename();


    // modern Save Picker
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

        if (e.name === "AbortError") {
          setHint("Speichern abgebrochen.");
          return;
        }

        setHint("Save-Dialog fehlgeschlagen.");
        return;
      }


      try {

        const bytes = await getEditedPdfBytesFromViewer(frame);

        // ✅ ORM für Mail EO registrieren (finale Bytes)
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

        // Checklist automatisch abhaken
        import("./checklist.js").then(m => m.checklistSetToggle("orm", true));
        
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

      // ✅ ORM für Mail EO registrieren (finale Bytes)
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
    if (isOpen) saveOrm();  // deine bestehende saveOrm() kann bleiben (sie nutzt frame)
  });

  btnClose.addEventListener("click", () => {
    confirmCloseOrm();
  });

  function scheduleReAutofill() {
    if (!isOpen) return;

    clearTimeout(reAutofillTimer);
    reAutofillTimer = setTimeout(() => {
      // frame ist dein Overlay-iframe
      autofillOrmFields(frame).catch?.(() => {});
    }, 250);
  }

  // CallSignDisplay (div) beobachten
  const csEl = document.getElementById("callSignDisplay");
  if (csEl) {
    const mo = new MutationObserver(scheduleReAutofill);
    mo.observe(csEl, { childList: true, characterData: true, subtree: true });
  }

  // Datum-Input (normaler input event)
  const dateEl = document.getElementById("dateInput");
  dateEl?.addEventListener("input", scheduleReAutofill);
  dateEl?.addEventListener("change", scheduleReAutofill);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      confirmCloseOrm();
    }
  });
}