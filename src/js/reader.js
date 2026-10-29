/**
 * Mode Baca reading view (Figma 11754:28318). Opens over the article page
 * once a reader taps "Terapkan" in the Mode Baca sheet.
 *
 * - Full-bleed photo with the title on black, then the article only: no ads,
 *   no feeds. Text follows the Mode Baca preferences (--rm-* variables set on
 *   the root by reading-mode.js).
 * - Header and bottom bar hide while scrolling down; a tap anywhere toggles
 *   them.
 * - Bottom bar: "Artikel lainnya" (sheet with 20 related articles), previous /
 *   next (also by swiping), Aa (settings sheet) and X (leave, after a
 *   confirmation).
 * - Moving between articles turns the page like a book.
 * - Members see a one-time swipe tutorial the first time they get here.
 */
import { timeAgo } from "./utils/time.js";
import { createPageCurl } from "./utils/page-curl.js";

const TUTORIAL_KEY = "kompas-reader-tutorial-seen";
const RELATED_COUNT = 20;

const icon = (name) => `<i class="rm-ic" style="--ic:url('/assets/reading/${name}.svg')" aria-hidden="true"></i>`;
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** same kanal first, then everything else, newest first */
function relatedTo(id, articles) {
  const start = articles[id];
  return Object.values(articles)
    .filter((a) => a.id !== id)
    .sort((a, b) => {
      const ka = a.kanal === start?.kanal ? 0 : 1;
      const kb = b.kanal === start?.kanal ? 0 : 1;
      return ka - kb || b.published.localeCompare(a.published);
    })
    .slice(0, RELATED_COUNT);
}

async function fetchArticle(id) {
  const res = await fetch(`/data/articles/${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

export function createReader({ articles, currentId, onSettings, onExit }) {
  let open = false;
  let member = false;
  let queue = []; // reading order: the first article, then its related ones
  let index = 0;
  let page = null; // current .rd-page
  let busy = false;

  /* ---------- markup ---------- */
  const root = document.createElement("div");
  root.className = "rd";
  root.hidden = true;
  root.innerHTML = `
    <div class="rd__stage" data-rd-stage></div>
    <header class="rd-top" data-rd-top></header>
    <nav class="rd-nav" aria-label="Navigasi Mode Baca" data-rd-nav>
      <div class="rd-nav__group">
        <button class="rd-pill" type="button" data-rd-list>Artikel lainnya</button>
        <button class="rd-ibtn" type="button" data-rd-prev aria-label="Artikel sebelumnya">${icon("caret-left")}</button>
        <button class="rd-ibtn rd-ibtn--next" type="button" data-rd-next aria-label="Artikel berikutnya">${icon("caret-left")}</button>
      </div>
      <div class="rd-nav__group">
        <button class="rd-ibtn rd-ibtn--aa" type="button" data-rd-settings aria-label="Pengaturan Mode Baca">${icon("text-aa-kompas")}</button>
        <button class="rd-ibtn" type="button" data-rd-exit aria-label="Keluar dari Mode Baca">${icon("x")}</button>
      </div>
    </nav>`;
  document.body.append(root);
  const stage = root.querySelector("[data-rd-stage]");
  const top = root.querySelector("[data-rd-top]");

  // header: the site header bar, over the photo
  const bar = document.querySelector(".hm-header .hm-bar");
  if (bar) top.append(bar.cloneNode(true));
  const logo = top.querySelector(".hm-logo");

  /* ---------- "Artikel lainnya" sheet ---------- */
  const list = document.createElement("div");
  list.className = "rm rd-list";
  list.hidden = true;
  list.dataset.theme = "light";
  list.innerHTML = `
    <div class="rm__backdrop" data-rd-list-close></div>
    <section class="rm__sheet" role="dialog" aria-modal="true" aria-labelledby="rd-list-title" tabindex="-1">
      <div class="rm__top">
        <button class="rm__grab" type="button" data-rd-list-close aria-label="Tutup daftar artikel"></button>
        <header class="rm__head">
          <h2 class="rm__title" id="rd-list-title">Artikel lainnya</h2>
          <button class="rm-iconbtn" type="button" data-rd-list-close aria-label="Tutup">${icon("x")}</button>
        </header>
      </div>
      <div class="rm__body rd-list__body"><ul class="lcards" data-rd-list-items></ul></div>
    </section>`;
  document.body.append(list);

  /* ---------- leave confirmation ---------- */
  const confirmBox = document.createElement("div");
  confirmBox.className = "rd-confirm";
  confirmBox.hidden = true;
  confirmBox.dataset.theme = "light";
  confirmBox.innerHTML = `
    <div class="rd-confirm__backdrop" data-rd-confirm-cancel></div>
    <section class="rd-confirm__card" role="alertdialog" aria-modal="true" aria-labelledby="rd-confirm-title" aria-describedby="rd-confirm-text">
      <h2 id="rd-confirm-title">Tutup Mode Baca?</h2>
      <p id="rd-confirm-text">Artikel akan kembali ke tampilan biasa. Pengaturan baca kamu tetap tersimpan.</p>
      <div class="rd-confirm__actions">
        <button class="rd-btn rd-btn--outline" type="button" data-rd-confirm-cancel>Batal</button>
        <button class="rd-btn rd-btn--primary" type="button" data-rd-confirm-ok>Ya, tutup</button>
      </div>
    </section>`;
  document.body.append(confirmBox);

  /* ---------- swipe tutorial ---------- */
  const tutorial = document.createElement("div");
  tutorial.className = "rd-tut";
  tutorial.hidden = true;
  tutorial.innerHTML = `
    <section class="rd-tut__card" role="dialog" aria-modal="true" aria-labelledby="rd-tut-title">
      <div class="rd-tut__demo" aria-hidden="true">
        <span class="rd-tut__sheet rd-tut__sheet--under"></span>
        <span class="rd-tut__sheet rd-tut__sheet--top"><i></i><i></i><i></i><i></i></span>
        <span class="rd-tut__finger"></span>
      </div>
      <h2 id="rd-tut-title">Geser untuk pindah artikel</h2>
      <p>Geser ke <b>kiri</b> untuk artikel berikutnya, ke <b>kanan</b> untuk kembali. Ketuk di mana saja untuk memunculkan menu.</p>
      <button class="rd-btn rd-btn--primary" type="button" data-rd-tut-ok>Mengerti</button>
    </section>`;
  document.body.append(tutorial);

  /* ---------- rendering ---------- */
  const reactRow = document.querySelector(".art-react:not(.art-react--end)");
  const endRow = document.querySelector(".art-react--end");
  const comments = document.querySelector(".art-comments");

  // the reading view keeps to the story: no "Baca juga" links, whether they
  // are their own block or tucked into a paragraph (e.g. after a photo caption)
  const BACA_JUGA = /\s*Baca juga\s*:\s*(<a\b[^>]*>[\s\S]*?<\/a>)?[^<]*/gi;
  function bodyHtml(blocks) {
    return blocks
      .filter((b) => b.type === "p")
      .map((b) => b.html.replace(BACA_JUGA, ""))
      .filter((html) => html.replace(/<[^>]+>/g, "").trim())
      .map((html) => `<p>${html}</p>`)
      .join("");
  }

  function buildPage(article) {
    const editors = article.editors.length ? article.editors : ["Tim Redaksi"];
    const el = document.createElement("article");
    el.className = "rd-page";
    el.dataset.id = article.id;
    el.innerHTML = `
      <header class="rd-hero">
        <img class="rd-hero__img" src="${esc(article.photo.src)}" alt="${esc(article.photo.alt || "")}" />
        <div class="rd-hero__text">
          <h1 class="rd-hero__title">${esc(article.title)}</h1>
          <p class="rd-hero__meta"><b>Kompas.com</b><span>${esc(article.date)}</span></p>
          <div class="rd-hero__team">
            <span class="rd-hero__avatars">${editors
              .slice(0, 2)
              .map((n) => `<span>${esc(initials(n))}</span>`)
              .join("")}</span>
            <span class="rd-hero__names"><strong>${esc(editors.join(", "))}</strong><small>Tim Redaksi</small></span>
          </div>
        </div>
      </header>
      <div class="rd-paper">
        <div class="rd-paper__react"></div>
        <div class="rd-body">${bodyHtml(article.blocks)}</div>
        <hr class="rd-paper__rule" />
        <div class="rd-paper__end"></div>
      </div>`;
    if (reactRow) el.querySelector(".rd-paper__react").replaceWith(reactRow.cloneNode(true));
    const end = el.querySelector(".rd-paper__end");
    if (endRow) end.append(endRow.cloneNode(true));
    if (comments) {
      const c = comments.cloneNode(true);
      c.removeAttribute("id");
      end.append(c);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return el;
  }

  function renderNav() {
    root.querySelector("[data-rd-prev]").disabled = index === 0;
    root.querySelector("[data-rd-next]").disabled = index >= queue.length - 1;
  }

  /* ---------- chrome: hide on scroll down, tap to toggle ---------- */
  let lastTop = 0;
  function setChrome(show) {
    root.classList.toggle("is-chrome-hidden", !show);
  }
  function onScroll(event) {
    const y = event.target.scrollTop;
    const hero = event.target.querySelector(".rd-hero");
    top.classList.toggle("is-solid", y > hero.offsetHeight - 60);
    if (y < 40) setChrome(true);
    else if (y > lastTop + 4) setChrome(false);
    lastTop = y;
  }
  stage.addEventListener("click", (event) => {
    const t = event.target;
    const toggle = t.closest("[data-like], [data-save]");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(toggle.getAttribute("aria-pressed") !== "true"));
      return;
    }
    if (t.closest("a, button, input, label")) return;
    setChrome(root.classList.contains("is-chrome-hidden"));
  });

  /* ---------- turning pages (paper page-curl, see utils/page-curl.js) ---------- */
  const curl = createPageCurl(stage);
  const cache = new Map(); // article id → Promise<article>
  function loadArticle(id) {
    if (!cache.has(id)) cache.set(id, fetchArticle(id).catch((err) => (cache.delete(id), Promise.reject(err))));
    return cache.get(id);
  }
  // the neighbours are usually ready before a swipe starts
  const prefetch = () => [index - 1, index + 1].forEach((i) => queue[i] && loadArticle(queue[i]).catch(() => {}));

  function setBusy(on) {
    busy = on;
    root.classList.toggle("is-busy", on);
  }
  function commit(nextIndex, article, el) {
    index = nextIndex;
    page = el;
    lastTop = 0;
    history.replaceState(null, "", `${window.location.pathname}?id=${encodeURIComponent(article.id)}`);
    document.title = `${article.title} - Kompas.com`;
    renderNav();
    setChrome(true);
    top.classList.remove("is-solid");
    prefetch();
  }
  /** fully turned to the left / flat, for a page edge held at height y */
  const turned = (y) => ({ x: -curl.size().w, y });
  const edge = (y) => ({ x: curl.size().w, y });

  /** buttons, keyboard and the article list: an automatic turn */
  async function turnTo(nextIndex, direction) {
    if (busy || nextIndex < 0 || nextIndex >= queue.length) return;
    setBusy(true);
    let article;
    try {
      article = await loadArticle(queue[nextIndex]);
    } catch {
      setBusy(false);
      return;
    }
    const incoming = buildPage(article);
    const outgoing = page;
    if (!outgoing || reducedMotion()) {
      stage.replaceChildren(incoming);
    } else {
      // lifted near the bottom corner, so the fold runs diagonally
      const { h } = curl.size();
      const C = edge(h * 0.86);
      if (direction === "next") {
        stage.prepend(incoming); // the next page waits underneath
        await curl.run(outgoing, C, C, turned(h * 0.7), 680, h * 0.08);
        outgoing.remove();
      } else {
        stage.append(incoming); // the previous page comes back over it
        curl.paint(incoming, C, turned(h * 0.7));
        await curl.run(incoming, C, turned(h * 0.7), C, 680, h * 0.08);
        outgoing.remove();
      }
      curl.clear(incoming);
    }
    commit(nextIndex, article, incoming);
    setBusy(false);
  }

  /* ---------- swipe: the page follows the finger ---------- */
  let drag = null;
  /** inside something that scrolls sideways itself (the reaction row)? then a
   *  horizontal swipe belongs to it, not to turning the page */
  function inSideScroller(el) {
    for (let n = el; n && n !== stage; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true;
    }
    return false;
  }
  stage.addEventListener(
    "touchstart",
    (e) => {
      if (busy || e.touches.length !== 1 || inSideScroller(e.target)) return;
      const t = e.touches[0];
      drag = { x0: t.clientX, y0: t.clientY, decided: false, samples: [] };
    },
    { passive: true },
  );
  stage.addEventListener(
    "touchmove",
    (e) => {
      if (!drag) return;
      const t = e.touches[0];
      const dx = t.clientX - drag.x0;
      const dy = t.clientY - drag.y0;
      if (!drag.decided) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.2) {
          drag = null; // vertical: let the page scroll
          return;
        }
        startDrag(dx < 0 ? "next" : "prev");
        if (!drag) return;
      }
      e.preventDefault();
      drag.samples.push({ x: t.clientX, t: performance.now() });
      if (drag.samples.length > 6) drag.samples.shift();
      drag.P = fingerToEdge(dx, dy);
      if (drag.ready) curl.paint(drag.sheet, drag.C, drag.P);
    },
    { passive: false },
  );
  stage.addEventListener("touchend", endDrag);
  stage.addEventListener("touchcancel", endDrag);

  function startDrag(direction) {
    const nextIndex = direction === "next" ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= queue.length || !page) {
      drag = null;
      return;
    }
    const d = drag;
    const { h } = curl.size();
    // the edge is held at the finger's height, pushed towards the nearer corner
    const cy = Math.min(h, Math.max(0, d.y0 + (d.y0 - h / 2) * 0.6));
    Object.assign(d, { decided: true, direction, nextIndex, C: edge(cy), P: direction === "next" ? edge(cy) : turned(cy) });
    setBusy(true);
    d.prep = loadArticle(queue[nextIndex]).then((article) => {
      const el = buildPage(article);
      if (direction === "next") stage.prepend(el); // waits underneath
      else stage.append(el); // comes back over the current page
      Object.assign(d, { article, el, sheet: direction === "next" ? page : el, under: direction === "next" ? el : page, ready: true });
      curl.paint(d.sheet, d.C, d.P);
    });
    d.prep.catch(() => {
      if (drag === d) drag = null;
      setBusy(false);
    });
  }

  /** finger travel → where the page edge is: twice the travel, like a real sheet */
  function fingerToEdge(dx, dy) {
    const { w } = curl.size();
    const x = drag.direction === "next" ? w + 2 * dx : -w + 2 * dx;
    return { x: Math.min(w, Math.max(-w, x)), y: drag.C.y + dy * 0.6 };
  }

  async function endDrag() {
    const d = drag;
    drag = null;
    if (!d?.decided) return;
    try {
      await d.prep;
    } catch {
      return;
    }
    const { w } = curl.size();
    const s = d.samples;
    const v = s.length > 1 ? (s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t) : 0; // px/ms
    const turnedPart = d.direction === "next" ? (w - d.P.x) / (2 * w) : (d.P.x + w) / (2 * w);
    const flick = d.direction === "next" ? v < -0.45 : v > 0.45;
    const complete = turnedPart > 0.3 || flick;
    const target =
      d.direction === "next" ? (complete ? turned(d.P.y) : d.C) : complete ? d.C : turned(d.P.y);
    const dist = Math.abs(target.x - d.P.x);
    await curl.run(d.sheet, d.C, d.P, target, Math.max(180, Math.min(460, dist * 0.45)));
    if (complete) {
      (d.direction === "next" ? d.sheet : d.under).remove();
      curl.clear(d.el);
      commit(d.nextIndex, d.article, d.el);
    } else {
      curl.clear(d.sheet);
      d.el.remove();
    }
    setBusy(false);
  }

  const next = () => turnTo(index + 1, "next");
  const prev = () => turnTo(index - 1, "prev");
  function goTo(id) {
    let at = queue.indexOf(id);
    if (at === -1) {
      queue.splice(index + 1, 0, id); // not in the list: read it next
      at = index + 1;
    }
    turnTo(at, at < index ? "prev" : "next");
  }

  /* ---------- related list ---------- */
  function renderList() {
    const items = queue.slice(1).map((id) => articles[id]);
    list.querySelector("[data-rd-list-items]").innerHTML = items
      .map(
        (a) => `
        <li>
          <a class="lcard${a.id === queue[index] ? " is-current" : ""}" href="./article-detail.html?id=${a.id}" data-rd-open="${a.id}">
            <img class="lcard__img" src="${esc(a.img)}" alt="" loading="lazy" />
            <span class="lcard__body">
              <span class="lcard__kanal">${esc(a.kanal)}</span>
              <strong class="lcard__title">${esc(a.title)}</strong>
              <span class="lcard__meta"><span>${timeAgo(a.published)}</span>${a.readTime ? `<span>${esc(a.readTime)}</span>` : ""}</span>
            </span>
          </a>
        </li>`,
      )
      .join("");
  }
  function showLayer(el) {
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-open"));
    el.querySelector("[tabindex='-1'], [role='alertdialog'], [role='dialog']")?.focus?.({ preventScroll: true });
  }
  function hideLayer(el) {
    el.classList.remove("is-open");
    setTimeout(() => (el.hidden = true), 280);
  }
  list.addEventListener("click", (event) => {
    if (event.target.closest("[data-rd-list-close]")) return hideLayer(list);
    const item = event.target.closest("[data-rd-open]");
    if (!item) return;
    event.preventDefault();
    hideLayer(list);
    goTo(item.dataset.rdOpen);
  });

  /* ---------- bottom bar ---------- */
  root.addEventListener("click", (event) => {
    const t = event.target;
    if (t.closest("[data-rd-list]")) {
      renderList();
      return showLayer(list);
    }
    if (t.closest("[data-rd-prev]")) return prev();
    if (t.closest("[data-rd-next]")) return next();
    if (t.closest("[data-rd-settings]")) return onSettings();
    if (t.closest("[data-rd-exit]")) return showLayer(confirmBox);
  });
  confirmBox.addEventListener("click", (event) => {
    if (event.target.closest("[data-rd-confirm-cancel]")) return hideLayer(confirmBox);
    if (event.target.closest("[data-rd-confirm-ok]")) {
      hideLayer(confirmBox);
      onExit();
    }
  });
  tutorial.addEventListener("click", (event) => {
    if (!event.target.closest("[data-rd-tut-ok]")) return;
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      /* ignore */
    }
    hideLayer(tutorial);
  });
  document.addEventListener("keydown", (e) => {
    if (!open || !list.hidden || !confirmBox.hidden || !tutorial.hidden) return;
    if (e.target.closest?.("input, textarea")) return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  function maybeTutorial() {
    let seen = false;
    try {
      seen = localStorage.getItem(TUTORIAL_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (member && !seen) setTimeout(() => open && showLayer(tutorial), 500);
  }

  /* ---------- public ---------- */
  return {
    root,
    get isOpen() {
      return open;
    },
    /** open (or restyle) the reading view; `isMember` picks logo + tutorial */
    async show({ isMember, dark }) {
      member = isMember;
      root.dataset.theme = dark ? "dark" : "light";
      if (logo) {
        logo.src = isMember ? "/assets/kplus/logo-kompascom-plus.svg" : "/assets/home/logo-kompas.svg";
        logo.classList.toggle("hm-logo--plus", isMember);
      }
      if (open) return;
      open = true;
      const id = currentId();
      queue = [id, ...relatedTo(id, articles).map((a) => a.id)];
      index = 0;
      page = null;
      root.hidden = false;
      document.documentElement.classList.add("rd-open");
      await turnTo(0);
      requestAnimationFrame(() => root.classList.add("is-open"));
      maybeTutorial();
    },
    hide() {
      if (!open) return;
      open = false;
      root.classList.remove("is-open");
      document.documentElement.classList.remove("rd-open");
      [list, confirmBox, tutorial].forEach((el) => (el.hidden = true));
      const shownId = page?.dataset.id;
      setTimeout(() => {
        root.hidden = true;
        stage.replaceChildren();
        page = null;
        // the article page underneath still shows the first article
        if (shownId && shownId !== queue[0]) window.location.reload();
      }, 280);
    },
  };
}
