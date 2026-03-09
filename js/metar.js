const WX_BASE = "https://fp-weather-proxy.thors-project.workers.dev";

const wxCache = new Map();

function cacheKey(type, icao) {
  return `${type}:${icao.toUpperCase()}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();

  // Leerer Body = kein aktueller Datensatz
  if (!text || !text.trim()) {
    return [];
  }

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export async function loadAirportWx(icao) {
  const id = String(icao || "").trim().toUpperCase();
  if (!id) throw new Error("ICAO fehlt");

  const metarKey = cacheKey("metar", id);
  const tafKey = cacheKey("taf", id);

  const metarPromise = wxCache.get(metarKey) ||
    fetchJson(`${WX_BASE}/wx/metar?ids=${encodeURIComponent(id)}`)
      .then(data => {
        wxCache.set(metarKey, Promise.resolve(data));
        return data;
      });

  wxCache.set(metarKey, metarPromise);

  const tafPromise = wxCache.get(tafKey) ||
    fetchJson(`${WX_BASE}/wx/taf?ids=${encodeURIComponent(id)}`)
      .then(data => {
        wxCache.set(tafKey, Promise.resolve(data));
        return data;
      });

  wxCache.set(tafKey, tafPromise);

  const [metarData, tafData] = await Promise.allSettled([metarPromise, tafPromise]);

  return {
    icao: id,
    metar: metarData.status === "fulfilled" ? normalizeFirst(metarData.value) : null,
    taf: tafData.status === "fulfilled" ? normalizeFirst(tafData.value) : null,
    metarError: metarData.status === "rejected" ? metarData.reason?.message || "METAR Fehler" : "",
    tafError: tafData.status === "rejected" ? tafData.reason?.message || "TAF Fehler" : ""
  };
}

function normalizeFirst(data) {
  if (Array.isArray(data)) return data[0] || null;
  if (data && Array.isArray(data.data)) return data.data[0] || null;
  return null;
}

function formatTaf(raw) {
  if (!raw) return raw;

  return raw
    // neue Zeile vor BECMG
    .replace(/\s(BECMG)/g, "\n$1")

    // neue Zeile vor FMxxxxxx
    .replace(/\s(FM\d{6})/g, "\n$1")

    // TEMPO umbrechen außer bei PROB30/PROB40
    .replace(/\s(TEMPO)/g, (m, p1, offset, str) => {
      const prev = str.slice(Math.max(0, offset - 12), offset);

      if (/PROB(30|40)\s*$/.test(prev)) {
        return " " + p1;
      }

      return "\n" + p1;
    });
}

export function buildWxPopupHtml(wx) {
  const metarRaw = escapeHtml(
    wx?.metar?.rawOb ||
    wx?.metar?.raw_text ||
    (wx?.metarError ? `Fehler: ${wx.metarError}` : "Kein METAR verfügbar")
  );

  const tafRaw = escapeHtml(
    formatTaf(
    wx?.taf?.rawTAF ||
    wx?.taf?.raw_text ||
    (wx?.tafError ? `Fehler: ${wx.tafError}` : "Kein TAF verfügbar")
    )
  );

  const fltCat = wx?.metar?.fltCat || "";
  const fltClass = fltCat ? `wx-cat-${fltCat.toLowerCase()}` : "";

  return `
    <div class="wx-popup">

      <div class="wx-popup__header">
        <div class="wx-popup__title">${escapeHtml(wx.icao)}</div>
        ${fltCat ? `<div class="wx-cat ${fltClass}">${fltCat}</div>` : ""}
      </div>

      <div class="wx-popup__section">
        <div class="wx-popup__label">METAR</div>
        <pre class="wx-popup__raw">${metarRaw}</pre>
      </div>

      <div class="wx-popup__section">
        <div class="wx-popup__label">TAF</div>
        <pre class="wx-popup__raw">${tafRaw}</pre>
      </div>

    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}