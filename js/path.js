// js/path.js
// Zentrale URL-Helper für GitHub Pages und lokale Nutzung

/**
 * Baut eine absolute URL relativ zur App-Root (document.baseURI)
 * funktioniert lokal und auf GitHub Pages (/fp/)
 *
 * @example
 * url("data/ORMBlatt.pdf")
 * -> http://localhost:5500/data/ORMBlatt.pdf
 * -> https://thorsproject.github.io/fp/data/ORMBlatt.pdf
 */
export function url(relPath) {
  return new URL(relPath, document.baseURI).toString();
}

/**
 * Baut viewer.html URL mit PDF.js file parameter
 *
 * @example
 * viewerUrl("data/ORMBlatt.pdf")
 */
export function viewerUrl(pdfPath, { page = 1, zoom = "page-width" } = {}) {
  const viewer = new URL("pdfjs/web/viewer.html", document.baseURI);
  viewer.searchParams.set("file", url(pdfPath));

  // PDF.js nutzt Hash-Parameter für page/zoom
  viewer.hash = `page=${page}&zoom=${encodeURIComponent(zoom)}`;
  return viewer.toString();
}
