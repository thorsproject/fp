let windGrid = null;

export function getWindGrid() {
  return windGrid;
}

export function createWindLayers() {
  return {
    windLayer: L.layerGroup(),
  };
}

async function loadWindGrid() {
  const res = await fetch("data/windgrid.json?ts=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("windgrid.json konnte nicht geladen werden");
  windGrid = await res.json();
  return windGrid;
}

// --------- Public API (wird von app.js aufgerufen) ----------
export async function drawWindBarbsViewport({ map, windLayer, selectedWindLevel }) {
  if (!windGrid) await loadWindGrid();
  if (!windGrid?.levels?.[selectedWindLevel]) return;

  windLayer.clearLayers();

  const bounds = map.getBounds();
  const baseStep = windGrid.meta.step;
  const factor = zoomToSampleStep(map.getZoom());
  const zoom = map.getZoom();

  const levelPoints = windGrid.levels[selectedWindLevel];

  let pts = levelPoints.filter(
    (p) =>
      p.lat >= bounds.getSouth() &&
      p.lat <= bounds.getNorth() &&
      p.lon >= bounds.getWest() &&
      p.lon <= bounds.getEast()
  );

  pts = pts.filter((p) => shouldKeepPoint(p, factor, baseStep));
  pts = decimateByPixelGrid(map, pts, 45);

  for (const p of pts) {
    const speedKts = p.speed * 1.944;

    const svgIcon = L.divIcon({
      className: "",
      iconSize: [60, 100],
      iconAnchor: [30, 80],
      html: createWindBarb(speedKts, p.deg, p.temp, zoom),
    });

    L.marker([p.lat, p.lon], { icon: svgIcon }).addTo(windLayer);
  }
}

// ---------------- Helpers ----------------
function zoomToSampleStep(zoom) {
  if (zoom <= 5) return 10;
  if (zoom <= 7) return 2;
  if (zoom <= 9) return 1;
  return 1;
}

function shouldKeepPoint(p, factor, baseStep) {
  const latIdx = Math.round((p.lat - windGrid.meta.south) / baseStep);
  const lonIdx = Math.round((p.lon - windGrid.meta.west) / baseStep);
  const k = Math.max(1, Math.round(factor));
  return latIdx % k === 0 && lonIdx % k === 0;
}

function decimateByPixelGrid(map, points, minPx = 45) {
  const used = new Set();
  const out = [];

  for (const p of points) {
    const pt = map.latLngToContainerPoint([p.lat, p.lon]);
    const gx = Math.floor(pt.x / minPx);
    const gy = Math.floor(pt.y / minPx);
    const key = gx + "," + gy;

    if (used.has(key)) continue;
    used.add(key);
    out.push(p);
  }

  return out;
}

function getScaleByZoom(zoom) {
  if (zoom <= 5) return 0.6;
  if (zoom <= 7) return 0.8;
  if (zoom <= 9) return 1.0;
  if (zoom <= 11) return 1.3;
  return 1.6;
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatTemp(t) {
  if (!Number.isFinite(t)) return null;

  const v = Math.round(t);
  const sign = v > 0 ? "+" : "";
  const txt = `${sign}${v}°`;

  let color = "#b9c2cc";       // neutral
  if (v > 0) color = "#49d17c"; // grün (dezent)
  if (v < 0) color = "#ff6b6b"; // rot (dezent)

  return { txt, color };
}

function createWindBarb(speedKts, deg, tempC = null, zoom = 8) {
  const scale = getScaleByZoom(zoom);

  const fullTriangles = Math.floor(speedKts / 50);
  const fullBars = Math.floor((speedKts % 50) / 10);
  const halfBars = Math.floor(((speedKts % 50) % 10) / 5);

  let parts = "";
  let y = 0;

  const spacing = 8 * scale;
  const barbLength = 20 * scale;

  const mainColor = "#222";
  const haloColor = "white";
  const strokeMain = 3 * scale;
  const strokeHalo = 6 * scale;

  function drawLine(x1, y1, x2, y2) {
    return `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${haloColor}" stroke-width="${strokeHalo}"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${mainColor}" stroke-width="${strokeMain}"/>
    `;
  }

  function drawTriangle(yPos) {
    return `
      <polygon points="0,${yPos} ${barbLength},${yPos + 10 * scale} 0,${yPos + 20 * scale}" fill="${haloColor}"/>
      <polygon points="0,${yPos} ${barbLength},${yPos + 10 * scale} 0,${yPos + 20 * scale}" fill="${mainColor}"/>
    `;
  }

  for (let i = 0; i < fullTriangles; i++) {
    parts += drawTriangle(y);
    y += (20 * scale) + spacing;
  }
  for (let i = 0; i < fullBars; i++) {
    parts += drawLine(0, y, barbLength, y);
    y += spacing;
  }
  for (let i = 0; i < halfBars; i++) {
    parts += drawLine(0, y, barbLength / 2, y);
    y += spacing;
  }

  const stemLength = y + (40 * scale);
  parts += drawLine(0, stemLength, 0, 0);

  // --- Temp text: clean (no box) ---
  const t = formatTemp(tempC);
  const tx = 22;
  const ty = -6;

  const tempSvg = t
    ? `
      <text x="${tx}" y="${ty}"
            font-size="${11 * scale}"
            font-weight="700"
            fill="${t.color}"
            text-anchor="start"
            style="paint-order: stroke; stroke: rgba(0,0,0,0.55); stroke-width: ${2.2 * scale}px;">
        ${escapeXml(t.txt)}
      </text>
    `
    : "";

  const size = 120 * scale;

  return `
    <svg width="${size}" height="${size}" viewBox="-55 -30 110 180">
      ${tempSvg}
      <g transform="rotate(${deg},0,${stemLength})">
        ${parts}
      </g>
    </svg>
  `;
}
