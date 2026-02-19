// js/orm.js
const ORM_PDF_PATH = "data/ORMBlatt.pdf";   // dein PDF
const VIEWER_URL   = "pdfjs/web/viewer.html"; // lokaler PDF.js Viewer

function $(id){ return document.getElementById(id); }

function getViewerWin() {
  const frame = $("ormFrame");
  return frame?.contentWindow || null;
}

// versucht, aus PDF.js die "aktuelle" Datei (inkl. Form-Änderungen) zu bekommen
async function getEditedPdfBytesFromPdfjs() {
  const win = getViewerWin();
  const app = win?.PDFViewerApplication;
  if (!app) throw new Error("PDFViewerApplication nicht verfügbar.");

  // PDF.js hat (je nach Version) saveDocument() oder getData() Variationen.
  // Wir probieren robust mehrere Wege.
  if (app.pdfDocument?.saveDocument) {
    const bytes = await app.pdfDocument.saveDocument();
    return bytes; // Uint8Array
  }

  if (app.pdfDocument?.getData) {
    // Achtung: getData() kann je nach Version original sein – saveDocument ist besser
    const bytes = await app.pdfDocument.getData();
    return bytes;
  }

  throw new Error("PDF.js liefert keine exportierbaren Bytes (saveDocument/getData fehlt).");
}

async function saveAsNative(bytes, suggestedName = "ORMBlatt.pdf") {
  // 1) echter Save-As Dialog (Chromium/Edge)
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: "PDF Dokument",
        accept: { "application/pdf": [".pdf"] }
      }]
    });

    const writable = await handle.createWritable();
    await writable.write(new Blob([bytes], { type: "application/pdf" }));
    await writable.close();
    return true;
  }

  // 2) Fallback: Download (kein echter "Cancel" möglich)
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  return true;
}

export function initORM() {
  const btn = $("btnOrm");
  const host = $("ormHost");
  const frame = $("ormFrame");
  if (!btn || !host || !frame) return;

  let isOpen = false;

  function openOrm() {
    // PDF.js viewer lädt file=...
    frame.src = `${VIEWER_URL}?file=${encodeURIComponent("/" + ORM_PDF_PATH)}`;
    host.classList.remove("is-hidden");
    btn.textContent = "ORM speichern";
    isOpen = true;
  }

  function closeOrm() {
    host.classList.add("is-hidden");
    frame.src = "about:blank";
    btn.textContent = "ORM öffnen";
    isOpen = false;
  }

  async function saveOrm() {
    // hier soll: wenn Cancel -> offen bleiben
    try {
      const bytes = await getEditedPdfBytesFromPdfjs();

      // Dateiname Vorschlag (optional: Datum/Callsign)
      const ok = await saveAsNative(bytes, "ORMBlatt-Ausgefüllt.pdf");

      if (ok) {
        // gespeichert -> schließen
        closeOrm();
      }
    } catch (e) {
      // User hat im Save Picker abgebrochen?
      if (e?.name === "AbortError") {
        // NICHT schließen, Bearbeitungsmodus bleibt
        return;
      }
      console.error(e);
      alert("ORM speichern fehlgeschlagen:\n" + (e?.message || e));
      // offen lassen, damit User nichts verliert
    }
  }

  btn.addEventListener("click", async () => {
    if (!isOpen) openOrm();
    else await saveOrm();
  });
}