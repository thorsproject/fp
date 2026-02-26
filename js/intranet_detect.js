// js/intranet_detect.js
export async function isInCompanyNetwork({ url, timeoutMs = 1600 } = {}) {
  if (!url) return false;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // no-cors: wir brauchen nur "kommt überhaupt eine Verbindung zustande?"
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}