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

  if (!btn || !wrap || !frame) return;

  let isOpen = false;

  function setHint(msg="") {
    if (hint) hint.textContent = msg;
  }


  function openOrm() {

    frame.src = viewerUrl("data/ORMBlatt.pdf", {
      page: 1,
      zoom: "page-width"
    });

    frame.addEventListener("load", () => {
      applyMinimalUiWhenReady(frame);
    }, { once:true });

    wrap.classList.remove("is-hidden");

    btn.textContent = "ORM speichern";
    setHint("ORM geöffnet (editierbar).");

    isOpen = true;
  }


  function closeOrm() {

    wrap.classList.add("is-hidden");

    frame.src = "about:blank";

    btn.textContent = "ORM öffnen";

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

}