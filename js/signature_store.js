// js/signature_ui.js
import { qs, SEL, setText } from "./ui/index.js";
import { getSignatureDataUrl, setSignatureDataUrl, clearSignatureDataUrl } from "./signature_store.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// super simples Draw-Modal
function openDrawModal() {
  const wrap = document.createElement("div");
  wrap.className = "sig-modal";

  wrap.innerHTML = `
    <div class="sig-modal__card">
      <div class="sig-modal__head">
        <div class="sig-modal__title">Unterschrift zeichnen</div>
        <button type="button" class="c-btn c-btn--ghost sig-close">Schließen</button>
      </div>
      <canvas class="sig-canvas" width="900" height="300"></canvas>
      <div class="sig-modal__foot">
        <button type="button" class="c-btn c-btn--ghost sig-clear">Clear</button>
        <button type="button" class="c-btn sig-save">Übernehmen</button>
      </div>
      <div class="u-text-muted" style="margin-top:8px;">
        Tipp: Auf Tablet/Touch geht das am besten.
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  const canvas = wrap.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // weiße Fläche
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let drawing = false;

  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    const isTouch = e.touches && e.touches[0];
    const x = (isTouch ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (isTouch ? e.touches[0].clientY : e.clientY) - r.top;
    // auf Canvas-Space mappen
    return {
      x: (x / r.width) * canvas.width,
      y: (y / r.height) * canvas.height,
    };
  };

  const down = (e) => {
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault?.();
  };
  const move = (e) => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    e.preventDefault?.();
  };
  const up = () => (drawing = false);

  canvas.addEventListener("mousedown", down);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);

  canvas.addEventListener("touchstart", down, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", up);

  const close = () => wrap.remove();

  wrap.querySelector(".sig-close").addEventListener("click", close);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });

  wrap.querySelector(".sig-clear").addEventListener("click", () => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  return new Promise((resolve) => {
    wrap.querySelector(".sig-save").addEventListener("click", () => {
      const dataUrl = canvas.toDataURL("image/png");
      close();
      resolve(dataUrl);
    });
  });
}

function refreshSignatureUI() {
  const preview = qs(SEL.settings.sigPreview);
  const status = qs(SEL.settings.sigStatus);

  const dataUrl = getSignatureDataUrl();

  if (preview) {
    if (dataUrl) {
      preview.src = dataUrl;
      preview.style.display = "block";
    } else {
      preview.removeAttribute("src");
      preview.style.display = "none";
    }
  }

  if (status) {
    setText(SEL.settings.sigStatus, dataUrl ? "Unterschrift gespeichert (nur auf diesem Gerät/Browser)." : "Keine Unterschrift gespeichert.");
  }
}

export function initSignatureUI() {
  const upload = qs(SEL.settings.sigUpload);
  const btnDraw = qs(SEL.settings.sigDraw);
  const btnClear = qs(SEL.settings.sigClear);

  if (!upload || !btnDraw || !btnClear) return;

  upload.addEventListener("change", async () => {
    const f = upload.files?.[0];
    upload.value = "";
    if (!f) return;
    const dataUrl = await readFileAsDataUrl(f);
    setSignatureDataUrl(dataUrl);
    refreshSignatureUI();
  });

  btnDraw.addEventListener("click", async () => {
    const dataUrl = await openDrawModal();
    setSignatureDataUrl(dataUrl);
    refreshSignatureUI();
  });

  btnClear.addEventListener("click", () => {
    clearSignatureDataUrl();
    refreshSignatureUI();
  });

  refreshSignatureUI();
}