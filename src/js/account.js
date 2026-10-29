/**
 * Account page: switches between the four states (guest / free / member1 /
 * memberN), the light/dark theme toggle ("Mode tampilan"), the expandable
 * multi-package card, the close button, and the login bottom sheet that gates
 * Login / Poin / Voucher / Reward / Aktivitas / Transaksi for guests.
 *
 * State is chosen with ?state=guest|free|member1|memberN; without it the page
 * is "free" when a login session is saved, otherwise "guest" (?state=guest also
 * clears the saved session). Theme with ?theme=dark|light, otherwise the
 * saved/system preference.
 */
import "../styles/common.css";
import "../styles/pages/account.css";
import { readSession, clearSession, initials } from "./utils/session.js";
import { fetchEntitlement } from "./utils/entitlement.js";
import { initLoginSheet } from "./components/login-sheet.js";

const body = document.body;
const params = new URLSearchParams(window.location.search);

/* ---------- State ---------- */
const STATES = ["guest", "free", "member1", "memberN"];
const paramState = params.get("state");
if (paramState === "guest") clearSession();
let session = readSession();
let state = STATES.includes(paramState) ? paramState : session ? "free" : "guest";

/** same-origin path to go back to after logging in (e.g. checkout, an article) */
const returnTo = (() => {
  const raw = params.get("return");
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.href);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
})();

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

function render() {
  body.dataset.state = state;

  for (const [key, text] of Object.entries(CARD_VALUES[state])) {
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

  if (session) {
    document.querySelector("[data-user-name]").textContent = session.name;
    document.querySelector("[data-user-email]").textContent = session.id;
    document.querySelector("[data-user-initials]").textContent = initials(session.name);
  }
}

render();

/* ---------- Subscription from the backend (unless a demo ?state is forced) ---------- */
const PLAN_NAME = { lite: "LITE", max: "MAX", one: "ONE" };
async function syncSubscription() {
  if (paramState || !session) return;
  const ent = await fetchEntitlement();
  if (ent.status !== "active") return;
  const until = new Date(ent.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  MEMBER_CARD.member1 = {
    title: `KOMPAS.com+ ${PLAN_NAME[ent.plan]} ${ent.period === "yearly" ? "Tahunan" : "Bulanan"}`,
    sub: `Diperpanjang pada ${until}`,
  };
  state = "member1";
  render();
}
syncSubscription();

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

/* ---------- Login bottom sheet (components/login-sheet.js) ---------- */
const login = initLoginSheet({
  onLogin(user) {
    session = user;
    state = "free";
    render();
    window.scrollTo(0, 0);
  },
  afterSuccess() {
    if (returnTo) {
      window.location.href = returnTo;
      return true;
    }
    syncSubscription();
    return false;
  },
});

/* Guests are asked to log in before using gated entries */
document.addEventListener("click", (event) => {
  const gated = event.target.closest("[data-auth]");
  if (!gated || state !== "guest") return;
  event.preventDefault();
  login.open();
});

/* ---------- Arriving from a flow that needs an account (e.g. checkout) ---------- */
if (returnTo) {
  if (session) window.location.replace(returnTo);
  else if (state === "guest") login.open();
}
