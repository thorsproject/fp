// ------------------ vertical Profile ------------------
import { loadWindGrid, getWindGrid } from "./wind.js";

function nearestPoint(points, lat, lon) {
  let best = null;
  let bestD = Infinity;
  for (const p of points) {
    const dLat = p.lat - lat;
    const dLon = p.lon - lon;
    const d = dLat * dLat + dLon * dLon;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function fmtKts(ms) {
  return `${Math.round(ms * 1.944)} kt`;
}

function fmtDeg(deg) {
  const d = ((deg % 360) + 360) % 360;
  return `${Math.round(d)}°`;
}

function fmtTempPlain(t) {
  if (!Number.isFinite(t)) return "-";
  const val = Math.round(t);
  const sign = val > 0 ? "+" : "";
  return `${sign}${val}°`;
}

export async function showVerticalProfilePopup(map, latlng) {
  if (!getWindGrid()) await loadWindGrid();
  const windGrid = getWindGrid();
  if (!windGrid?.levels) return;

  const levelsOrder = ["SFC", "25", "50", "100", "180"];

  const rows = levelsOrder.map((lvl) => {
    const pts = windGrid.levels[lvl] || [];
    if (!pts.length) return { lvl, ok: false };

    const p = nearestPoint(pts, latlng.lat, latlng.lng);
    if (!p) return { lvl, ok: false };

    return {
      lvl,
      ok: true,
      dir: fmtDeg(p.deg),
      spd: fmtKts(p.speed),
      tmp: fmtTempPlain(p.temp),
    };
  });

  const header = `<b>Vertical Wind Profile</b><br>
                  <span style="color:#8fa6bf;">${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)}</span>`;

  const table = `
    <table style="margin-top:6px;border-collapse:collapse;">
      <tr>
        <th style="text-align:left;padding:2px 8px 2px 0;">Level</th>
        <th style="text-align:left;padding:2px 8px 2px 0;">Dir</th>
        <th style="text-align:left;padding:2px 8px 2px 0;">Speed</th>
        <th style="text-align:left;padding:2px 0;">Temp</th>
      </tr>
      ${rows
        .map(
          (r) => `
        <tr>
          <td style="padding:2px 8px 2px 0;">${r.lvl}</td>
          <td style="padding:2px 8px 2px 0;">${r.ok ? r.dir : "-"}</td>
          <td style="padding:2px 8px 2px 0;">${r.ok ? r.spd : "-"}</td>
          <td style="padding:2px 0;">${r.ok ? r.tmp : "-"}</td>
        </tr>
      `
        )
        .join("")}
    </table>
  `;

  L.popup({ maxWidth: 320 }).setLatLng(latlng).setContent(`${header}${table}`).openOn(map);
}