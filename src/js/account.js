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

const body = document.body;
const params = new URLSearchParams(window.location.search);

/* ---------- Session (prototype login, kept in localStorage) ---------- */
const SESSION_KEY = "kompas-account-session";

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

/* ---------- State ---------- */
const STATES = ["guest", "free", "member1", "memberN"];
const paramState = params.get("state");
if (paramState === "guest") {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
let session = readSession();
let state = STATES.includes(paramState) ? paramState : session ? "free" : "guest";

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

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "K";
}

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

/* ---------- Login bottom sheet ---------- */
const sheetRoot = document.querySelector("[data-login]");
const sheet = sheetRoot.querySelector(".ls__sheet");
const lead = sheetRoot.querySelector("[data-login-lead]");
const panels = sheetRoot.querySelectorAll("[data-panel]");
const emailForm = sheetRoot.querySelector('[data-panel="email"]');
const idInput = emailForm.querySelector("[data-login-id]");
const idError = emailForm.querySelector("[data-login-error]");
const otpForm = sheetRoot.querySelector('[data-panel="otp"]');
const otpBoxes = [...otpForm.querySelectorAll(".ls__otp-box")];
const resendBtn = otpForm.querySelector("[data-resend]");
const resendTimer = otpForm.querySelector("[data-resend-timer]");

const LEAD_TEXT = {
  options: "Login untuk menyimpan artikel, mendapatkan berita sesuai minat, dan fitur menarik lainnya.",
  email: "Masukkan email atau nomor HP yang terhubung dengan KG Media ID kamu.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+62|62|0)8\d{7,11}$/;
const DEMO_USER = { name: "Dian meidina", id: "dianmeidina@gmail.com" };

let lastFocus = null;
let pendingId = "";
let resendInterval = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function goTo(step) {
  sheet.dataset.step = step;
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== step;
  });
  if (step === "otp") {
    lead.innerHTML = `Masukkan 6 digit kode verifikasi yang kami kirim ke <b>${escapeHtml(pendingId)}</b>.`;
  } else if (LEAD_TEXT[step]) {
    lead.textContent = LEAD_TEXT[step];
  }
}

function openSheet() {
  lastFocus = document.activeElement;
  goTo("options");
  sheetRoot.hidden = false;
  document.documentElement.classList.add("ls-lock");
  void sheet.offsetHeight; // commit the closed position before animating in
  sheetRoot.classList.add("is-open");
  sheet.querySelector(".ls__round--close").focus({ preventScroll: true });
}

function closeSheet() {
  if (sheetRoot.hidden) return;
  sheetRoot.classList.remove("is-open");
  document.documentElement.classList.remove("ls-lock");
  clearInterval(resendInterval);
  setTimeout(() => {
    sheetRoot.hidden = true;
    sheetRoot.querySelectorAll(".is-loading").forEach((el) => el.classList.remove("is-loading"));
    emailForm.reset();
    otpForm.reset();
    idError.hidden = true;
    idInput.removeAttribute("aria-invalid");
    emailForm.querySelector(".ls__primary").disabled = true;
    otpForm.querySelector(".ls__primary").disabled = true;
    lastFocus?.focus?.({ preventScroll: true });
  }, 340);
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "ac-toast";
  toast.setAttribute("role", "status");
  toast.textContent = text;
  body.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-show"));
  setTimeout(() => {
    toast.classList.remove("is-show");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

/* "Login Berhasil" screen covers the page while the account loads, then fades out */
const doneScreen = document.querySelector("[data-login-done]");

async function completeLogin(user) {
  session = user;
  saveSession(user);
  doneScreen.hidden = false;
  void doneScreen.offsetHeight;
  doneScreen.classList.add("is-show");
  await wait(250);
  closeSheet();
  state = "free";
  render();
  window.scrollTo(0, 0);
  await wait(2800); // let the illustration play through
  doneScreen.classList.remove("is-show");
  await wait(250);
  doneScreen.hidden = true;
}

function nameFromId(id) {
  if (!id.includes("@")) return "Pembaca Kompas";
  const local = id.split("@")[0].replace(/[._\-\d]+/g, " ").trim();
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : "Pembaca Kompas";
}

/* Guests are asked to log in before using gated entries */
document.addEventListener("click", (event) => {
  const gated = event.target.closest("[data-auth]");
  if (!gated || state !== "guest") return;
  event.preventDefault();
  openSheet();
});

sheetRoot.addEventListener("click", (event) => {
  if (event.target.closest("[data-login-close]")) closeSheet();
  else if (event.target.closest("[data-login-back]")) goTo(sheet.dataset.step === "otp" ? "email" : "options");
  else if (event.target.closest('[data-goto="email"]')) {
    goTo("email");
    idInput.focus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !sheetRoot.hidden) closeSheet();
});

/* Google / Apple: simulated provider round-trip */
sheetRoot.querySelectorAll("[data-provider]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (sheetRoot.querySelector(".is-loading")) return;
    btn.classList.add("is-loading");
    await wait(1100);
    btn.classList.remove("is-loading");
    completeLogin(DEMO_USER);
  });
});

/* Email / No. HP */
idInput.addEventListener("input", () => {
  emailForm.querySelector(".ls__primary").disabled = !idInput.value.trim();
  idError.hidden = true;
  idInput.removeAttribute("aria-invalid");
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = idInput.value.trim();
  const phone = value.replace(/[\s-]/g, "");
  if (!EMAIL_RE.test(value) && !PHONE_RE.test(phone)) {
    idError.hidden = false;
    idInput.setAttribute("aria-invalid", "true");
    idInput.focus();
    return;
  }
  const submit = emailForm.querySelector(".ls__primary");
  submit.classList.add("is-loading");
  await wait(800);
  submit.classList.remove("is-loading");
  pendingId = EMAIL_RE.test(value) ? value.toLowerCase() : phone;
  goTo("otp");
  startResendTimer();
  otpBoxes[0].focus();
});

/* OTP: six single-digit boxes with auto-advance, backspace and paste */
function otpValue() {
  return otpBoxes.map((box) => box.value).join("");
}

function syncOtp() {
  otpForm.querySelector(".ls__primary").disabled = otpValue().length !== otpBoxes.length;
}

otpBoxes.forEach((box, i) => {
  box.addEventListener("input", () => {
    const digits = box.value.replace(/\D/g, "");
    if (digits.length > 1) {
      [...digits].slice(0, otpBoxes.length - i).forEach((d, k) => (otpBoxes[i + k].value = d));
      otpBoxes[Math.min(i + digits.length, otpBoxes.length - 1)].focus();
    } else {
      box.value = digits;
      if (digits && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    }
    syncOtp();
  });
  box.addEventListener("focus", () => box.select());
  box.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !box.value && i > 0) otpBoxes[i - 1].focus();
  });
  box.addEventListener("paste", (event) => {
    const digits = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, otpBoxes.length);
    if (!digits) return;
    event.preventDefault();
    otpBoxes.forEach((b, k) => (b.value = digits[k] || ""));
    otpBoxes[Math.min(digits.length, otpBoxes.length - 1)].focus();
    syncOtp();
  });
});

function startResendTimer() {
  let left = 30;
  resendBtn.disabled = true;
  resendTimer.textContent = "(00:30)";
  clearInterval(resendInterval);
  resendInterval = setInterval(() => {
    left -= 1;
    resendTimer.textContent = left > 0 ? `(00:${String(left).padStart(2, "0")})` : "";
    if (left <= 0) {
      clearInterval(resendInterval);
      resendBtn.disabled = false;
    }
  }, 1000);
}

resendBtn.addEventListener("click", () => {
  startResendTimer();
  showToast("Kode baru sudah dikirim");
});

otpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (otpValue().length !== otpBoxes.length) return;
  const submit = otpForm.querySelector(".ls__primary");
  submit.classList.add("is-loading");
  await wait(900);
  submit.classList.remove("is-loading");
  clearInterval(resendInterval);
  completeLogin({ name: nameFromId(pendingId), id: pendingId });
});
