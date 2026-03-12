const WX_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten
const WX_STORAGE_MAX_AGE = 12 * 60 * 60 * 1000; // 12 Stunden
const WX_BASE = "https://fp-weather-proxy.thors-project.workers.dev";

const wxCache = new Map();

function cacheKey(type, icao) {
  return `${type}:${icao.toUpperCase()}`;
}

function getStorageKey(type, icao) {
  return `fp.wx.${type}.${icao}`;
}

function readStoredWx(type, icao) {
  try {
    const raw = localStorage.getItem(getStorageKey(type, icao));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.ts !== "number") return null;

    const age = Date.now() - parsed.ts;
    if (age > WX_STORAGE_MAX_AGE) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredWx(type, icao, data) {
  try {
    localStorage.setItem(
      getStorageKey(type, icao),
      JSON.stringify({
        ts: Date.now(),
        data,
      })
    );
  } catch {
    // ignore storage errors
  }
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

function getFreshCachedPromise(key, now) {
  const cached = wxCache.get(key);
  if (!cached) return null;
  if (now - cached.ts >= WX_CACHE_TTL) return null;
  return cached.promise;
}

function makeWxPromise(type, id, key, now) {
  const cachedPromise = getFreshCachedPromise(key, now);
  if (cachedPromise) return cachedPromise;

  const promise = fetchJson(`${WX_BASE}/wx/${type}?ids=${encodeURIComponent(id)}`)
    .then((data) => {
      writeStoredWx(type, id, data);
      return data;
    })
    .catch((err) => {
      const stored = readStoredWx(type, id);
      if (stored?.data) return stored.data;

      // kein gültiger Fallback vorhanden -> kaputten Cache-Eintrag entfernen
      wxCache.delete(key);
      throw err;
    });

  wxCache.set(key, {
    ts: now,
    promise,
  });

  return promise;
}

export async function loadAirportWx(icao) {
  const id = String(icao || "").trim().toUpperCase();
  if (!id) throw new Error("ICAO fehlt");

  const now = Date.now();

  const metarKey = cacheKey("metar", id);
  const tafKey = cacheKey("taf", id);

  const metarPromise = makeWxPromise("metar", id, metarKey, now);
  const tafPromise = makeWxPromise("taf", id, tafKey, now);

  const [metarData, tafData] = await Promise.allSettled([metarPromise, tafPromise]);

  return {
    icao: id,
    metar: metarData.status === "fulfilled" ? normalizeFirst(metarData.value) : null,
    taf: tafData.status === "fulfilled" ? normalizeFirst(tafData.value) : null,
    metarError:
      metarData.status === "rejected"
        ? metarData.reason?.message || "METAR Fehler"
        : "",
    tafError:
      tafData.status === "rejected"
        ? tafData.reason?.message || "TAF Fehler"
        : "",
  };
}

// export async function loadAirportWx(icao) {
//  const id = String(icao || "").trim().toUpperCase();
//  if (!id) throw new Error("ICAO fehlt");

//  const metarKey = cacheKey("metar", id);
//  const tafKey = cacheKey("taf", id);

//  const metarPromise = wxCache.get(metarKey) ||
//    fetchJson(`${WX_BASE}/wx/metar?ids=${encodeURIComponent(id)}`)
//      .then(data => {
//        wxCache.set(metarKey, Promise.resolve(data));
//        return data;
//      });

//  wxCache.set(metarKey, metarPromise);

//  const tafPromise = wxCache.get(tafKey) ||
//    fetchJson(`${WX_BASE}/wx/taf?ids=${encodeURIComponent(id)}`)
//      .then(data => {
//        wxCache.set(tafKey, Promise.resolve(data));
//        return data;
//      });

//  wxCache.set(tafKey, tafPromise);

//  const [metarData, tafData] = await Promise.allSettled([metarPromise, tafPromise]);

//  return {
//    icao: id,
//    metar: metarData.status === "fulfilled" ? normalizeFirst(metarData.value) : null,
//    taf: tafData.status === "fulfilled" ? normalizeFirst(tafData.value) : null,
//    metarError: metarData.status === "rejected" ? metarData.reason?.message || "METAR Fehler" : "",
//    tafError: tafData.status === "rejected" ? tafData.reason?.message || "TAF Fehler" : ""
//  };
//}

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

function getWxBadge(rawMetar, fltCat) {
  if (fltCat) {
    return {
      label: fltCat,
      className: `wx-cat-${String(fltCat).toLowerCase()}`,
    };
  }

  const raw = String(rawMetar || "").toUpperCase();

  if (/\bBLU\+?\b/.test(raw)) {
    return { label: "VFR", className: "wx-cat-vfr" };
  }

  if (/\b(WHT|GRN)\b/.test(raw)) {
    return { label: "MVFR", className: "wx-cat-mvfr" };
  }

  if (/\b(YLO1|YLO2)\b/.test(raw)) {
    return { label: "IFR", className: "wx-cat-ifr" };
  }

  if (/\b(AMB|RED)\b/.test(raw)) {
    return { label: "LIFR", className: "wx-cat-lifr" };
  }

  return null;
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

  const badge = getWxBadge(
    wx?.metar?.rawOb || wx?.metar?.raw_text,
    wx?.metar?.fltCat
  );

  return `
    <div class="wx-popup">

      <div class="wx-popup__header">
        <div class="wx-popup__title">${escapeHtml(wx.icao)}</div>
        ${badge ? `<div class="wx-cat ${badge.className}">${badge.label}</div>` : ""}
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