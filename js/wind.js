// js/wind.js
// ------------------ WIND ------------------

let windGrid = null;

export function createWindLayers() {
  return {
    windLayer: L.layerGroup(),
    cloudLayer: L.layerGroup(),
    rainLayer: L.layerGroup(),
  };
}

export async function loadWindGrid() {
  if (windGrid) return windGrid;

  const res = await fetch("data/windgrid.json?ts=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("windgrid.json konnte nicht geladen werden");

  windGrid = await res.json();
  return windGrid;
}

export function getWindGrid() {
  return windGrid;
}

export async function drawWindBarbsViewport({ map, windLayer, selectedWindLevel }) {
  if (!windGrid) await loadWindGrid();
  if (!windGrid?.levels?.[selectedWindLevel]) return;

  windLayer.clearLayers();

  const bounds = map.getBounds();
  const baseStep = windGrid.meta.step;
  const factor = zoomToSampleStep(map.getZoom());
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

  const zoom = map.getZoom();

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

// ---------- Helpers ----------

function scaleByZoom(zoom) {
  if (zoom <= 5) return 0.6;
  if (zoom <= 7) return 0.8;
  if (zoom <= 9) return 1.0;
  if (zoom <= 11) return 1.3;
  return 1.6;
}

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

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// Aviation-style temp: nur Zahl, kein °, kein +
function formatTempAviation(t) {
  if (!Number.isFinite(t)) return null;
  const v = Math.round(t);
  return { txt: String(v), color: "#222" };
}

function createWindBarb(speedKts, deg, tempC, zoom) {
  const scale = scaleByZoom(zoom);

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

  // 50 kt
  for (let i = 0; i < fullTriangles; i++) {
    parts += drawTriangle(y);
    y += 20 * scale + spacing;
  }
  // 10 kt
  for (let i = 0; i < fullBars; i++) {
    parts += drawLine(0, y, barbLength, y);
    y += spacing;
  }
  // 5 kt
  for (let i = 0; i < halfBars; i++) {
    parts += drawLine(0, y, barbLength / 2, y);
    y += spacing;
  }

  const stemLength = y + 40 * scale;
  parts += drawLine(0, stemLength, 0, 0);

  // Temperatur: an der Spitze (y ~ 0), gegenüber der Barbs (Barbs nach rechts → Temp links)
  const t = formatTempAviation(tempC);

    // Pfeilspitze setzen
  const tx = 2 * scale;         // horizontal links von der Spitze
  const ty = 2 * scale;          // leicht unter Spitze
  const fontSize = 30 * scale; // deutlich größer

  const tempSvg = t
     ? `
      <text x="${tx}" y="${ty}"
            font-size="${fontSize}"
            font-weight="600"
            fill="${t.color}"
            text-anchor="end"
            dominant-baseline="middle">
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