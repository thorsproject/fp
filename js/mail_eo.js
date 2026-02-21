// js/mail_eo.js
// Erstellt eine .eml (RFC822) inkl. Attachments -> Nutzer öffnet sie im Mailprogramm und sendet selbst.
import { collectAttachments , hasAttachment } from "./attachments.js";

const LS_MAIL_MODE = "fp.mail_eo.mode"; // "auto" | "picker"

export function getMailMode() {
  // 1) Checkbox gewinnt, wenn vorhanden
  const cb = document.getElementById("mailEoUsePicker");
  if (cb) return cb.checked ? "picker" : "auto";

  // 2) Fallback auf localStorage
  return localStorage.getItem(LS_MAIL_MODE) === "picker" ? "picker" : "auto";
}

function setMailMode(mode) {
  localStorage.setItem(LS_MAIL_MODE, mode);
}

function setMailButtonState() {
  const btn = document.getElementById("btnMailEO");
  if (!btn) return;

  const mode = getMailMode();
  const ready = mode === "picker" ? true : hasAttachment("orm");

  btn.disabled = !ready;
  btn.classList.toggle("is-disabled", !ready);
  btn.title =
    mode === "picker"
      ? "EO-Mail erstellen (Dateien manuell auswählen)"
      : ready
        ? "EO-Mail erstellen"
        : "Bitte zuerst ORM speichern, dann Mail EO senden.";
}

function wireMailModeCheckbox() {
  const cb = document.getElementById("mailEoUsePicker");
  if (!cb || cb.dataset.wired === "1") return;

  cb.checked = localStorage.getItem(LS_MAIL_MODE) === "picker";

  cb.addEventListener("change", () => {
    localStorage.setItem(LS_MAIL_MODE, cb.checked ? "picker" : "auto");
    setMailButtonState();
  });

  cb.dataset.wired = "1";
}

// 1) falls Settings schon im DOM sind
wireMailModeCheckbox();
setMailButtonState();

// 2) sobald includes nachgeladen wurden
window.addEventListener("fp:includes-loaded", () => {
  wireMailModeCheckbox();
  setMailButtonState();
});

// 3) wenn Attachments sich ändern
window.addEventListener("fp:attachments-changed", setMailButtonState);

function q(sel) { return document.querySelector(sel); }

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

function getEmailRecipient() {
  // <span class="email">xxx@abc.de</span>
  return (q(".email")?.textContent || "").trim();
}

function getWxValues() {
  const nr = (q('[data-field="wx_nr"]')?.value || "").trim();
  const v  = (q('[data-field="wx_void"]')?.value || "").trim();
  const i  = (q('[data-field="wx_init"]')?.value || "").trim();
  return { nr, voidv: v, init: i };
}

function buildBodyText() {
  const { nr, voidv, init } = getWxValues();
  return [
    "Moin an den Einsatz,",
    "",
    "anbei die Legs und das ORM für heute.",
    `Wetter ist gecheckt, Wx-Nr.: ${nr || "-"}, VOID: ${voidv || "-"}, Initials: ${init || "-"}.`,
    "",
    "Grüße aus Laage",
    "",
    "",
  ].join("\r\n");
}

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

  // WICHTIG: From + Date + Message-ID erhöhen Kompatibilität deutlich
  const headers = [
    `From: Flight Planning <no-reply@local>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderUTF8(subject)}`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: ${msgId}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    // “Preamble” – manche Clients mögen das
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

  // WICHTIG: Parts sauber mit CRLF trennen
  return headers + textPart + attachmentParts.join("\r\n") + "\r\n" + end;
}

export async function handleMailEOClick(mode = "auto") {
  const to = getEmailRecipient();
  if (!to) {
    alert("Kein Empfänger gefunden (Element .email fehlt/leer).");
    return;
  }

  let files = [];

  if (mode === "picker") {
    files = await pickFilesViaDialog();
    if (!files.length) return; // Nutzer hat abgebrochen
  } else {
    // default: auto
    files = await collectAttachments();
    if (!files.length) {
      alert("Keine Anhänge vorhanden. Bitte ORM speichern (und später Logs erzeugen/importieren).");
      return;
    }
  }

  const subject = "Flight Planning Package";
  const body = buildBodyText();

  const eml = await buildEml({ to, subject, body, files });

  const blob = new Blob([eml], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `EO-Mail-${new Date().toISOString().slice(0, 10)}.eml`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}