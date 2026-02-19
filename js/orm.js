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

  // optional: DATE TT.MM.JJ -> 20YY-MM-DD
  const m = date.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  const datePart = m ? `20${m[3]}-${m[2]}-${m[1]}` : new Date().toISOString().slice(0,10);

  return `ORM-${sanitizeFilePart(datePart)}-${sanitizeFilePart(cs)}.pdf`;
}

async function savePdfBytesWithPicker(bytes, suggestedName) {
  const picker = await window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: "PDF",
        accept: { "application/pdf": [".pdf"] },
      },
    ],
  });

  const writable = await picker.createWritable();
  await writable.write(bytes);
  await writable.close();
}

function downloadPdfBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

async function getEditedPdfBytesFromViewer(iframe) {
  const w = iframe?.contentWindow;
  if (!w) throw new Error("ORM Viewer nicht verfügbar.");

  const app = w.PDFViewerApplication;
  if (!app?.pdfDocument) throw new Error("PDF noch nicht geladen.");

  // Beste Variante (enthält Form/Annotation changes)
  if (typeof app.pdfDocument.saveDocument === "function") {
    const u8 = await app.pdfDocument.saveDocument();
    return u8;
  }

  // Fallback (kann je nach Version ohne Form-Änderungen sein)
  if (typeof app.pdfDocument.getData === "function") {
    const u8 = await app.pdfDocument.getData();
    return u8;
  }

  throw new Error("Kann PDF Daten nicht exportieren (saveDocument/getData fehlt).");
}

export function initOrmChecklist() {
  const btn = document.getElementById("btnOrm");
  const wrap = document.getElementById("ormWrap");
  const frame = document.getElementById("ormFrame");
  const hint = document.getElementById("ormHint");

  if (!btn || !wrap || !frame) return;

  let isOpen = false;

  function setHint(msg = "") {
    if (!hint) return;
    hint.textContent = msg;
  }

function buildOrmViewerSrc() {
  const viewerUrl = new URL("pdfjs/web/viewer.html", document.baseURI);
  const pdfUrl = new URL("data/ORMBlatt.pdf", document.baseURI); // => /fp/data/ORMBlatt.pdf
  viewerUrl.searchParams.set("file", pdfUrl.toString());
  return viewerUrl.toString();
}


function openOrm() {
  frame.src = viewerUrl("data/ORMBlatt.pdf");

  wrap.classList.remove("is-hidden");
  btn.textContent = "ORM speichern";
  setHint("ORM geöffnet (editierbar).");
  isOpen = true;
}



  function closeOrm() {
    wrap.classList.add("is-hidden");
    // Viewer “wirklich” entladen
    frame.src = "about:blank";
    btn.textContent = "ORM öffnen";
    setHint("");
    isOpen = false;
  }

async function saveOrm() {
  setHint("Speichern…");
  const filename = getSuggestedOrmFilename();

  // 1) Beste UX: echter Save-As Dialog (Chrome/Edge)
  if ("showSaveFilePicker" in window) {
    let handle;
    try {
      // ✅ sofort im Click-Event öffnen -> Cancel zuverlässig
      handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
      });
    } catch (e) {
      if (e?.name === "AbortError") {
        setHint("Speichern abgebrochen – ORM bleibt geöffnet.");
        return; // ✅ bleibt offen
      }
      console.error(e);
      setHint("Save-Dialog fehlgeschlagen – ORM bleibt geöffnet.");
      return;
    }

    // 2) Jetzt erst PDF-Bytes aus dem Viewer holen
    let bytes;
    try {
      bytes = await getEditedPdfBytesFromViewer(frame);
    } catch (e) {
      console.error(e);
      setHint("Speichern nicht möglich (PDF noch nicht bereit?).");
      return; // bleibt offen
    }

    // 3) Schreiben
    try {
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();

      setHint("Gespeichert.");
      closeOrm(); // ✅ nach Erfolg schließen + Button zurück
      return;
    } catch (e) {
      console.error(e);
      setHint("Speichern fehlgeschlagen – ORM bleibt geöffnet.");
      return;
    }
  }

  // Fallback: Download (Cancel nicht sauber erkennbar)
  try {
    const bytes = await getEditedPdfBytesFromViewer(frame);
    downloadPdfBytes(bytes, filename);
    setHint("Download gestartet. ORM bleibt geöffnet.");
  } catch (e) {
    console.error(e);
    setHint("Speichern nicht möglich (PDF noch nicht bereit?).");
  }
}

  btn.addEventListener("click", async () => {
    if (!isOpen) openOrm();
    else await saveOrm();
  });
}