// js/signature_stamp.js
import { PDFDocument } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

// Felder aus Acrobat:
export const ORM_SIG_FIELDS = {
  signature: "PIC_Signature",
  initials: "PIC_Initials",
};

function normalizePdfBytes(pdf) {
  // akzeptiert ArrayBuffer, TypedArrays, cross-realm ArrayBuffer
  // und gibt garantiert ein "parent-realm" Uint8Array zurück.
  if (typeof pdf === "string") return pdf;

  // TypedArray/DataView
  if (ArrayBuffer.isView(pdf)) {
    const u8 = new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
    return new Uint8Array(u8); // copy into this realm
  }

  // ArrayBuffer (auch cross-realm): hat byteLength + slice
  if (pdf && typeof pdf === "object" && typeof pdf.byteLength === "number") {
    const u8 = new Uint8Array(pdf);      // creates view in this realm
    return new Uint8Array(u8);           // copy into this realm
  }

  throw new Error(`stampSignatureIntoPdf: unsupported pdf type (${typeof pdf})`);
}

function toU8(bytes) {
  if (typeof bytes === "string") return bytes;
  if (ArrayBuffer.isView(bytes)) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes && typeof bytes === "object" && typeof bytes.byteLength === "number") return new Uint8Array(bytes);
  throw new Error("toU8: unsupported bytes");
}

function copyU8(bytes) {
  const u8 = toU8(bytes);
  return new Uint8Array(u8); // copy into this realm
}

function dataUrlToBytes(dataUrl) {
  const [meta, b64] = String(dataUrl).split(",");
  if (!meta?.startsWith("data:image/") || !b64) throw new Error("Bad dataUrl");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function getImageType(dataUrl) {
  const m = String(dataUrl).match(/^data:image\/(png|jpeg|jpg);/i);
  const t = (m?.[1] || "").toLowerCase();
  if (t === "jpg") return "jpeg";
  if (t === "png" || t === "jpeg") return t;
  return null;
}

function getWidgetRect(widget) {
  // pdf-lib: widget.acroField.dict / widget.dict etc. kann variieren
  // Robust: try common paths
  const dict =
    widget?.dict ||
    widget?.acroField?.dict ||
    widget?.acroField?.acroField?.dict ||
    null;

  const rect = dict?.lookup?.("Rect");
  if (!rect) return null;

  // Rect ist [x1 y1 x2 y2]
  const x1 = rect.get(0)?.numberValue?.() ?? rect.get(0);
  const y1 = rect.get(1)?.numberValue?.() ?? rect.get(1);
  const x2 = rect.get(2)?.numberValue?.() ?? rect.get(2);
  const y2 = rect.get(3)?.numberValue?.() ?? rect.get(3);

  const left = Number(x1), bottom = Number(y1), right = Number(x2), top = Number(y2);
  if (![left, bottom, right, top].every((n) => Number.isFinite(n))) return null;

  return {
    x: Math.min(left, right),
    y: Math.min(bottom, top),
    w: Math.abs(right - left),
    h: Math.abs(top - bottom),
  };
}

function drawImageContain(page, img, rect, padding = 2) {
  const boxW = Math.max(0, rect.w - padding * 2);
  const boxH = Math.max(0, rect.h - padding * 2);

  const iw = img.width;
  const ih = img.height;

  const scale = Math.min(boxW / iw, boxH / ih);
  const w = iw * scale;
  const h = ih * scale;

  const x = rect.x + (rect.w - w) / 2;
  const y = rect.y + (rect.h - h) / 2;

  page.drawImage(img, { x, y, width: w, height: h });
}

export async function stampSignatureIntoPdf(pdfBytes, signatureDataUrl, fields = ORM_SIG_FIELDS) {
  if (!signatureDataUrl) return pdfBytes;

  const normalized = copyU8(pdfBytes);
  const pdfDoc = await PDFDocument.load(normalized);
  const form = pdfDoc.getForm();
  console.log("[SIG] fields in pdf:", form.getFields().map(f => f.getName()));
  const imgType = getImageType(signatureDataUrl);
  if (!imgType) throw new Error("Unsupported signature image type (use PNG or JPEG).");

  const imgBytes = dataUrlToBytes(signatureDataUrl);
  const img = imgType === "png"
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);

  // Wir stempeln in beide Felder (wenn vorhanden)
  const targets = [fields.signature, fields.initials];

  for (const name of targets) {
    let field;
    try {
      field = form.getField(name);
    } catch {
      // Feld nicht vorhanden -> skip
      continue;
    }

    // Widgets (= Darstellung) finden
    const widgets = field?.acroField?.getWidgets?.() ?? [];
    if (!widgets.length) {
    console.warn("[SIG] field has no widgets:", name);
    continue;
    }
    console.log("[SIG] stamping fields", targets);
    for (const widget of widgets) {
    // pdf-lib Widget API
    let rect, page;
    try {
        rect = widget.getRectangle(); // { x, y, width, height }
        page = widget.getPage();      // PDFPage
    } catch (e) {
        console.warn("[SIG] widget getRectangle/getPage failed:", name, e);
        continue;
    }

    if (!rect || !page) continue;

    // Debug: sehen wir überhaupt was?
    console.log("[SIG] stamp", name, {
        x: rect.x, y: rect.y, w: rect.width, h: rect.height,
    });

    // in unser Format bringen
    const r = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };

    // Zeichnen
    drawImageContain(page, img, r, 2);
    }
  }

  // Speichern
  const out = await pdfDoc.save({ useObjectStreams: false }); // konservativer für manche Viewer
  return out;
}