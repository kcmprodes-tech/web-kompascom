/**
 * Bottom sheet "Gunakan akunmu yang akan dihubungkan dengan MyValue"
 * (Figma 12004:56896, design repo partial myvalue_sheet). Only for readers
 * who are not logged in: the account page's MyValue card opens it, and
 * either login button saves the demo session and goes on to the
 * "Hubungkan akun MyValue" page. Logged-in readers skip it.
 *
 *   const sheet = initMyValueSheet({ next: "./myvalue-connect.html" });
 *   sheet.open();
 */
import "../../styles/components/myvalue-sheet.css";
import { saveSession } from "../utils/session.js";

const DEMO_USER = { name: "Dian meidina", id: "dianmeidina@gmail.com" };

const MARKUP = `
<div class="mvs" data-mvs hidden>
  <div class="mvs__backdrop" data-mvs-close></div>
  <section class="mvs__sheet" role="dialog" aria-modal="true" aria-labelledby="mvs-title">
    <div class="mvs__top">
      <button class="mvs__close" type="button" aria-label="Tutup" data-mvs-close></button>
    </div>
    <div class="mvs__card">
      <div class="mvs__head">
        <img src="/assets/myvalue/flow/logo-kompas.svg" width="95" height="12" alt="KOMPAS.com" />
        <p class="mvs__title" id="mvs-title">Gunakan akunmu yang akan dihubungkan dengan MyValue</p>
      </div>
      <div class="mvs__form">
        <button class="mvs__btn" type="button" data-mvs-login>
          <span class="mvs__google"><img src="/assets/myvalue/flow/google.svg" alt="" /></span>
          <span>Login dengan Google</span>
        </button>
        <span class="mvs__or">Atau</span>
        <button class="mvs__btn" type="button" data-mvs-login>
          <span class="mvs__email" aria-hidden="true"></span>
          <span>Login dengan Email</span>
        </button>
      </div>
    </div>
    <p class="mvs__note">Dengan menekan tombol “Login”, kamu menyetujui bahwa data dan informasi KG Media ID milikmu akan digunakan untuk memberikan layanan sesuai <a href="https://www.kgmedia.id/legal-privacy-id" target="_blank" rel="noopener">Kebijakan Data Pribadi KG Media</a>.</p>
  </section>
</div>`;

export function initMyValueSheet({ next }) {
  document.body.insertAdjacentHTML("beforeend", MARKUP);
  const root = document.querySelector("[data-mvs]");
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("mvs-lock");
    root.getBoundingClientRect(); // start the slide from the closed position
    root.classList.add("is-open");
    root.querySelector(".mvs__close").focus({ preventScroll: true });
  }

  function close() {
    root.classList.remove("is-open");
    document.documentElement.classList.remove("mvs-lock");
    setTimeout(() => {
      if (!root.classList.contains("is-open")) root.hidden = true;
    }, 350);
    lastFocus?.focus?.({ preventScroll: true });
  }

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-mvs-close]")) close();
    if (event.target.closest("[data-mvs-login]")) {
      saveSession(DEMO_USER);
      window.location.href = next;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) close();
  });

  return { open, close };
}
