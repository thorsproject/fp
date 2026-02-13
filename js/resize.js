// js/resize.js
export function installMapAutoResize(map, mapContainerId = "map") {
  const el = document.getElementById(mapContainerId);
  if (!el) {
    console.warn(`[resize] Container #${mapContainerId} nicht gefunden`);
    return () => {};
  }

  // 1) Window resize / orientation
  const onWinResize = () => map.invalidateSize();
  window.addEventListener("resize", onWinResize, { passive: true });
  window.addEventListener("orientationchange", onWinResize, { passive: true });

  // 2) Container resize (Sidebar, Tabs, CSS changes, etc.)
  let ro = null;
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
  }

  // 3) Falls Page aus Background zurückkommt (iOS etc.)
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      setTimeout(() => map.invalidateSize(), 50);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  // 4) Initial (nach Layout)
  setTimeout(() => map.invalidateSize(), 100);

  // Cleanup-Funktion (falls du später mal SPA/Unmount hast)
  return () => {
    window.removeEventListener("resize", onWinResize);
    window.removeEventListener("orientationchange", onWinResize);
    document.removeEventListener("visibilitychange", onVisibility);
    if (ro) ro.disconnect();
  };
}