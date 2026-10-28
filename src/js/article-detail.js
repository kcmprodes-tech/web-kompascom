/**
 * Article page — "Read - Mobile" (Figma 664:18534). Loads the article picked
 * on the home page (?id=<kompas id>) from the kompas.com snapshot in
 * /data/articles/<id>.json and lays its paragraphs out with the in-article
 * inserts from the design (ad slot, KG Now video, half-page ad, polling,
 * MREC ad, "preferred source on Google").
 */
import "../styles/tokens/kds-tokens.css";
import "../styles/components/site-header.css";
import "../styles/pages/home.css";
import "../styles/pages/article.css";
import "../styles/components/reading-mode.css";
import home from "../data/kompas-home.json";
import { initHeaderAvatar } from "./site-header.js";
import { initReadingMode } from "./reading-mode.js";
import { watchEntitlement, hasFeature } from "./utils/entitlement.js";
import { refreshTimes, timeAgo } from "./utils/time.js";

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** "Idon Tanjung" → "IT" */
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/* ---------- In-article inserts (placed after the n-th paragraph) ---------- */
const AD_NOTE = `<p class="art-ad__note">Baca berita tanpa iklan. <a href="./membership.html">Gabung Kompas.com+</a></p>`;

const INSERTS = [
  { after: 1, html: `<aside class="art-adslot" aria-label="Iklan"><span></span></aside>` },
  {
    after: 3,
    html: `
      <a class="art-video" href="#">
        <span class="art-video__media">
          <img src="/assets/article/video.jpg" alt="" />
          <span class="art-video__bar">
            <span class="art-video__mute"><img src="/assets/article/mute.svg" alt="" aria-hidden="true" />Tap to unmute</span>
            <span class="art-video__len">1:04:19</span>
          </span>
        </span>
        <span class="art-video__title">[BEGINU]: Dian Sastrowardoyo, Jinakkan Masa Remaja yang Sulit dan Rumit Dengan Masuk ke Dunia Hiburan</span>
      </a>`,
  },
  {
    after: 4,
    html: `
      <aside class="art-ad art-ad--halfpage" aria-label="Iklan">
        <p class="art-ad__label">Iklan - Scroll ke bawah untuk melanjutkan</p>
        <img src="/assets/article/ad-halfpage.jpg" width="300" height="600" alt="Iklan" />
        ${AD_NOTE}
      </aside>`,
  },
  {
    after: 9,
    html: `
      <section class="art-poll" data-poll aria-label="Polling">
        <div class="art-poll__top">
          <img class="art-poll__logo" src="/assets/article/poll-logo.svg" alt="KOMPAS.com" />
          <span class="art-poll__stat"><img src="/assets/article/poll-users.svg" alt="" aria-hidden="true" /><span data-poll-total>2.1K pemilih</span><i></i>2 hari lagi</span>
        </div>
        <div class="art-poll__q">
          <p>Jika kamu pesan makanan. Kamu pilih makanan asin, manis atau pedas?</p>
          <img src="/assets/article/poll-emoji.png" alt="" aria-hidden="true" />
        </div>
        <div class="art-poll__opts">
          ${[
            ["Manis", 50],
            ["Asin", 22],
            ["Warisan Mertua", 9],
            ["Pedas", 19],
          ]
            .map(
              ([label, pct]) =>
                `<button class="art-poll__opt" type="button" data-pct="${pct}"><span class="art-poll__bar"></span><span class="art-poll__ic"></span><span class="art-poll__txt">${label}</span><span class="art-poll__pct">${pct}%</span></button>`,
            )
            .join("")}
          <p class="art-poll__note">Dengan mengikuti polling, kamu menyetujui <a href="https://www.kgmedia.id/legal-privacy-id" target="_blank" rel="noopener">Kebijakan Data Pribadi KG Media.</a></p>
        </div>
      </section>`,
  },
  {
    after: 11,
    html: `
      <aside class="art-ad art-ad--mrec" aria-label="Iklan">
        <p class="art-ad__label">Iklan - Scroll ke bawah untuk melanjutkan</p>
        <img src="/assets/article/ad-mrec.jpg" width="300" height="250" alt="Iklan" />
        ${AD_NOTE}
      </aside>`,
  },
];

const GOOGLE_SOURCE = `
  <a class="art-gsrc" href="https://www.google.com/preferences/source?q=kompas.com" target="_blank" rel="noopener">
    <img src="/assets/article/google.svg" alt="" aria-hidden="true" />
    <span>Add KOMPAS.com as preferred source on Google</span>
    <i><img src="/assets/article/plus.svg" alt="" aria-hidden="true" /></i>
  </a>`;

function bacaJuga(block) {
  const known = block.id && home.articles[block.id];
  const href = known ? `./article-detail.html?id=${block.id}` : block.url || "#";
  return `<p class="art-baca"><b>Baca juga: </b><a href="${esc(href)}">${esc(block.title)}</a></p>`;
}

/** Splits the body into up to 3 pages (like kompas.com's ?page=n) and renders
 *  every unit tagged with its page; inserts keep their global position. */
function renderBody(blocks) {
  const total = blocks.filter((b) => b.type === "p").length;
  const pageCount = total >= 9 ? 3 : total >= 6 ? 2 : 1;
  const perPage = Math.ceil(total / pageCount);
  const out = [];
  let paragraphs = 0;
  const pending = [...INSERTS];
  for (const block of blocks) {
    const page = Math.min(pageCount, Math.floor(Math.max(paragraphs - (block.type === "p" ? 0 : 1), 0) / perPage) + 1);
    if (block.type === "baca") {
      out.push(unit(bacaJuga(block), page));
      continue;
    }
    out.push(unit(`<p>${block.html}</p>`, page));
    paragraphs += 1;
    while (pending.length && pending[0].after === paragraphs) out.push(unit(pending.shift().html, page));
  }
  out.push(GOOGLE_SOURCE);
  return { html: out.join("\n"), pageCount };
}

/** tag the first element of an HTML snippet with data-page */
function unit(html, page) {
  return html.replace(/^(\s*<[a-z]+)/i, `$1 data-page="${page}"`);
}

/** page switcher, kept so members get the whole article on one page */
const pager = { show: null, member: false };

function initPages(pageCount) {
  if (pageCount < 2) return;
  const wrap = $("[data-art-pages]");
  const list = $("[data-art-pages-list]");
  const labels = [...Array.from({ length: pageCount }, (_, i) => String(i + 1)), "Show all"];
  list.innerHTML = labels
    .map((l, i) => `<button type="button" class="${i ? "" : "is-current"}${l === "Show all" ? " art-pages__all" : ""}" data-p="${l === "Show all" ? "all" : l}">${l}</button>`)
    .join("");

  pager.show = (p) => {
    document.querySelectorAll("[data-art-body] [data-page]").forEach((el) => {
      el.hidden = p !== "all" && el.dataset.page !== p;
    });
    list.querySelectorAll("button").forEach((b) => b.classList.toggle("is-current", b.dataset.p === p));
  };
  list.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    pager.show(btn.dataset.p);
    $("[data-art-body]").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  syncPages();
}

function syncPages() {
  if (!pager.show) return;
  $("[data-art-pages]").hidden = pager.member;
  pager.show(pager.member ? "all" : "1");
}

/* ---------- Page ---------- */
function crumbs(article) {
  const sub = (article.url.match(/^https:\/\/([a-z0-9]+)\.kompas\.com/) || [])[1] || "";
  const subLabel = sub ? sub[0].toUpperCase() + sub.slice(1) : "";
  const items = [article.kanal];
  if (subLabel && subLabel.toLowerCase() !== article.kanal.toLowerCase()) items.push(subLabel);
  return items;
}

function render(article) {
  document.title = `${article.title} - Kompas.com`;

  const crumb = $("[data-art-crumb]");
  crumbs(article).forEach((label, i, all) => {
    const el = document.createElement(i === all.length - 1 ? "span" : "a");
    el.textContent = label;
    if (el.tagName === "A") el.href = "./index.html";
    crumb.append(el);
  });

  $("[data-art-title]").textContent = article.title;
  $("[data-art-date]").textContent = article.date;

  const editors = article.editors.length ? article.editors : ["Tim Redaksi"];
  $("[data-art-editors]").textContent = editors.join(", ");
  $("[data-art-avatars]").innerHTML = editors
    .slice(0, 2)
    .map((name) => `<span>${esc(initials(name))}</span>`)
    .join("");

  const photo = $("[data-art-photo]");
  photo.src = article.photo.src;
  photo.alt = article.photo.alt;
  const caption = $("[data-art-caption]");
  caption.innerHTML = `${esc(article.photo.caption)}${article.photo.credit ? ` <small>${esc(article.photo.credit)}</small>` : ""}`;

  const shots = [article.photo, ...(article.gallery || [])];
  if (shots.length > 1) {
    const thumbs = $("[data-art-thumbs]");
    thumbs.hidden = false;
    thumbs.innerHTML = shots
      .map((p, i) => `<button type="button" class="${i === 0 ? "is-active" : ""}" data-i="${i}"><img src="${p.src}" alt="" /></button>`)
      .join("");
    thumbs.addEventListener("click", (event) => {
      const btn = event.target.closest("button");
      if (!btn) return;
      const p = shots[Number(btn.dataset.i)];
      photo.src = p.src;
      photo.alt = p.alt;
      caption.innerHTML = `${esc(p.caption)}${p.credit ? ` <small>${esc(p.credit)}</small>` : ""}`;
      thumbs.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  }

  const body = renderBody(article.blocks);
  $("[data-art-body]").innerHTML = body.html;
  initPages(body.pageCount);

  renderTags(article.tags || []);
  $("[data-art-kanal-more]").textContent = `Lihat ${article.kanal} selengkapnya`;

  renderFeed(article.id);
}

function renderTags(tags) {
  const wrap = $("[data-art-tags-wrap]");
  if (!tags.length) {
    wrap.hidden = true;
    return;
  }
  $("[data-art-tags]").innerHTML = tags.map((t) => `<a href="#">${esc(t)}</a>`).join("");
  const list = $("[data-art-tags]");
  const more = $("[data-art-tags-more]");
  requestAnimationFrame(() => {
    if (list.scrollHeight > list.clientHeight + 1) {
      wrap.classList.add("is-clipped");
      more.hidden = false;
    }
  });
  more.addEventListener("click", () => {
    wrap.classList.remove("is-clipped");
    wrap.classList.add("is-open");
    more.hidden = true;
  });
}

/* ---------- Recommendation feed (other articles from the snapshot) ---------- */
function renderFeed(currentId) {
  const A = home.articles;
  const order = [...new Set([...home.terkini, ...home.indeks, ...home.headline, ...home.sorotan])];
  const pool = order.filter((id) => A[id] && id !== currentId).map((id) => A[id]);
  let i = 0;
  const next = () => pool[i++ % pool.length];
  const href = (a) => `./article-detail.html?id=${a.id}`;

  const big = next();
  const bigEl = $("[data-feed-big]");
  bigEl.href = href(big);
  bigEl.querySelector("img").src = big.img;
  bigEl.querySelector(".art-big__title").textContent = big.title;
  bigEl.querySelector(".art-big__kanal").textContent = big.kanal;

  document.querySelectorAll("[data-feed-row]").forEach((row) => {
    row.innerHTML = [next(), next()]
      .map(
        (a) => `
        <a class="art-card" href="${href(a)}">
          <img class="art-card__img" src="${a.img}" alt="" loading="lazy" />
          <span class="art-card__title">${esc(a.title)}</span>
          <span class="art-card__foot"><span>${esc(a.kanal)}</span><img src="/assets/article/dots.svg" alt="" aria-hidden="true" /></span>
        </a>`,
      )
      .join("");
  });

  const popular = [...home.terpopuler.filter((id) => A[id] && id !== currentId).map((id) => A[id])];
  while (popular.length < 5) popular.push(next());
  $("[data-feed-pop]").innerHTML = popular
    .slice(0, 5)
    .map(
      (a, n) => `
      <li>
        <a class="lcard" href="${href(a)}">
          <span class="art-rankthumb"><img class="lcard__img" src="${a.img}" alt="" loading="lazy" /><b>${n + 1}</b></span>
          <span class="lcard__body">
            <strong class="lcard__title">${esc(a.title)}</strong>
            <span class="art-pop__foot"><span>${esc(a.kanal)}</span><img src="/assets/article/dots.svg" alt="" aria-hidden="true" /></span>
          </span>
        </a>
      </li>`,
    )
    .join("");

  $("[data-feed-terkini]").innerHTML = Array.from({ length: 10 }, next)
    .map(
      (a) => `
      <li>
        <a class="lcard" href="${href(a)}">
          <img class="lcard__img" src="${a.img}" alt="" loading="lazy" />
          <span class="lcard__body">
            <span class="lcard__kanal">${esc(a.kanal)}</span>
            <strong class="lcard__title">${esc(a.title)}</strong>
            <span class="lcard__meta"><span data-time="${a.published}">${timeAgo(a.published)}</span>${a.readTime ? `<span>${esc(a.readTime)}</span>` : ""}</span>
          </span>
        </a>
      </li>`,
    )
    .join("");
  refreshTimes();
}

/* ---------- Interactions ---------- */
function initActions() {
  $("[data-see-photo]").addEventListener("click", () => {
    const caption = $("[data-art-caption]");
    caption.hidden = !caption.hidden;
  });

  const toggle = (el) => el.setAttribute("aria-pressed", String(el.getAttribute("aria-pressed") !== "true"));
  document.querySelectorAll("[data-like], [data-save]").forEach((el) => el.addEventListener("click", () => toggle(el)));

  document.querySelectorAll("[data-share]").forEach((el) =>
    el.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: window.location.href });
        else await navigator.clipboard.writeText(window.location.href);
      } catch {
        /* dismissed */
      }
    }),
  );

  // Polling: one vote, then reveal the result bars
  document.addEventListener("click", (event) => {
    const opt = event.target.closest(".art-poll__opt");
    if (!opt) return;
    const poll = opt.closest("[data-poll]");
    if (poll.classList.contains("is-voted")) return;
    poll.classList.add("is-voted");
    opt.classList.add("is-picked");
    poll.querySelectorAll(".art-poll__opt").forEach((o) => {
      o.querySelector(".art-poll__bar").style.width = `${o.dataset.pct}%`;
    });
  });
}

async function load() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || home.headline[0];
  try {
    const res = await fetch(`/data/articles/${encodeURIComponent(id)}.json`);
    if (!res.ok) throw new Error(res.status);
    render(await res.json());
  } catch {
    // unknown id → fall back to today's headline
    if (id !== home.headline[0]) window.location.replace(`./article-detail.html?id=${home.headline[0]}`);
  }
}

initHeaderAvatar();
initActions();
load();

/* ---------- Reading Mode (KOMPAS.com+) ---------- */
initReadingMode({
  article: document.querySelector("[data-art]"),
  // after checkout the reader lands back here with the panel open
  returnUrl: () => `${window.location.pathname}${window.location.search}#mode-baca`,
});

/* ---------- KOMPAS.com+ member view (Figma 11781:34935) ----------
   Active subscribers get the KOMPAS.com+ logo, no ads, no polling and the
   whole article on one page. The floating "Aa" is for subscribers only. */
const logo = document.querySelector(".hm-logo");
const fab = document.querySelector("[data-rm-fab]");
let fabAllowed = false;
let bodyInView = false;
const paintFab = () => fab.classList.toggle("is-visible", fabAllowed && bodyInView);

watchEntitlement((ent) => {
  const member = ent.status === "active";
  document.documentElement.classList.toggle("is-member", member);
  logo.src = member ? "/assets/kplus/logo-kompascom-plus.svg" : "/assets/home/logo-kompas.svg";
  logo.alt = member ? "KOMPAS.com+" : "Kompas.com";
  logo.classList.toggle("hm-logo--plus", member);
  pager.member = member;
  syncPages();
  fabAllowed = hasFeature(ent, "reading_mode");
  fab.hidden = !fabAllowed;
  paintFab();
});

// floating "Aa" shows while the article body is on screen
new IntersectionObserver(
  ([entry]) => {
    bodyInView = entry.isIntersecting;
    paintFab();
  },
  { rootMargin: "0px 0px -40% 0px" },
).observe(document.querySelector("[data-art-body]"));
