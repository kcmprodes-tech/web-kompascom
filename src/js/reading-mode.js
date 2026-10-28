/**
 * Reading Mode (KOMPAS.com+ premium) for the article page.
 *
 * - Subscribers (entitlement feature "reading_mode") change text size, font,
 *   line spacing, weight, alignment and reading theme; the choice is saved and
 *   re-applied on every article.
 * - Everyone else gets the same panel as a live demo on a sample paragraph,
 *   with the benefits and a CTA to the KOMPAS.com+ offer. Whatever they tried
 *   is kept and applied right after a successful purchase.
 * - Access always follows `watchEntitlement` (backend-validated), so paying in
 *   another tab, or the subscription lapsing, updates this page live.
 */
import { watchEntitlement, hasFeature } from "./utils/entitlement.js";

const PREF_KEY = "kompas-reading-mode";
const PENDING_KEY = "kompas-reading-mode-pending";

export const THEMES = {
  asli: { label: "Asli", bg: "#FFFFFF", text: "#2A2A2A", muted: "#5A5A5A", font: "inter", weight: 400, dark: false },
  tenang: { label: "Tenang", bg: "#1A1A1A", text: "#B7B7B7", muted: "#898989", font: "serif", weight: 400, dark: true },
  kertas: { label: "Kertas", bg: "#F0F0F0", text: "#2A2A2A", muted: "#5A5A5A", font: "serif", weight: 400, dark: false },
  tegas: { label: "Tegas", bg: "#FFFFFF", text: "#121212", muted: "#414141", font: "inter", weight: 600, dark: false },
  hangat: { label: "Hangat", bg: "#F4E9D4", text: "#4A3B2A", muted: "#7A6650", font: "serif", weight: 400, dark: false },
  fokus: { label: "Fokus", bg: "#FBF8EF", text: "#2A2A2A", muted: "#5A5A5A", font: "inter", weight: 400, dark: false },
};

export const FONTS = {
  inter: { label: "Inter", stack: '"Inter", sans-serif' },
  serif: { label: "Serif", stack: 'Charter, "Iowan Old Style", Georgia, "Times New Roman", serif' },
  hyperlegible: { label: "Hyperlegible", stack: '"Atkinson Hyperlegible", "Inter", sans-serif', href: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" },
};

const SIZES = [15, 17, 19, 21, 24]; // 17 = article-body token
const LINE_HEIGHTS = [1.4, 1.5, 1.8]; // rapat · loose token · lega
const DEFAULTS = { theme: "asli", font: null, size: 1, line: 1, bold: false, justify: false };

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

/** resolved CSS variables for a preference set */
function styleFor(pref) {
  const theme = THEMES[pref.theme] || THEMES.asli;
  const font = FONTS[pref.font || theme.font];
  if (font.href && !document.querySelector(`link[href="${font.href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = font.href;
    document.head.append(link);
  }
  return {
    "--rm-bg": theme.bg,
    "--rm-text": theme.text,
    "--rm-muted": theme.muted,
    "--rm-font": font.stack,
    "--rm-size": `${SIZES[pref.size]}px`,
    "--rm-lh": String(LINE_HEIGHTS[pref.line]),
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
  let draft = { ...pref }; // what the panel is showing (preview or live)
  let view = "main";

  /* ---------- markup ---------- */
  const root = document.createElement("div");
  root.className = "rm";
  root.hidden = true;
  root.innerHTML = `
    <div class="rm__backdrop" data-rm-close></div>
    <section class="rm__sheet" role="dialog" aria-modal="true" aria-labelledby="rm-title" tabindex="-1">
      <header class="rm__head">
        <button class="rm-iconbtn" type="button" data-rm-back aria-label="Kembali" hidden>${icon("caret-left")}</button>
        <h2 class="rm__title" id="rm-title">Mode Baca</h2>
        <span class="rm-badge" data-rm-badge>${icon("crown-simple")}Plus</span>
        <button class="rm-iconbtn rm-iconbtn--close" type="button" data-rm-close aria-label="Tutup">${icon("x")}</button>
      </header>

      <div class="rm__gate" data-rm-gate hidden>
        <div class="rm-preview" data-rm-preview>
          <span class="rm-preview__tag">Pratinjau</span>
          <p class="rm-preview__title">Sesuaikan cara kamu membaca</p>
          <p class="rm-preview__text">Atur ukuran huruf, jenis font, jarak baris, dan warna latar agar membaca berita lebih nyaman di mata, kapan pun dan di mana pun.</p>
        </div>
      </div>

      <div class="rm__body" data-rm-view="main">
        <div class="rm-row">
          <div class="rm-seg" role="group" aria-label="Ukuran teks">
            <button type="button" data-rm-size="-1" aria-label="Perkecil teks"><span class="rm-a rm-a--sm">A</span></button>
            <button type="button" data-rm-size="1" aria-label="Perbesar teks"><span class="rm-a">A</span></button>
          </div>
          <div class="rm-seg" role="group" aria-label="Format teks">
            <button type="button" data-rm-toggle="justify" aria-pressed="false" aria-label="Rata kanan-kiri">${icon("text-align-justify")}</button>
            <button type="button" data-rm-toggle="bold" aria-pressed="false" aria-label="Teks tebal">${icon("text-b")}</button>
          </div>
        </div>
        <label class="rm-slider">
          ${icon("arrows-in-line-vertical")}
          <input type="range" min="0" max="${LINE_HEIGHTS.length - 1}" step="1" data-rm-line aria-label="Jarak baris" />
          ${icon("arrows-out-line-vertical")}
        </label>
        <div class="rm-themes" role="radiogroup" aria-label="Tema baca">
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
        <button class="rm-wide" type="button" data-rm-customize>${icon("sliders-horizontal")}Sesuaikan</button>
      </div>

      <div class="rm__body" data-rm-view="custom" hidden>
        <p class="rm-label">Jenis huruf</p>
        <div class="rm-fonts" role="radiogroup" aria-label="Jenis huruf">
          ${Object.entries(FONTS)
            .map(
              ([key, f]) => `
            <button type="button" class="rm-font" role="radio" aria-checked="false" data-rm-font="${key}" style="--f:${f.stack}">
              <span class="rm-font__aa">Aa</span><span>${f.label}</span>${icon("check")}
            </button>`,
            )
            .join("")}
        </div>
        <p class="rm-label">Ukuran teks <b data-rm-size-label></b></p>
        <div class="rm-steps" data-rm-steps>
          ${SIZES.map((s, i) => `<button type="button" data-rm-step="${i}" aria-label="${s} piksel"><i></i></button>`).join("")}
        </div>
        <button class="rm-wide rm-wide--plain" type="button" data-rm-reset>${icon("arrow-counter-clockwise")}Kembalikan ke awal</button>
      </div>

      <div class="rm__offer" data-rm-offer hidden>
        <div class="rm-lock">${icon("lock-simple")}<p data-rm-offer-title>Mode Baca khusus pelanggan KOMPAS.com+</p></div>
        <ul class="rm-benefits">
          <li>${icon("check-circle-fill")}Ukuran, font, dan jarak baris sesuai selera</li>
          <li>${icon("check-circle-fill")}6 tema baca, termasuk tema gelap yang nyaman di mata</li>
          <li>${icon("check-circle-fill")}Tersimpan otomatis di setiap artikel, tanpa iklan</li>
        </ul>
      </div>
      <div class="rm__ctabar" data-rm-ctabar hidden>
        <a class="rm-cta" data-rm-cta href="#">Langganan KOMPAS.com+</a>
        <a class="rm-login" data-rm-login href="#">Sudah berlangganan? <b>Masuk</b></a>
      </div>
    </section>`;
  document.body.append(root);

  const $ = (sel) => root.querySelector(sel);
  const sheet = $(".rm__sheet");
  const preview = $("[data-rm-preview]");

  /* ---------- rendering ---------- */
  function paintControls() {
    root.querySelectorAll("[data-rm-theme]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.rmTheme === draft.theme)));
    const fontKey = draft.font || THEMES[draft.theme].font;
    root.querySelectorAll("[data-rm-font]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.rmFont === fontKey)));
    root.querySelectorAll("[data-rm-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(Boolean(draft[b.dataset.rmToggle]))));
    root.querySelectorAll("[data-rm-step]").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.rmStep) <= draft.size));
    $("[data-rm-size-label]").textContent = `${SIZES[draft.size]} px`;
    $("[data-rm-size='-1']").disabled = draft.size === 0;
    $("[data-rm-size='1']").disabled = draft.size === SIZES.length - 1;
    $("[data-rm-line]").value = String(draft.line);
    // the sheet follows the reading theme's lightness (KDS tokens switch via data-theme)
    root.dataset.theme = THEMES[draft.theme].dark ? "dark" : "light";
  }

  function render() {
    paintControls();
    if (active) {
      applyVars(article, draft);
      article.classList.add("is-reading");
    } else {
      applyVars(preview, draft);
    }
  }

  function renderAccess() {
    const loading = entitlement.status === "loading";
    root.classList.toggle("is-loading", loading);
    $("[data-rm-gate]").hidden = active || loading;
    $("[data-rm-offer]").hidden = active || loading;
    $("[data-rm-ctabar]").hidden = active || loading;
    $("[data-rm-badge]").classList.toggle("is-locked", !active);
    $("[data-rm-badge]").innerHTML = `${icon(active ? "crown-simple" : "lock-simple")}Plus`;

    const back = encodeURIComponent(returnUrl());
    $("[data-rm-cta]").href = `./kompasplus.html?ref=reading-mode&return=${back}`;
    $("[data-rm-login]").href = `./account.html?return=${back}`;
    $("[data-rm-login]").hidden = entitlement.status !== "guest";
    $("[data-rm-offer-title]").textContent =
      entitlement.status === "expired"
        ? "Langganan KOMPAS.com+ kamu sudah berakhir"
        : "Mode Baca khusus pelanggan KOMPAS.com+";
    $("[data-rm-cta]").textContent = entitlement.status === "expired" ? "Perpanjang langganan" : "Langganan KOMPAS.com+";
  }

  function setView(next) {
    view = next;
    root.querySelectorAll("[data-rm-view]").forEach((v) => (v.hidden = v.dataset.rmView !== next));
    $("[data-rm-back]").hidden = next === "main";
    $("#rm-title").textContent = next === "main" ? "Mode Baca" : "Sesuaikan";
  }

  function commit() {
    if (active) {
      pref = { ...draft };
      save(PREF_KEY, pref);
    } else {
      save(PENDING_KEY, draft, sessionStorage); // carried over after purchase
    }
    render();
  }

  /* ---------- open / close ---------- */
  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    draft = active ? { ...pref } : load(PENDING_KEY, sessionStorage);
    setView("main");
    renderAccess();
    render();
    root.hidden = false;
    document.documentElement.classList.add("rm-scroll-lock");
    requestAnimationFrame(() => root.classList.add("is-open"));
    sheet.focus({ preventScroll: true }); // keyboard users tab on from here
  }
  function close() {
    root.classList.remove("is-open");
    document.documentElement.classList.remove("rm-scroll-lock");
    setTimeout(() => {
      root.hidden = true;
      lastFocus?.focus?.({ preventScroll: true });
    }, 280);
  }

  /* ---------- events ---------- */
  root.addEventListener("click", (event) => {
    const t = event.target;
    if (t.closest("[data-rm-close]")) return close();
    if (t.closest("[data-rm-back]")) return setView("main");
    if (t.closest("[data-rm-customize]")) return setView("custom");
    const size = t.closest("[data-rm-size]");
    if (size) {
      draft.size = Math.min(SIZES.length - 1, Math.max(0, draft.size + Number(size.dataset.rmSize)));
      return commit();
    }
    const step = t.closest("[data-rm-step]");
    if (step) {
      draft.size = Number(step.dataset.rmStep);
      return commit();
    }
    const toggle = t.closest("[data-rm-toggle]");
    if (toggle) {
      draft[toggle.dataset.rmToggle] = !draft[toggle.dataset.rmToggle];
      return commit();
    }
    const theme = t.closest("[data-rm-theme]");
    if (theme) {
      draft.theme = theme.dataset.rmTheme;
      draft.font = null; // a theme brings its own font until the reader picks one
      return commit();
    }
    const font = t.closest("[data-rm-font]");
    if (font) {
      draft.font = font.dataset.rmFont;
      return commit();
    }
    if (t.closest("[data-rm-reset]")) {
      draft = { ...DEFAULTS };
      return commit();
    }
  });
  $("[data-rm-line]").addEventListener("input", (e) => {
    draft.line = Number(e.target.value);
    commit();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !root.hidden) close();
  });

  /* ---------- access ---------- */
  // a payment in another tab should greet the reader once they come back
  const unlockToast = {
    pending: false,
    show() {
      this.pending = false;
      const toast = document.createElement("div");
      toast.className = "rm-toast";
      toast.setAttribute("role", "status");
      toast.innerHTML = `${icon("check-circle-fill")}<span><b>Mode Baca aktif.</b> Selamat membaca dengan nyaman!</span>`;
      document.body.append(toast);
      requestAnimationFrame(() => toast.classList.add("is-show"));
      setTimeout(() => {
        toast.classList.remove("is-show");
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    },
  };
  window.addEventListener("entitlement-changed", () => (unlockToast.pending = true));
  if ("BroadcastChannel" in window) new BroadcastChannel("kompas-entitlement").addEventListener("message", () => (unlockToast.pending = true));

  const onEntitlement = (next) => {
    const was = active;
    entitlement = next;
    active = hasFeature(next, "reading_mode");
    if (active) {
      if (!was) {
        // just unlocked (e.g. payment finished in another tab): keep what they tried
        const pending = sessionStorage.getItem(PENDING_KEY) ? load(PENDING_KEY, sessionStorage) : null;
        if (pending) {
          pref = pending;
          save(PREF_KEY, pref);
          sessionStorage.removeItem(PENDING_KEY);
        }
        draft = { ...pref };
      }
      applyVars(article, pref);
      article.classList.add("is-reading");
    } else {
      // never style the article for someone without access
      clearVars(article);
      article.classList.remove("is-reading");
    }
    renderAccess();
    if (!root.hidden) {
      draft = active ? { ...pref } : draft;
      render();
    }
    document.querySelectorAll("[data-rm-open]").forEach((b) => b.classList.toggle("is-plus", active));
    if (active && !was && (window.location.hash === "#mode-baca" || unlockToast.pending)) {
      unlockToast.show();
      if (window.location.hash === "#mode-baca") {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        open();
      }
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
