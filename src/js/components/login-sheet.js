/**
 * Login bottom sheet (Figma 11695:95575) with Google / Apple / Email + OTP,
 * then the animated "Login Berhasil" screen (Figma 11695:95766). Shared by
 * the account page and checkout.
 *
 *   const login = initLoginSheet({ onLogin, afterSuccess });
 *   login.open();
 *
 * onLogin(user) runs as soon as the sheet closes (the session is saved and
 * other tabs are told); afterSuccess(user) runs once the illustration has
 * played — return true when it navigates away, so the screen stays up.
 */
import "../../styles/components/login-sheet.css";
import { saveSession } from "../utils/session.js";
import { announceEntitlementChange } from "../utils/entitlement.js";

const MARKUP = `
<!-- Login bottom sheet (Figma 11695:95575) -->
<div class="ls" data-login hidden>
  <div class="ls__backdrop" data-login-close></div>
  <section class="ls__sheet" role="dialog" aria-modal="true" aria-labelledby="ls-lead" data-step="options">
    <div class="ls__bar">
      <button class="ls__round ls__round--back" type="button" aria-label="Kembali" data-login-back></button>
      <button class="ls__round ls__round--close" type="button" aria-label="Tutup" data-login-close></button>
    </div>

    <div class="ls__card">
      <div class="ls__intro">
        <img class="ls__logo" src="/assets/account/login/logo-kompas.svg" width="127" height="16" alt="KOMPAS.com" />
        <p class="ls__lead" id="ls-lead" data-login-lead>Login untuk menyimpan artikel, mendapatkan berita sesuai minat, dan fitur menarik lainnya.</p>
      </div>

      <!-- Step: pilihan login -->
      <div class="ls__step" data-panel="options">
        <button class="ls__btn" type="button" data-provider="google">
          <span class="ls__btn-ic ls__btn-ic--google"><img src="/assets/account/login/google.svg" alt="" /></span>
          <span class="ls__btn-label">Login dengan Google</span>
        </button>
        <button class="ls__btn" type="button" data-provider="apple">
          <span class="ls__btn-ic ls__btn-ic--apple"></span>
          <span class="ls__btn-label">Login dengan Apple ID</span>
        </button>
        <p class="ls__or">Atau</p>
        <button class="ls__btn" type="button" data-goto="email">
          <span class="ls__btn-ic ls__btn-ic--email"></span>
          <span class="ls__btn-label">Login dengan Email</span>
        </button>
      </div>

      <!-- Step: email / no. HP -->
      <form class="ls__step" data-panel="email" novalidate hidden>
        <label class="ls__field">
          <span class="ls__label">Email atau No. HP</span>
          <input class="ls__input" type="text" name="id" inputmode="email" autocomplete="username" placeholder="contoh@email.com" data-login-id />
        </label>
        <p class="ls__error" data-login-error hidden>Masukkan email atau nomor HP yang valid.</p>
        <button class="ls__primary" type="submit" disabled>Lanjutkan</button>
      </form>

      <!-- Step: kode verifikasi -->
      <form class="ls__step" data-panel="otp" novalidate hidden>
        <div class="ls__otp" data-otp>
          <input class="ls__otp-box" type="text" inputmode="numeric" autocomplete="one-time-code" aria-label="Digit 1" />
          <input class="ls__otp-box" type="text" inputmode="numeric" aria-label="Digit 2" />
          <input class="ls__otp-box" type="text" inputmode="numeric" aria-label="Digit 3" />
          <input class="ls__otp-box" type="text" inputmode="numeric" aria-label="Digit 4" />
          <input class="ls__otp-box" type="text" inputmode="numeric" aria-label="Digit 5" />
          <input class="ls__otp-box" type="text" inputmode="numeric" aria-label="Digit 6" />
        </div>
        <p class="ls__resend">Tidak menerima kode? <button type="button" data-resend disabled>Kirim ulang <span data-resend-timer>(00:30)</span></button></p>
        <button class="ls__primary" type="submit" disabled>Verifikasi</button>
      </form>
    </div>

    <p class="ls__legal" data-login-legal>
      Dengan menekan tombol “Login”, kamu menyetujui bahwa data dan informasi KG Media ID milikmu akan digunakan untuk memberikan layanan sesuai
      <a href="https://www.kgmedia.id/legal-privacy-id" target="_blank" rel="noopener">Kebijakan Data Pribadi KG Media</a>.
    </p>
  </section>
</div>

<!-- Login berhasil (Figma 11695:95766) -->
<div class="ls-done" data-login-done role="status" aria-live="polite" hidden>
  <div class="ls-done__box">
    <div class="ls-ill" aria-hidden="true">
      <img class="ls-ill__base" src="/assets/account/login/success/base.png" alt="" />
      <img class="ls-ill__part ls-ill__plant-l" src="/assets/account/login/success/plant-l.png" alt="" />
      <img class="ls-ill__part ls-ill__plant-r" src="/assets/account/login/success/plant-r.png" alt="" />
      <img class="ls-ill__part ls-ill__lock" src="/assets/account/login/success/lock.png" alt="" />
      <img class="ls-ill__part ls-ill__spark-l" src="/assets/account/login/success/spark-l.png" alt="" />
      <img class="ls-ill__part ls-ill__spark-r" src="/assets/account/login/success/spark-r.png" alt="" />
      <img class="ls-ill__part ls-ill__star-l" src="/assets/account/login/success/star-l.png" alt="" />
      <img class="ls-ill__part ls-ill__star-r" src="/assets/account/login/success/star-r.png" alt="" />
      <img class="ls-ill__part ls-ill__dot-l" src="/assets/account/login/success/dot-l.png" alt="" />
      <img class="ls-ill__part ls-ill__dot-r" src="/assets/account/login/success/dot-r.png" alt="" />
      <span class="ls-ill__ring"></span>
      <svg class="ls-ill__badge" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10.9" fill="#006dcb" stroke="#2a2a2a" stroke-width="1.5" />
        <path d="M6.6 10.2 10.7 15.1 16.3 7.9" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
      </svg>
    </div>
    <div class="ls-done__text">
      <strong class="ls-done__title">Login Berhasil</strong>
      <p class="ls-done__sub">Selamat datang kembali! Kamu sudah berhasil masuk ke akun KOMPAS.com.</p>
    </div>
    <div class="ls-done__loader"><span class="ls-done__spin" aria-label="Memuat"></span></div>
  </div>
</div>
`;

const LEAD_TEXT = {
  options: "Login untuk menyimpan artikel, mendapatkan berita sesuai minat, dan fitur menarik lainnya.",
  email: "Masukkan email atau nomor HP yang terhubung dengan KG Media ID kamu.",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+62|62|0)8\d{7,11}$/;
const DEMO_USER = { name: "Dian meidina", id: "dianmeidina@gmail.com" };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function nameFromId(id) {
  if (!id.includes("@")) return "Pembaca Kompas";
  const local = id.split("@")[0].replace(/[._\-\d]+/g, " ").trim();
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : "Pembaca Kompas";
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "ls-toast";
  toast.setAttribute("role", "status");
  toast.textContent = text;
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-show"));
  setTimeout(() => {
    toast.classList.remove("is-show");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

export function initLoginSheet({ onLogin, afterSuccess } = {}) {
  if (!document.querySelector("[data-login]")) document.body.insertAdjacentHTML("beforeend", MARKUP);

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
  const doneScreen = document.querySelector("[data-login-done]");

  let lastFocus = null;
  let pendingId = "";
  let resendInterval = null;

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

  function open() {
    lastFocus = document.activeElement;
    goTo("options");
    sheetRoot.hidden = false;
    document.documentElement.classList.add("ls-lock");
    void sheet.offsetHeight; // commit the closed position before animating in
    sheetRoot.classList.add("is-open");
    sheet.querySelector(".ls__round--close").focus({ preventScroll: true });
  }

  function close() {
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

  /* "Login Berhasil" covers the page while the account loads, then fades out */
  async function completeLogin(user) {
    saveSession(user);
    doneScreen.hidden = false;
    void doneScreen.offsetHeight;
    doneScreen.classList.add("is-show");
    await wait(250);
    close();
    onLogin?.(user);
    announceEntitlementChange(); // other tabs re-check access for the new session
    await wait(2800); // let the illustration play through
    if (await afterSuccess?.(user)) return;
    doneScreen.classList.remove("is-show");
    await wait(250);
    doneScreen.hidden = true;
  }

  sheetRoot.addEventListener("click", (event) => {
    if (event.target.closest("[data-login-close]")) close();
    else if (event.target.closest("[data-login-back]")) goTo(sheet.dataset.step === "otp" ? "email" : "options");
    else if (event.target.closest('[data-goto="email"]')) {
      goTo("email");
      idInput.focus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sheetRoot.hidden) close();
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
  const otpValue = () => otpBoxes.map((box) => box.value).join("");
  const syncOtp = () => {
    otpForm.querySelector(".ls__primary").disabled = otpValue().length !== otpBoxes.length;
  };

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

  return { open, close };
}
