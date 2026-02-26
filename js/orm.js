// js/orm.js
import { viewerUrl } from "./path.js";
import { registerAttachment } from "./attachments.js";
import { qs, SEL, readValue, readText, setText } from "./ui/index.js";
import { checklistSetToggle } from "./checklist.js";
import { getSignatureDataUrl } from "./signature_store.js";
import { stampSignatureIntoPdf, lockFieldsInPdf, ORM_SIG_FIELDS, ORM_LOCK_FIELDS } from "./signature_stamp.js";

// ---------- Local Draft Storage (ORM in localStorage zwischenspeichern) ----------
const ORM_DRAFT_KEY = "fp.orm.draft.v1";
const ORM_STATUS_KEY = "fp.orm.status.v1";

function hasOrmDraft() {
  return !!localStorage.getItem(ORM_DRAFT_KEY);
}

function renderOrmStatusBadge() {
  // ORM-Zeile finden: die Zeile, in der #btnOrm steckt
  const btn = document.querySelector(SEL.orm.btnOpen);
  const row = btn?.closest("#view-checklist .cg-row");
  const cell = row?.querySelector(".cg-status");
  if (!cell) return;

  // status aus localStorage
  const status = getOrmStatus(); // "template" | "draft" | "final"
  const draft = hasOrmDraft();

  // status "draft" nur wenn wirklich draft vorhanden ist
  const effective =
    (status === "draft" && draft) ? "draft"
    : (status === "final") ? "final"
    : (draft ? "draft" : "template");

  const badgeText =
    effective === "draft" ? "ENTWURF lokal gespeichert"
    : effective === "final" ? "FINALISIERT & exportiert"
    : "NEU - Template";

  const msg =
    // effective === "draft" ? "Entwurf lokal gespeichert" <-- wenn der Badge-Text nicht ausführlich ist
    // : effective === "final" ? "Finalisiert & exportiert" <-- wenn der Badge-Text nicht ausführlich ist
    // : "Template (noch nicht gespeichert)"; <-- wenn der Badge-Text nicht ausführlich ist

  cell.innerHTML = `
    <span class="orm-status">
      <span class="orm-badge is-${effective}">${badgeText}</span>
      <span class="orm-status-text">${msg}</span>
    </span>
  `;
}

function syncChecklistOrmUi() {
  const btnOrm = document.querySelector(SEL.orm.btnOpen); // "#btnOrm"
  const btnMail = document.querySelector("#btnMailEO");

  if (!btnOrm || !btnMail) return;

  const status = getOrmStatus(); // "template" | "draft" | "final"
  const hasDraft = !!localStorage.getItem(ORM_DRAFT_KEY);

  let effective;

  if (status === "final") effective = "final";
  else if (hasDraft) effective = "draft";
  else effective = "template";

  switch (effective) {

    case "final":
      btnOrm.textContent = "ORM finalisiert";
      btnOrm.disabled = true;

      btnMail.disabled = false;
      btnMail.textContent = "Mail EO senden";
      break;

    case "draft":
      btnOrm.textContent = "Entwurf öffnen";
      btnOrm.disabled = false;

      btnMail.disabled = true;
      btnMail.textContent = "Mail EO senden";
      break;

    default: // template
      btnOrm.textContent = "ORM öffnen";
      btnOrm.disabled = false;

      btnMail.disabled = true;
      btnMail.textContent = "Mail EO senden";
      break;
  }
}

function resetOrmToTemplate(reason = "") {
  clearOrmDraft();
  setOrmStatus("template");

  // optional: Hinweis im Overlay, falls es gerade offen ist
  // setHint(`ORM zurückgesetzt (${reason}).`);

  renderOrmStatusBadge();
  syncChecklistOrmUi();
}

function abToBase64(ab) {
  const u8 = new Uint8Array(ab);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function base64ToAb(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
}

function saveOrmDraftToLocal(bytes) {
  const ab = bytesToArrayBuffer(bytes);
  localStorage.setItem(ORM_DRAFT_KEY, abToBase64(ab));
}

function loadOrmDraftFromLocal() {
  const b64 = localStorage.getItem(ORM_DRAFT_KEY);
  if (!b64) return null;
  try { return base64ToAb(b64); } catch { return null; }
}

function clearOrmDraft() {
  localStorage.removeItem(ORM_DRAFT_KEY);
}

function setOrmStatus(status) {
  localStorage.setItem(ORM_STATUS_KEY, status);
}

function getOrmStatus() {
  return localStorage.getItem(ORM_STATUS_KEY) || "template";
}

function clearOrmStatus() {
  localStorage.removeItem(ORM_STATUS_KEY);
}
// ---------------------------------------------------------------------------------

// ---------- Debug optional ----------
const DEBUG_ORM = false;
function dlog(...args) {
  if (!DEBUG_ORM) return;
  console.log("[orm]", ...args);
}
// ------------------------------------

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

// ---------- ORM Mode (Draft vs Template) setzen ----------
function setOrmMode(mode) {
  const hintEl = qs(SEL.orm.hint);
  const barEl = hintEl?.closest(".orm-overlay-bar");
  if (!hintEl || !barEl) return;

  barEl.classList.remove("is-draft", "is-template");
  hintEl.classList.remove("orm-hint--draft", "orm-hint--template");

  if (mode === "draft") {
    barEl.classList.add("is-draft");
    hintEl.classList.add("orm-hint--draft");
  } else {
    barEl.classList.add("is-template");
    hintEl.classList.add("orm-hint--template");
  }
}// ---------------------------------------------------------

function getOrmStatusTextAndClass() {
  const status = getOrmStatus(); // "template" | "draft" | "final"
  if (status === "draft") return { cls: "orm-status-draft", text: "🟡 Entwurf vorhanden (lokal gespeichert)." };
  if (status === "final") return { cls: "orm-status-final", text: "🟢 Finalisiert & exportiert." };
  return { cls: "orm-status-template", text: "⚪ Neues ORM (Template)." };
}

function applyOrmStatusIndicator() {
  const hintEl = qs(SEL.orm.hint);
  if (!hintEl) return null;

  hintEl.classList.remove("orm-status-template", "orm-status-draft", "orm-status-final");

  const { cls, text } = getOrmStatusTextAndClass();
  hintEl.classList.add(cls);
  return text; // Text geben wir an init zurück, damit dort setHint() genutzt wird
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
  if (typeof out === "string") {
    throw new Error("PDF Export lieferte String – unerwartet. (Bitte Konsole prüfen)");
  }

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
  // 1) Normal: ArrayBuffer
  if (bytes instanceof ArrayBuffer) return bytes;

  // 2) Normal: TypedArray/DataView
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  // 3) Cross-realm TypedArray/DataView (aus iframe):
  // Duck-typing: hat byteLength + buffer + byteOffset?
  if (bytes && typeof bytes === "object") {
    const hasByteLen = typeof bytes.byteLength === "number";
    const hasBuf = bytes.buffer && typeof bytes.buffer.byteLength === "number";

    if (hasByteLen && hasBuf) {
      const off = typeof bytes.byteOffset === "number" ? bytes.byteOffset : 0;
      return bytes.buffer.slice(off, off + bytes.byteLength);
    }

    // 4) Cross-realm ArrayBuffer (selten): nur byteLength vorhanden
    if (hasByteLen && typeof bytes.slice === "function") {
      return bytes.slice(0);
    }
  }

  // Debug-Hilfe:
  console.error("[ORM] bytesToArrayBuffer unsupported type", {
    type: typeof bytes,
    ctor: bytes?.constructor?.name,
    keys: bytes && typeof bytes === "object" ? Object.keys(bytes) : null,
    value: bytes,
  });

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
  document.querySelector("#btnMailEO")?.setAttribute("disabled", "disabled");
  const overlay = qs(SEL.orm.overlay);
  const frame = qs(SEL.orm.frame);

  const btnOpen = qs(SEL.orm.btnOpen);
  const btnSave = qs(SEL.orm.btnSave);
  const btnFinalize = qs(SEL.orm.btnFinalize);
  const btnClose = qs(SEL.orm.btnClose);

  if (!btnOpen || !btnSave || !btnClose || !btnFinalize || !overlay || !frame) return;

  // ---------- Fixe Button-Beschriftung ----------
  btnSave.textContent = "Entwurf speichern";
  btnFinalize.textContent = "Finalisieren & exportieren";
  btnClose.textContent = "Schließen ohne speichern";
  renderOrmStatusBadge();
  syncChecklistOrmUi();

  let isOpen = false;

  function setHint(msg = "") {
    setText(SEL.orm.hint, msg);
  }

  function openOrm() {
    // ---------- ORM-Dokument entweder aus localStorage laden (wenn zwischengespeichert) oder frisches Template laden ----------
    const draft = loadOrmDraftFromLocal();
    let pdfPath;
    let blobUrlToRevoke = null;
    if (draft) {
      // Draft aus localStorage als Blob-URL laden
      const blob = new Blob([draft], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      pdfPath = url; // viewerUrl encodiert das korrekt
      blobUrlToRevoke = url;
      setHint("ORM Entwurf geladen (letzte gespeicherte Version).");
      setOrmMode("draft");
      // Button-Label je nach Modus
      btnSave.textContent = "Entwurf speichern";
      btnFinalize.textContent = "Finalisieren & exportieren";
    } else {
      pdfPath = new URL("./data/ORMBlatt.pdf", window.location.href).pathname + `?v=${Date.now()}`;
      setHint("ORM geöffnet (Template).");
      setOrmMode("template");
    }
    // --------------------------------------------------------------------------------------------------------------

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
      // Wichtig: nicht hier revoke! PDF ist zu diesem Zeitpunkt noch nicht geladen.
      const app = frame.contentWindow?.PDFViewerApplication;

      // Wenn möglich: warten bis PDF wirklich geladen ist
      const revokeLater = () => {
        try {
          if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
        } catch {}
        blobUrlToRevoke = null;
      };

      // Best case: PDF.js EventBus
      try {
        app?.eventBus?.on?.("documentloaded", revokeLater);
      } catch {}

      // Fallback: wenn eventBus nicht greift, nach ein paar Sekunden revoke
      // (oder diesen Fallback einfach weglassen, dann "leakt" es minimal, ist aber ok)
      setTimeout(revokeLater, 8000);

      // (Optional) hier wieder deine UI/Autofill Hooks rein:
      applyMinimalUiWhenReady(frame);
      wireOrmAutofill(frame);
      setTimeout(() => autofillOrmFields(frame), 300);
      setTimeout(() => autofillOrmFields(frame), 900);
    }, { once: true });

    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");

    isOpen = true;
    renderOrmStatusBadge();
    syncChecklistOrmUi();
    const msg = applyOrmStatusIndicator();
    if (msg) setHint(msg);
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
    setHint("Entwurf speichern…");
    try {
      // 1) Export aus PDF.js (inkl. aller aktuellen Einträge)
      let bytes = await getEditedPdfBytesFromViewer(frame);

      // 2) Optional: KEIN Stempel hier (Entwurf bleibt „roh“)
      // bytes = await maybeStamp(bytes);  // <- bewusst NICHT

      // 3) Nur localStorage
      saveOrmDraftToLocal(bytes);
      setOrmStatus("draft");
      renderOrmStatusBadge();
      syncChecklistOrmUi();

      // Optional: auch als Attachment registrieren (für Mail etc.)
      // (Wenn du wirklich NUR localStorage willst: diesen Block auskommentieren.)
      // const filename = getSuggestedOrmFilename();
      // registerAttachment("orm", {
      //  name: filename,
      //  type: "application/pdf",
      //  getArrayBuffer: async () => bytesToArrayBuffer(bytes),
      // });

      checklistSetToggle("orm", true);
      setHint("Entwurf gespeichert (nur lokal im Browser). Zum Export: Finalisieren.");
      closeOrm();
    } catch (e) {
      console.error(e);
      setHint("Entwurf speichern fehlgeschlagen.");
    }
  }
  async function finalizeOrm() {
    setHint("Finalisieren…");
    const filename = getSuggestedOrmFilename();
    // OPTION: const filename = getSuggestedOrmFilename().replace(/\.pdf$/i, "-FINAL.pdf");

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
      setOrmStatus("final");
      clearOrmDraft();
      renderOrmStatusBadge();
      syncChecklistOrmUi();
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

  // --- Reset ORM wenn Datum/CS wechseln (Draft + Final) ---
  let lastKey = null;

  function currentOrmKey() {
    const scope = getRouteScope();
    const dateIso = toIsoDateForOrm(scope);
    const cs = readText(qs(SEL.route.callsignDisplay, scope)).trim();
    return `${dateIso}__${cs}`;
  }

  function maybeResetOnKeyChange() {
    const key = currentOrmKey();

    // initial setzen (kein Reset)
    if (lastKey === null) {
      lastKey = key;
      return;
    }

    if (key === lastKey) return;
    lastKey = key;

    const hadDraft = !!localStorage.getItem(ORM_DRAFT_KEY);
    const status = getOrmStatus(); // "template" | "draft" | "final"
    const wasFinal = status === "final";

    // Nur resetten, wenn es wirklich was zu verwerfen gibt
    if (hadDraft || wasFinal) {
      resetOrmToTemplate("Datum/Callsign geändert");
    } else {
      // optional: UI trotzdem sauber ziehen, falls du willst
      // renderOrmStatusBadge();
      // syncChecklistOrmUi();
    }
  }

  // Callsign beobachten
  const csEl2 = qs(SEL.route.callsignDisplay);
  if (csEl2) {
    const mo2 = new MutationObserver(maybeResetOnKeyChange);
    mo2.observe(csEl2, { childList: true, characterData: true, subtree: true });
  }

  // Datum beobachten
  const dateEl2 = qs(SEL.route.dateInput);
  dateEl2?.addEventListener("input", maybeResetOnKeyChange);
  dateEl2?.addEventListener("change", maybeResetOnKeyChange);

  // einmal initialisieren
  maybeResetOnKeyChange();

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