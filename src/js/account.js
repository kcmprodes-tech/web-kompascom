/**
 * Account page: switches between the four states (guest / free / member1 /
 * memberN), the light/dark theme toggle ("Mode tampilan"), the expandable
 * multi-package card, and the close button.
 *
 * State is chosen with ?state=guest|free|member1|memberN (default guest);
 * theme with ?theme=dark|light, otherwise the saved/system preference.
 */
import "../styles/common.css";
import "../styles/pages/account.css";

const body = document.body;
const params = new URLSearchParams(window.location.search);

/* ---------- State ---------- */
const STATES = ["guest", "free", "member1", "memberN"];
const state = STATES.includes(params.get("state")) ? params.get("state") : "guest";
body.dataset.state = state;

const CARD_VALUES = {
  guest: { poin: "Lihat Poin", voucher: "Lihat voucher", reward: "Lihat reward" },
  free: { poin: "0 Poin", voucher: "0", reward: "Lihat reward" },
  member1: { poin: "242 Poin", voucher: "2 Voucher", reward: "Lihat reward" },
  memberN: { poin: "242 Poin", voucher: "2 Voucher", reward: "Lihat reward" },
};

const MEMBER_CARD = {
  member1: { title: "KOMPAS.com+ MAX Tahunan", sub: "Diperpanjang pada 12 Juni 2024" },
  memberN: { title: "KOMPAS.com+ MAX Tahunan", sub: "Diperpanjang pada 27 Oktober 2026" },
};

const values = CARD_VALUES[state];
for (const [key, text] of Object.entries(values)) {
  const el = document.querySelector(`[data-card="${key}"]`);
  if (el) el.textContent = text;
}

const member = MEMBER_CARD[state];
if (member) {
  const title = document.querySelector("[data-member-title]");
  const sub = document.querySelector("[data-member-sub]");
  if (title) title.textContent = member.title;
  if (sub) sub.textContent = member.sub;
}

/* ---------- Expandable multi-package card ---------- */
const memberCard = document.querySelector(".ac-member");
if (memberCard && state === "memberN") {
  memberCard.dataset.expanded = "true";
  const toggleLabel = memberCard.querySelector("[data-toggle-label]");
  const toggleChev = memberCard.querySelector(".ac-member__toggle-chev");

  const setExpanded = (open) => {
    memberCard.dataset.expanded = open ? "true" : "false";
    if (toggleLabel) toggleLabel.textContent = open ? "Tutup" : "Lihat paket";
    if (toggleChev) toggleChev.style.transform = open ? "" : "rotate(180deg)";
  };

  memberCard.querySelector(".ac-member__summary")?.addEventListener("click", () => {
    setExpanded(memberCard.dataset.expanded !== "true");
  });
  memberCard.querySelector(".ac-member__toggle")?.addEventListener("click", () => setExpanded(false));
}

/* ---------- Theme (Mode tampilan) ---------- */
const THEME_KEY = "kompas-account-theme";
const modeLabel = document.querySelector("[data-mode-label]");

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme) {
  body.dataset.theme = theme;
  if (modeLabel) modeLabel.textContent = theme === "dark" ? "Gelap" : "Terang";
}

let saved;
try {
  saved = localStorage.getItem(THEME_KEY);
} catch {
  saved = null;
}
const initialTheme = params.get("theme") || saved || (systemPrefersDark() ? "dark" : "light");
applyTheme(initialTheme === "dark" ? "dark" : "light");

document.querySelector("[data-mode-toggle]")?.addEventListener("click", () => {
  const next = body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }
});

/* ---------- Close: go back to the previous page ---------- */
document.querySelector(".ac-close")?.addEventListener("click", (event) => {
  event.preventDefault();
  const cameFromApp = document.referrer && new URL(document.referrer).origin === window.location.origin;
  if (cameFromApp || window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "./index.html";
  }
});
