// js/mail_eo.js
// Erstellt eine .eml (RFC822) inkl. Attachments -> Nutzer öffnet sie im Mailprogramm und sendet selbst.

function q(sel) { return document.querySelector(sel); }

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
    `Subject: ${subject}`,
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

// Klick-Handler (ohne Auto-CHECK)
export async function handleMailEOClick() {
  const to = getEmailRecipient();
  if (!to) {
    alert("Kein Empfänger gefunden (Element .email fehlt/leer).");
    return;
  }

  // OS-Dateiauswahl (Mac/Windows)
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

  if (!files.length) return; // abgebrochen

  const subject = "Flight Planning Package";
  const body = buildBodyText();
  // Debug.Option
  console.log("BODY STRING:");
  console.log(body);
  // Ende Debug.Option
  const eml = await buildEml({ to, subject, body, files });

  // Debug.Option
  console.log("EML preview:");
  console.log(eml.substring(0, 1000)); // nur Anfang anzeigen
  // Debug.Option Ende

  const blob = new Blob([eml], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `EO-Mail-${new Date().toISOString().slice(0, 10)}.eml`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  // Hinweis (optional)
  // alert("EO-Mail (.eml) erstellt. Öffnen, senden, danach in der Checklist abhaken.");
}