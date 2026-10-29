/**
 * Profil Saya (Figma 11795:67114), opened from "Profil" on the account page.
 * Shows the logged-in reader; the ⋮ menu holds Logout, which signs out and,
 * for a KOMPAS.com+ member, also ends the demo subscription so the site goes
 * back to the non-member view.
 */
import "../styles/tokens/kds-tokens.css";
import "../styles/pages/profile.css";
import { readSession, clearSession, initials } from "./utils/session.js";
import { mockBackend, announceEntitlementChange } from "./utils/entitlement.js";

const READING_PREF_KEY = "kompas-reading-mode";
const READING_PENDING_KEY = "kompas-reading-mode-pending";
const $ = (sel) => document.querySelector(sel);

const session = readSession();
if (!session) window.location.replace("./account.html");
else {
  $("[data-pf-initials]").textContent = initials(session.name);
  $("[data-pf-name]").textContent = session.name;
  $("[data-pf-email]").textContent = session.id;
}

/* ---------- ⋮ menu ---------- */
const more = $("[data-pf-more]");
const menu = $("[data-pf-menu]");
function setMenu(open) {
  menu.hidden = !open;
  more.setAttribute("aria-expanded", String(open));
  if (open) menu.querySelector("[role=menuitem]").focus();
}
more.addEventListener("click", (event) => {
  event.stopPropagation();
  setMenu(menu.hidden);
});
document.addEventListener("click", (event) => {
  if (!menu.hidden && !menu.contains(event.target)) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menu.hidden) {
    setMenu(false);
    more.focus();
  }
});

// not part of the prototype yet
document.querySelectorAll("[data-pf-soon]").forEach((a) =>
  a.addEventListener("click", (event) => {
    event.preventDefault();
    setMenu(false);
  }),
);

/* ---------- Logout ---------- */
$("[data-pf-logout]").addEventListener("click", () => {
  if (session) mockBackend.reset(session.id); // a member goes back to non-member
  try {
    const pref = JSON.parse(localStorage.getItem(READING_PREF_KEY));
    if (pref) localStorage.setItem(READING_PREF_KEY, JSON.stringify({ ...pref, on: false }));
    sessionStorage.removeItem(READING_PENDING_KEY);
  } catch {
    /* ignore */
  }
  clearSession();
  announceEntitlementChange(); // other open tabs follow
  window.location.replace("./account.html");
});
