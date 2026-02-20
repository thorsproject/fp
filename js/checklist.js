export function initChecklistUI() {
  const toast = document.getElementById("checkToast");

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("is-hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("is-hidden"), 2200);
  }

  // ToggleButtons
  document.addEventListener("click", (e) => {
    const tb = e.target.closest(".tb");
    if (!tb) return;

    const checked = tb.classList.toggle("is-checked");
    tb.textContent = checked ? "CHECK" : "UNCHECK";
  });

  // Phone Buttons -> Toast Hinweis
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".phone-btn");
    if (!b) return;

    const label = b.dataset.phoneLabel || b.textContent.trim();
    const phone = b.dataset.phone || "";
    if (!phone) return;

    showToast(`${label}: ${phone}`);
  });
}