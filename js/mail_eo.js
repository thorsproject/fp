// js/mail_eo.js
import { checklistSetToggle } from "./checklist.js";

// Hilfsfunktionen
function q(sel) { return document.querySelector(sel); }

function getEmailRecipient() {
  // aus deiner checklist.html: <span class="email">xxx@abc.de</span>
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
  return (name || "attachment")
    .replace(/[\/\\?%*:|"<>]/g, "_")
    .trim();
}

// Baut eine RFC822 .eml mit Attachments (MIME multipart/mixed)
async function buildEml({ to, subject, body, files }) {
  const boundary = "----=_fp_" + Math.random().toString(16).slice(2);

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
  ].join("\r\n");

  const textPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
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

  const end = `--${boundary}--\r\n`;

  return headers + textPart + attachmentParts.join("") + end;
}

// öffnet Dateiauswahl + erzeugt .eml Download
export async function handleMailEOClick({ autoCheck = false } = {}) {
  const to = getEmailRecipient();
  if (!to) {
    alert("Kein Empfänger gefunden (.email).");
    return;
  }

  // OS-Dialog: Dateien auswählen
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ".pdf,.json,.txt,.png,.jpg,.jpeg"; // optional, anpassen
  input.style.display = "none";
  document.body.appendChild(input);

  const pickFiles = () => new Promise((resolve) => {
    input.onchange = () => resolve(Array.from(input.files || []));
    input.click();
  });

  const files = await pickFiles();
  input.remove();

  if (!files.length) return; // abgebrochen

  const subject = "Flight Planning Package";
  const body = buildBodyText();

  // .eml bauen + downloaden
  const eml = await buildEml({ to, subject, body, files });
  const blob = new Blob([eml], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `EO-Mail-${new Date().toISOString().slice(0,10)}.eml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  // CHECK setzen: entweder sofort (praktisch) oder du machst es erst nach "Mail gesendet"-Klick
  if (autoCheck) {
    checklistSetToggle("eo", true);
  } else {
    // Optional: Toast/Hint in UI – hier nur minimal:
    // alert("E-Mail-Datei (.eml) wurde erstellt. Öffnen, senden, danach 'Mail gesendet' abhaken.");
  }
}