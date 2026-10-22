/**
 * Article page — "Read - Mobile" (Figma 664:18534). Loads the article picked
 * on the home page (?id=<kompas id>) from the kompas.com snapshot in
 * /data/articles/<id>.json and lays its paragraphs out with the in-article
 * inserts from the design (ad slot, KG Now video, half-page ad, polling,
 * MREC ad, "preferred source on Google").
 */
import "../styles/components/site-header.css";
import "../styles/pages/home.css";
import "../styles/pages/article.css";
import home from "../data/kompas-home.json";
import { initHeaderAvatar } from "./site-header.js";

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

function renderBody(blocks) {
  const out = [];
  let paragraphs = 0;
  const pending = [...INSERTS];
  for (const block of blocks) {
    if (block.type === "baca") {
      out.push(bacaJuga(block));
      continue;
    }
    out.push(`<p>${block.html}</p>`);
    paragraphs += 1;
    while (pending.length && pending[0].after === paragraphs) out.push(pending.shift().html);
  }
  out.push(GOOGLE_SOURCE);
  return out.join("\n");
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

  $("[data-art-body]").innerHTML = renderBody(article.blocks);
}

/* ---------- Interactions ---------- */
function initActions() {
  $("[data-see-photo]").addEventListener("click", () => {
    const caption = $("[data-art-caption]");
    caption.hidden = !caption.hidden;
  });

  const like = $("[data-like]");
  like.addEventListener("click", () => {
    const on = like.getAttribute("aria-pressed") !== "true";
    like.setAttribute("aria-pressed", String(on));
  });

  const save = $("[data-save]");
  save.addEventListener("click", () => save.setAttribute("aria-pressed", String(save.getAttribute("aria-pressed") !== "true")));

  $("[data-share]").addEventListener("click", async () => {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* dismissed */
    }
  });

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
