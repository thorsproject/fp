// js/orm.js
import { viewerUrl } from "./path.js";

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
      margin:6px auto !important;
      border-radius:8px;
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

async function autofillOrmFields(iframe) {
  const app = iframe.contentWindow?.PDFViewerApplication;
  const pdf = app?.pdfDocument;
  const storage = pdf?.annotationStorage;

  if (!pdf || !storage) return;

  const fields = await pdf.getFieldObjects();
  if (!fields) return;

  const dateIso = toIsoDateForOrm();
  const cs = document.getElementById("callSignDisplay")?.textContent?.trim() || "";

  // Storage-Setter: Feldname -> alle Widget-IDs
  const setFieldByName = (name, value) => {
    const arr = fields[name];
    if (!arr?.length) return false;
    arr.forEach((f) => storage.setValue(f.id, { value }));
    return true;
  };

  // DOM-Sync: Widget-ID -> input im Annotation-Layer
  const setDomValueByWidgetId = (id, value) => {
    const root = iframe.contentDocument;
    const wrap = root?.querySelector(`[data-annotation-id="${CSS.escape(id)}"]`);
    const el = wrap?.querySelector("input, textarea, select");
    if (!el) return false;

    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  // 1) Storage setzen
  let okDate = false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    console.warn("[ORM] Ungültiges Datum, setze Datum nicht:", dateIso);
  } else {
    okDate = setFieldByName("Datum1_af_date", dateIso);
  }

  const okCs = setFieldByName("CS", cs);

  // 2) DOM sichtbar machen (nur für Felder, die es gibt)
  if (okDate) {
    for (const f of fields["Datum1_af_date"] || []) {
      setDomValueByWidgetId(f.id, dateIso);
    }
  }

  if (okCs) {
    for (const f of fields["CS"] || []) {
      setDomValueByWidgetId(f.id, cs);
    }
  }

  // 3) Viewer informieren / refresh
  storage.onSetModified?.(true);
  app?.eventBus?.dispatch?.("annotationstoragechanged", { source: storage });
  app?.pdfViewer?.refresh?.();

  console.log("[ORM] okDate/okCs:", okDate, okCs, "dateIso:", dateIso, "cs:", cs);
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


// ---------- MAIN ----------
export function initOrmChecklist() {

  const btn   = document.getElementById("btnOrm");
  const wrap  = document.getElementById("ormWrap");
  const frame = document.getElementById("ormFrame");
  const hint  = document.getElementById("ormHint");
  const btnClose = document.getElementById("btnOrmClose");

  if (!btn || !btnClose || !wrap || !frame) return;

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
    }, { once:true });

    wrap.classList.remove("is-hidden");

    btn.textContent = "ORM speichern";
    btnClose.classList.remove("is-hidden");
    setHint("ORM geöffnet (editierbar).");

    isOpen = true;
  }

  function confirmCloseOrm() {
    if (!isOpen) return false; // ✅ wenn nicht offen: nichts tun, keine Warnung

    const ok = confirm("ORM schließen?\n\nNicht gespeicherte Änderungen gehen verloren.");
    if (!ok) return false;

    closeOrm();
    return true;
  }

  function closeOrm() {

    wrap.classList.add("is-hidden");

    frame.src = "about:blank";

    btn.textContent = "ORM öffnen";
    btnClose.classList.add("is-hidden");

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

        const writable = await handle.createWritable();

        await writable.write(bytes);

        await writable.close();

        setHint("Gespeichert.");

        closeOrm();

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

      downloadPdfBytes(bytes, filename);

      setHint("Download gestartet.");

    } catch (e) {

      console.error(e);

      setHint("Speichern nicht möglich.");

    }
  }


  btn.addEventListener("click", () => {

    if (isOpen) saveOrm();

    else openOrm();

  });

  btnClose.addEventListener("click", () => {
    confirmCloseOrm();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      confirmCloseOrm();
    }
  });
}