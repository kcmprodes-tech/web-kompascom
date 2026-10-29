/**
 * Home page entry (new design, rebuilt from Figma). Sections are added
 * top-down; interactive behaviour (carousels, etc.) is wired here as built.
 */
import "../styles/components/site-header.css";
import "../styles/pages/home.css";
import { initHeaderAvatar, initMemberView } from "./site-header.js";
import { refreshTimes } from "./utils/time.js";

/* ---------- "Pilih topik" interest picker ---------- */
function initMinat() {
  const root = document.querySelector("[data-minat]");
  if (!root) return;

  const chipsBox = root.querySelector("[data-minat-chips]");
  const inner = chipsBox.firstElementChild;
  const toggle = root.querySelector("[data-minat-toggle]");
  const toggleLabel = toggle.querySelector("span");
  const save = root.querySelector("[data-minat-save]");
  const collapsedHeight = chipsBox.offsetHeight;

  root.addEventListener("click", (event) => {
    const chip = event.target.closest(".minat-chip");
    if (!chip) return;
    chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    save.disabled = !root.querySelector('.minat-chip[aria-pressed="true"]');
  });

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggleLabel.textContent = open ? "Sembunyikan" : "Tampilkan semua";
    chipsBox.style.height = `${open ? inner.offsetHeight : collapsedHeight}px`;
  });

  save.addEventListener("click", () => {
    save.textContent = "Tersimpan";
    save.disabled = true;
  });
}

initHeaderAvatar();
initMemberView();
refreshTimes(); // article times are snapshot-relative in the HTML
initMinat();
