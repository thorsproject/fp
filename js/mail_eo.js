// js/mail_eo.js
// Erstellt eine .eml (RFC822) inkl. Attachments -> Nutzer öffnet sie im Mailprogramm und sendet selbst.

import { collectAttachments, hasAttachment } from "./attachments.js";
import { qs, qsa, SEL, readText, readValue, setDisabled, toggleClass } from "./ui/index.js";

const LS_MAIL_MODE = "fp.mail_eo.mode"; // "auto" | "picker"

const DEBUG_MAIL = false;
function dlog(...args) {
  if (!DEBUG_MAIL) return;
  console.log("[mail_eo]", ...args);
}

// ------------------ MODE (auto | picker) ------------------
export function getMailMode() {
  const cb = qs(SEL.mail.cbUsePicker);
  if (cb) return readValue(cb) ? "picker" : "auto";
  return localStorage.getItem(LS_MAIL_MODE) === "picker" ? "picker" : "auto";
}

function setMailMode(mode) {
  localStorage.setItem(LS_MAIL_MODE, mode === "picker" ? "picker" : "auto");
}

// ------------------ UI ------------------
function setMailButtonState() {
  const btn = qs(SEL.mail.btnSend);
  if (!btn) return;

  const mode = getMailMode();
  const ready = mode === "picker" ? true : hasAttachment("orm");

  setDisabled(btn, !ready);
  toggleClass(btn, "is-disabled", !ready);

  btn.title =
    mode === "picker"
      ? "EO-Mail erstellen (Dateien manuell auswählen)"
      : ready
        ? "EO-Mail erstellen"
        : "Bitte zuerst ORM speichern, dann Mail EO senden.";
}

function wireMailModeCheckbox() {
  const cb = qs(SEL.mail.cbUsePicker);
  if (!cb || cb.dataset.wired === "1") return;

  cb.checked = localStorage.getItem(LS_MAIL_MODE) === "picker";

  cb.addEventListener("change", () => {
    setMailMode(readValue(cb) ? "picker" : "auto");
    setMailButtonState();
  });

  cb.dataset.wired = "1";
}

function wireMailButton() {
  const btn = qs(SEL.mail.btnSend);
  if (!btn || btn.dataset.wired === "1") return;

  btn.addEventListener("click", async () => {
    const mode = getMailMode();
    await handleMailEOClick(mode);
  });

  btn.dataset.wired = "1";
}

function refreshMailUi() {
  wireMailModeCheckbox();
  wireMailButton();
  setMailButtonState();
}

// öffentliches init statt “Side-Effects beim Import”
export function initMailEO() {
  refreshMailUi();

  // Nach Includes (Settings kommt per Partial)
  window.addEventListener("fp:includes-loaded", refreshMailUi);

  // Wenn Attachments sich ändern (ORM gespeichert etc.)
  window.addEventListener("fp:attachments-changed", setMailButtonState);
}

// ------------------ Helpers ------------------
function getEmailRecipient() {
  return readText(qs(SEL.mail.recipient)).trim();
}

function getWxValues() {
  const nr = String(readValue(qs(SEL.mail.wxNr)) || "").trim();
  const v  = String(readValue(qs(SEL.mail.wxVoid)) || "").trim();
  const i  = String(readValue(qs(SEL.mail.wxInit)) || "").trim();
  return { nr, voidv: v, init: i };
}

function sanitizeFilePart(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .slice(0, 32) || "NA";
}

function getCallsign() {
  return readText(qs(SEL.route.callsignDisplay)).trim();
}

function toIsoDate(raw) {
  const s = String(raw || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;

  return new Date().toISOString().slice(0, 10);
}

function getIsoDateFromUi() {
  const raw = readValue(qs(SEL.route.dateInput)) || "";
  return toIsoDate(raw);
}

function looksLikeOrmFile(file) {
  const n = (file?.name || "").toLowerCase();
  return n.startsWith("orm-") || n.includes("ormblatt") || n.includes("orm");
}

function sortFilesOrmFirst(files) {
  return [...files].sort((a, b) => {
    const ao = looksLikeOrmFile(a) ? 0 : 1;
    const bo = looksLikeOrmFile(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return (a.name || "").localeCompare(b.name || "");
  });
}

function buildAttachmentSummary(files) {
  const names = files.map((f) => `- ${f.name}`);
  const ormCount = files.filter(looksLikeOrmFile).length;
  const logCount = Math.max(0, files.length - ormCount);

  return {
    ormCount,
    logCount,
    text: [
      "Anhänge:",
      ...names,
      "",
      `ORM: ${ormCount} | Logs: ${logCount} | Gesamt: ${files.length}`,
    ].join("\r\n"),
  };
}

function buildSubject({ isoDate, cs, logCount }) {
  const csPart = cs ? ` ${cs}` : "";
  const logsPart = logCount > 0 ? ` +${logCount} Logs` : "";
  return `Flight Planning ${isoDate}${csPart}${logsPart}`;
}

function buildEmlFilename({ isoDate, cs }) {
  const csPart = cs ? `-${sanitizeFilePart(cs)}` : "";
  return `EO-Mail-${sanitizeFilePart(isoDate)}${csPart}.eml`;
}

// ------------------ MIME helpers ------------------
function toBase64(uint8) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function wrapBase64(b64, lineLen = 76) {
  const out = [];
  for (let i = 0; i < b64.length; i += lineLen) out.push(b64.slice(i, i + lineLen));
  return out.join("\r\n");
}

function safeFilename(name) {
  return (name || "attachment").replace(/[\/\\?%*:|"<>]/g, "_").trim();
}

function encodeHeaderUTF8(str) {
  const bytes = new TextEncoder().encode(str);
  const b64 = toBase64(bytes);
  return `=?UTF-8?B?${b64}?=`;
}

function textToBase64(str) {
  const u8 = new TextEncoder().encode(str);
  return wrapBase64(toBase64(u8));
}

async function buildEml({ to, subject, body, files }) {
  const boundary = "----=_fp_" + Math.random().toString(16).slice(2);
  const now = new Date();
  const msgId = `<fp-${now.getTime()}-${Math.random().toString(16).slice(2)}@local>`;

  const headers = [
    `From: Flight Planning <no-reply@local>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderUTF8(subject)}`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: ${msgId}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `This is a multi-part message in MIME format.`,
    ``,
  ].join("\r\n");

  const textPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: inline`,
    ``,
    textToBase64(body),
    ``,
  ].join("\r\n");

  const attachmentParts = [];
  for (const file of files) {
    const ab = await file.arrayBuffer();
    const u8 = new Uint8Array(ab);
    const b64 = wrapBase64(toBase64(u8));

    const filename = safeFilename(file.name);
    const ctype = file.type || "application/octet-stream";

    attachmentParts.push([
      `--${boundary}`,
      `Content-Type: ${ctype}; name="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${filename}"`,
      ``,
      b64,
      ``,
    ].join("\r\n"));
  }

  const end = [
    `--${boundary}--`,
    ``,
  ].join("\r\n");

  return headers + textPart + attachmentParts.join("\r\n") + "\r\n" + end;
}

// ------------------ Picker ------------------
async function pickFilesViaDialog() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.style.display = "none";
  document.body.appendChild(input);

  const files = await new Promise((resolve) => {
    input.onchange = () => resolve(Array.from(input.files || []));
    input.click();
  });

  input.remove();
  return files;
}

// ------------------ Main action ------------------
export async function handleMailEOClick(mode = "auto") {
  const to = getEmailRecipient();
  if (!to) {
    alert("Kein Empfänger gefunden (Element .email fehlt/leer).");
    return;
  }

  let files = [];
  if (mode === "picker") {
    files = await pickFilesViaDialog();
    if (!files.length) return;
  } else {
    files = await collectAttachments();
    if (!files.length) {
      alert("Keine Anhänge vorhanden. Bitte ORM speichern (und später Logs erzeugen/importieren).");
      return;
    }
  }

  files = sortFilesOrmFirst(files);

  const isoDate = getIsoDateFromUi();
  const cs = getCallsign();

  const { logCount } = buildAttachmentSummary(files);
  const subject = buildSubject({ isoDate, cs, logCount });

  const wx = getWxValues();
  const body = [
    "Moin an den Einsatz,",
    "",
    `anbei die Legs und das ORM für ${isoDate}${cs ? ` (${cs})` : ""}.`,
    `Wetter ist gecheckt, Wx-Nr.: ${wx.nr || "-"}, VOID: ${wx.voidv || "-"}, Initials: ${wx.init || "-"}.`,
    "",
    buildAttachmentSummary(files).text,
    "",
    "Grüße aus Laage",
    "",
  ].join("\r\n");

  const eml = await buildEml({ to, subject, body, files });

  const blob = new Blob([eml], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = buildEmlFilename({ isoDate, cs });
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}