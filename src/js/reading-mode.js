/**
 * Reading Mode (KOMPAS.com+ premium) for the article page.
 *
 * - The bottom sheet (Figma 11763:34346) lets anyone set text size, bold,
 *   justify, font and reading theme on a sticky preview card. Nothing touches
 *   the article until "Terapkan".
 * - Subscribers (entitlement feature "reading_mode"): "Terapkan" saves the
 *   choice and applies it to every article.
 * - Everyone else: "Terapkan" applies it to this article as a short trial.
 *   ~3 seconds later a dark offer sheet slides up. Closing it puts the article
 *   back to default; its CTA goes straight to checkout, and the choice is
 *   applied for good right after a successful purchase.
 * - Access always follows `watchEntitlement` (backend-validated), so paying in
 *   another tab, or the subscription lapsing, updates this page live.
 */
import { watchEntitlement, hasFeature } from "./utils/entitlement.js";

const PREF_KEY = "kompas-reading-mode";
const PENDING_KEY = "kompas-reading-mode-pending";
const TRIAL_OFFER_DELAY = 3000;

/* Reading fonts: Inter (UI font) plus OFL-licensed Google Fonts —
   three serif, two sans-serif. Only the article body uses them.
   Stacks use single quotes: they also go into inline style="" attributes. */
export const FONTS = {
  inter: { label: "Inter", stack: "'Inter', sans-serif" },
  lora: { label: "Lora", stack: "'Lora', Georgia, serif" },
  merriweather: { label: "Merriweather", stack: "'Merriweather', Georgia, serif" },
  playfair: { label: "Playfair Display", stack: "'Playfair Display', Georgia, serif" },
  hyperlegible: { label: "Atkinson Hyperlegible", stack: "'Atkinson Hyperlegible', 'Inter', sans-serif" },
  lexend: { label: "Lexend", stack: "'Lexend', 'Inter', sans-serif" },
};
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Lexend:wght@400;600&family=Lora:wght@400;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;600;700&display=swap";

export const THEMES = {
  asli: { label: "Asli", bg: "#FFFFFF", text: "#2A2A2A", muted: "#5A5A5A", font: "inter", weight: 400, dark: false },
  tenang: { label: "Tenang", bg: "#1A1A1A", text: "#B7B7B7", muted: "#898989", font: "lora", weight: 400, dark: true },
  kertas: { label: "Kertas", bg: "#F0F0F0", text: "#2A2A2A", muted: "#5A5A5A", font: "lora", weight: 400, dark: false },
  tegas: { label: "Tegas", bg: "#FFFFFF", text: "#121212", muted: "#414141", font: "inter", weight: 600, dark: false },
  hangat: { label: "Hangat", bg: "#F4E9D4", text: "#4A3B2A", muted: "#7A6650", font: "lora", weight: 400, dark: false },
  fokus: { label: "Fokus", bg: "#FBF8EF", text: "#2A2A2A", muted: "#5A5A5A", font: "inter", weight: 400, dark: false },
};

const SIZES = [15, 17, 19, 21, 24, 27]; // 17 = article-body token
const LINE_HEIGHT = 1.5; // loose token
const DEFAULTS = { theme: "asli", font: null, size: 1, bold: false, justify: false };

const icon = (name) => `<i class="rm-ic" style="--ic:url('/assets/reading/${name}.svg')" aria-hidden="true"></i>`;

function load(key, storage = localStorage) {
  try {
    return { ...DEFAULTS, ...JSON.parse(storage.getItem(key)) };
  } catch {
    return { ...DEFAULTS };
  }
}
function save(key, value, storage = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

let fontsRequested = false;
function loadFonts() {
  if (fontsRequested) return;
  fontsRequested = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_CSS;
  document.head.append(link);
}

/** font key in effect: the reader's pick, otherwise the theme's own */
const fontOf = (pref) => (FONTS[pref.font] ? pref.font : (THEMES[pref.theme] || THEMES.asli).font);

/** resolved CSS variables for a preference set */
function styleFor(pref) {
  const theme = THEMES[pref.theme] || THEMES.asli;
  const font = FONTS[fontOf(pref)];
  if (font !== FONTS.inter) loadFonts();
  return {
    "--rm-bg": theme.bg,
    "--rm-text": theme.text,
    "--rm-muted": theme.muted,
    "--rm-font": font.stack,
    "--rm-size": `${SIZES[pref.size] ?? SIZES[1]}px`,
    "--rm-lh": String(LINE_HEIGHT),
    "--rm-weight": String(pref.bold ? 700 : theme.weight),
    "--rm-align": pref.justify ? "justify" : "left",
  };
}

function applyVars(el, pref) {
  Object.entries(styleFor(pref)).forEach(([k, v]) => el.style.setProperty(k, v));
  el.dataset.rmDark = String(THEMES[pref.theme]?.dark || false);
}

function clearVars(el) {
  Object.keys(styleFor(DEFAULTS)).forEach((k) => el.style.removeProperty(k));
  delete el.dataset.rmDark;
}

/* ------------------------------------------------------------------ */
export function initReadingMode({ article, returnUrl }) {
  let entitlement = { status: "loading" };
  let active = false; // subscriber with reading_mode
  let pref = load(PREF_KEY);
  let draft = { ...pref }; // what the sheet is showing
  let trial = false; // a non-subscriber is looking at their applied choice
  let offerTimer = 0;

  /* ---------- markup: settings sheet ---------- */
  const root = document.createElement("div");
  root.className = "rm";
  root.hidden = true;
  root.innerHTML = `
    <div class="rm__backdrop" data-rm-close></div>
    <section class="rm__sheet" role="dialog" aria-modal="true" aria-labelledby="rm-title" tabindex="-1">
      <div class="rm__top">
        <button class="rm__grab" type="button" data-rm-grab aria-label="Tutup Mode Baca (geser ke bawah)"></button>
        <header class="rm__head">
          <h2 class="rm__title" id="rm-title">Mode Baca</h2>
          <button class="rm-iconbtn" type="button" data-rm-close aria-label="Tutup">${icon("x")}</button>
        </header>
        <div class="rm-preview" data-rm-preview aria-live="polite">
          <span class="rm-preview__tag">Pratinjau</span>
          <p class="rm-preview__title">Sesuaikan cara kamu membaca</p>
          <p class="rm-preview__text">Atur ukuran huruf, jenis font, jarak baris, dan warna latar agar membaca berita lebih nyaman di mata, kapan pun dan di mana pun.</p>
        </div>
      </div>

      <div class="rm__body">
        <div class="rm-sec">
          <div class="rm-sec__row">
            <p class="rm-label" id="rm-size-label">Ukuran font</p>
            <div class="rm-seg" role="group" aria-label="Format teks">
              <button type="button" data-rm-toggle="justify" aria-pressed="false" aria-label="Rata kanan-kiri">${icon("text-align-justify")}</button>
              <button type="button" data-rm-toggle="bold" aria-pressed="false" aria-label="Teks tebal">${icon("text-b")}</button>
            </div>
          </div>
          <label class="rm-size">
            <span class="rm-size__a rm-size__a--sm" aria-hidden="true">A</span>
            <span class="rm-range">
              <span class="rm-range__dots" aria-hidden="true">${SIZES.map(() => "<i></i>").join("")}</span>
              <input type="range" min="0" max="${SIZES.length - 1}" step="1" data-rm-size aria-labelledby="rm-size-label" />
            </span>
            <span class="rm-size__a" aria-hidden="true">A</span>
          </label>
        </div>

        <hr class="rm-rule" />

        <div class="rm-sec">
          <p class="rm-label">Font yang digunakan</p>
          <div class="rm-fonts" role="radiogroup" aria-label="Font yang digunakan">
            ${Object.entries(FONTS)
              .map(
                ([key, f]) => `
              <button type="button" class="rm-font" role="radio" aria-checked="false" data-rm-font="${key}" style="--f:${f.stack}">
                <span class="rm-font__aa" aria-hidden="true">Aa</span><span class="rm-font__name">${f.label}</span>${icon("check")}
              </button>`,
              )
              .join("")}
          </div>
        </div>

        <div class="rm-sec rm-sec--theme">
          <p class="rm-label">Tema</p>
          <div class="rm-themes" role="radiogroup" aria-label="Tema">
            ${Object.entries(THEMES)
              .map(
                ([key, t]) => `
              <button type="button" class="rm-theme" role="radio" aria-checked="false" data-rm-theme="${key}"
                style="--t-bg:${t.bg};--t-text:${t.text};--t-font:${FONTS[t.font].stack};--t-weight:${t.weight}">
                <span class="rm-theme__aa">Aa</span><span class="rm-theme__name">${t.label}</span>
              </button>`,
              )
              .join("")}
          </div>
        </div>

        <button class="rm-reset" type="button" data-rm-reset>${icon("arrow-counter-clockwise")}Pengaturan awal</button>
      </div>

      <div class="rm__ctabar">
        <button class="rm-cta" type="button" data-rm-apply>Terapkan</button>
      </div>
    </section>`;
  document.body.append(root);

  /* ---------- markup: dark offer sheet (after a trial) ---------- */
  const offer = document.createElement("div");
  offer.className = "rm rm--offer";
  offer.hidden = true;
  offer.dataset.theme = "dark";
  offer.innerHTML = `
    <div class="rm__backdrop" data-rm-offer-close></div>
    <section class="rm__sheet rm-offer" role="dialog" aria-modal="true" aria-labelledby="rm-offer-title" tabindex="-1">
      <div class="rm__top">
        <button class="rm__grab" type="button" data-rm-grab aria-label="Tutup (geser ke bawah)"></button>
        <header class="rm__head">
          <img class="rm-offer__logo" src="/assets/kplus/kp-icon.svg" alt="KOMPAS.com+" />
          <span class="rm-offer__brand">KOMPAS.com+</span>
          <button class="rm-iconbtn" type="button" data-rm-offer-close aria-label="Tutup dan kembali ke tampilan awal">${icon("x")}</button>
        </header>
      </div>
      <div class="rm__body rm-offer__body">
        <h2 class="rm-offer__title" id="rm-offer-title" data-rm-offer-title>Nyaman dibaca? Simpan untuk semua artikel</h2>
        <p class="rm-offer__text" data-rm-offer-text>Tampilan ini masih pratinjau. Langganan KOMPAS.com+ untuk memakai Mode Baca di setiap artikel.</p>
        <ul class="rm-benefits">
          <li>${icon("check-circle-fill")}Ukuran, font, dan tema baca sesuai selera</li>
          <li>${icon("check-circle-fill")}Tersimpan otomatis di setiap artikel</li>
          <li>${icon("check-circle-fill")}Baca tanpa iklan</li>
        </ul>
      </div>
      <div class="rm__ctabar">
        <a class="rm-cta" data-rm-cta href="#">Langganan KOMPAS.com+</a>
        <a class="rm-login" data-rm-login href="#">Sudah berlangganan? <b>Masuk</b></a>
      </div>
    </section>`;
  document.body.append(offer);

  const $ = (sel) => root.querySelector(sel);
  const preview = $("[data-rm-preview]");
  const range = $("[data-rm-size]");

  /* ---------- rendering ---------- */
  function render() {
    root.querySelectorAll("[data-rm-theme]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.rmTheme === draft.theme)));
    const fontKey = fontOf(draft);
    root.querySelectorAll("[data-rm-font]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.rmFont === fontKey)));
    root.querySelectorAll("[data-rm-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(Boolean(draft[b.dataset.rmToggle]))));
    range.value = String(draft.size);
    range.setAttribute("aria-valuetext", `${SIZES[draft.size]} piksel`);
    applyVars(preview, draft);
  }

  function renderOffer() {
    const back = encodeURIComponent(returnUrl());
    const expired = entitlement.status === "expired";
    offer.querySelector("[data-rm-cta]").href = `./checkout.html?plan=max&ref=reading-mode&return=${back}`;
    offer.querySelector("[data-rm-cta]").textContent = expired ? "Perpanjang langganan" : "Langganan KOMPAS.com+";
    offer.querySelector("[data-rm-offer-title]").textContent = expired
      ? "Langganan KOMPAS.com+ kamu sudah berakhir"
      : "Nyaman dibaca? Simpan untuk semua artikel";
    offer.querySelector("[data-rm-offer-text]").textContent = expired
      ? "Perpanjang langganan agar tampilan ini kembali dipakai di setiap artikel."
      : "Tampilan ini masih pratinjau. Langganan KOMPAS.com+ untuk memakai Mode Baca di setiap artikel.";
    const login = offer.querySelector("[data-rm-login]");
    login.href = `./account.html?return=${back}`;
    login.hidden = entitlement.status !== "guest";
  }

  /** article styling for the current state */
  function paintArticle() {
    if (active) applyVars(article, pref);
    else if (trial) applyVars(article, draft);
    else clearVars(article);
    article.classList.toggle("is-reading", active || trial);
  }

  /* ---------- sheet open / close (shared by both sheets) ---------- */
  function sheetOf(el) {
    return el.querySelector(".rm__sheet");
  }
  let lastFocus = null;
  function show(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.documentElement.classList.add("rm-scroll-lock");
    requestAnimationFrame(() => el.classList.add("is-open"));
    sheetOf(el).focus({ preventScroll: true }); // keyboard users tab on from here
  }
  function hide(el) {
    el.classList.remove("is-open");
    document.documentElement.classList.remove("rm-scroll-lock");
    setTimeout(() => {
      el.hidden = true;
      lastFocus?.focus?.({ preventScroll: true });
    }, 280);
  }

  function open() {
    clearTimeout(offerTimer);
    if (!offer.hidden) hide(offer);
    loadFonts(); // the font list shows each face
    draft = active ? { ...pref } : trial ? { ...draft } : load(PENDING_KEY, sessionStorage);
    render();
    show(root);
  }
  function close() {
    hide(root);
    if (trial && !active) scheduleOffer(); // still trying it out: the offer follows
  }

  function applyChoice() {
    if (active) {
      pref = { ...draft };
      save(PREF_KEY, pref);
      paintArticle();
      close();
      toast("<b>Mode Baca diterapkan.</b> Tersimpan untuk semua artikel.");
      return;
    }
    // trial: show it on this article, then offer the subscription
    save(PENDING_KEY, draft, sessionStorage); // carried over after purchase
    trial = true;
    paintArticle();
    close();
  }

  function scheduleOffer() {
    clearTimeout(offerTimer);
    offerTimer = setTimeout(() => {
      if (!trial || active) return;
      renderOffer();
      show(offer);
    }, TRIAL_OFFER_DELAY);
  }

  function endTrial() {
    clearTimeout(offerTimer);
    trial = false;
    paintArticle(); // back to the default article
    hide(offer);
  }

  /* ---------- drag the grabber / header down to dismiss ---------- */
  function enableDrag(el, onDismiss) {
    const sheet = sheetOf(el);
    let start = null;
    let moved = false;
    const zone = (t) => t.closest("[data-rm-grab]") || (t.closest(".rm__head") && !t.closest("button"));
    sheet.addEventListener("pointerdown", (e) => {
      if (!zone(e.target)) return;
      start = e.clientY;
      moved = false;
      sheet.classList.add("is-dragging");
      sheet.setPointerCapture(e.pointerId);
    });
    sheet.addEventListener("pointermove", (e) => {
      if (start === null) return;
      sheet.style.transform = `translateY(${Math.max(0, e.clientY - start)}px)`;
    });
    const end = (e) => {
      if (start === null) return;
      const dy = e.clientY - start;
      start = null;
      moved = Math.abs(dy) > 5;
      sheet.classList.remove("is-dragging");
      sheet.style.transform = "";
      if (dy > 80) onDismiss();
    };
    sheet.addEventListener("pointerup", end);
    sheet.addEventListener("pointercancel", end);
    // tap/Enter on the grabber closes, a drag decides itself
    sheet.querySelector("[data-rm-grab]").addEventListener("click", () => (moved ? (moved = false) : onDismiss()));
  }
  enableDrag(root, close);
  enableDrag(offer, endTrial);

  /* ---------- events ---------- */
  root.addEventListener("click", (event) => {
    const t = event.target;
    if (t.closest("[data-rm-close]")) return close();
    if (t.closest("[data-rm-apply]")) return applyChoice();
    const toggle = t.closest("[data-rm-toggle]");
    if (toggle) {
      draft[toggle.dataset.rmToggle] = !draft[toggle.dataset.rmToggle];
      return render();
    }
    const theme = t.closest("[data-rm-theme]");
    if (theme) {
      draft.theme = theme.dataset.rmTheme;
      draft.font = null; // a theme brings its own font until the reader picks one
      return render();
    }
    const font = t.closest("[data-rm-font]");
    if (font) {
      draft.font = font.dataset.rmFont;
      return render();
    }
    if (t.closest("[data-rm-reset]")) {
      draft = { ...DEFAULTS };
      return render();
    }
  });
  range.addEventListener("input", () => {
    draft.size = Number(range.value);
    render();
  });
  offer.addEventListener("click", (event) => {
    if (event.target.closest("[data-rm-offer-close]")) endTrial();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!offer.hidden) endTrial();
    else if (!root.hidden) close();
  });

  /* ---------- toast — In-Body Alert / Mobile / Success / Filled ---------- */
  function toast(html) {
    const el = document.createElement("div");
    el.className = "rm-toast";
    el.setAttribute("role", "status");
    el.innerHTML = `${icon("check-circle-fill")}<span>${html}</span>`;
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add("is-show"));
    setTimeout(() => {
      el.classList.remove("is-show");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  /* ---------- access ---------- */
  // a payment in another tab should greet the reader once they come back
  let unlockPending = false;
  window.addEventListener("entitlement-changed", () => (unlockPending = true));
  if ("BroadcastChannel" in window) new BroadcastChannel("kompas-entitlement").addEventListener("message", () => (unlockPending = true));

  const onEntitlement = (next) => {
    const was = active;
    entitlement = next;
    active = hasFeature(next, "reading_mode");
    if (active && !was) {
      // just unlocked (e.g. after checkout): keep what they tried
      const pending = sessionStorage.getItem(PENDING_KEY) ? load(PENDING_KEY, sessionStorage) : null;
      if (pending) {
        pref = pending;
        save(PREF_KEY, pref);
        sessionStorage.removeItem(PENDING_KEY);
      }
      trial = false;
      clearTimeout(offerTimer);
      if (!offer.hidden) hide(offer);
    }
    paintArticle();
    if (!offer.hidden) renderOffer();
    if (active && !was && (window.location.hash === "#mode-baca" || unlockPending)) {
      unlockPending = false;
      toast("<b>Mode Baca aktif.</b> Pilihan kamu sudah diterapkan.");
      if (window.location.hash === "#mode-baca") history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };
  watchEntitlement(onEntitlement);

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-rm-open]")) {
      event.preventDefault();
      open();
    }
  });

  return { open };
}
