// loader-Datei für die html-Inhalte

async function loadIncludes(root = document) {
  const nodes = Array.from(root.querySelectorAll("[data-include]"));
  await Promise.all(nodes.map(async (el) => {
    const url = el.getAttribute("data-include");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Include failed: ${url} (${res.status})`);
    el.innerHTML = await res.text();
    el.removeAttribute("data-include");
  }));
}