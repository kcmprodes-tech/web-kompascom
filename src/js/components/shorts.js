/**
 * Short Trending — the vertical video ("Rolls") rail and full-screen player,
 * ported from the KOMPAS.com iOS app (app-kompas: Features/Rolls,
 * ShortVideoCard). Videos are the live video.kompas.com/rolls HLS streams.
 *
 * Rail: 220×391 cards with no text; only one card plays a muted 6-second
 * preview at a time, taking turns between the two front cards.
 * Player: one video per screen, swipe up/down (endless), tap to pause, tap
 * the caption to expand it, Suka / Komentar / Simpan / Bagikan / Opsi /
 * Suara on the right, and a thin progress bar you can scrub. Komentar
 * shrinks the video to the top and slides the comment panel up.
 *
 * Safari plays HLS natively. Elsewhere hls.js is loaded from cdnjs and reads
 * the streams through /kgnow (Vite proxy in dev, Vercel rewrite in prod),
 * since video.kgnow.com sends no CORS headers.
 */
import rolls from "../../data/rolls.json";

const HLS_JS = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.20/hls.min.js";
const PREVIEW_SECONDS = 6;
const SMALL_VIDEO_W = 180; // video width while the comment panel is open

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name, extra = "") => `<i class="rl-ic ${extra}" style="--ic:url('/assets/rolls/${name}.svg')" aria-hidden="true"></i>`;
const timeStr = (t) => {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ---------- HLS ---------- */
const nativeHls = (() => {
  const v = document.createElement("video");
  return !!v.canPlayType("application/vnd.apple.mpegurl");
})();
let hlsLib = null;
function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  hlsLib ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = HLS_JS;
    s.onload = () => resolve(window.Hls);
    s.onerror = reject;
    document.head.append(s);
  });
  return hlsLib;
}
const proxied = (url) => url.replace(/^https:\/\/video\.kgnow\.com/, "/kgnow");

/** Points `video` at an HLS stream; returns a function that detaches it. */
function attachStream(video, url, { preview = false } = {}) {
  let hls = null;
  let gone = false;
  if (nativeHls) {
    video.src = url;
  } else {
    loadHls()
      .then((Hls) => {
        if (gone || !Hls?.isSupported()) return;
        hls = new Hls({ capLevelToPlayerSize: true, startLevel: preview ? 0 : -1, maxBufferLength: preview ? 8 : 30 });
        hls.loadSource(proxied(url));
        hls.attachMedia(video);
      })
      .catch(() => {});
  }
  return () => {
    gone = true;
    hls?.destroy();
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
}

/* ================= Rail ================= */
export function initShorts(section) {
  if (!section) return;
  const items = rolls.items;
  const rail = section.querySelector("[data-shorts-rail]");
  rail.innerHTML = items
    .map(
      (it, i) => `
      <button class="rl-card" type="button" data-i="${i}" aria-label="Short Trending: ${esc(it.title)}">
        <img class="rl-card__thumb" src="${esc(it.thumb)}" alt="" loading="lazy" draggable="false" />
        <video class="rl-card__clip" muted playsinline preload="none" aria-hidden="true"></video>
      </button>`,
    )
    .join("");
  const cards = [...rail.querySelectorAll(".rl-card")];

  /* moving thumbnails: one card at a time, the two front cards take turns */
  const visible = new Set();
  let turn = null;
  let playing = null; // { i, detach, timer }
  let paused = false;
  const front = () => Math.min(...visible);
  const active = () => (visible.size ? (turn != null && visible.has(turn) ? turn : front()) : null);

  function advance(from) {
    const order = [...visible].sort((a, b) => a - b).slice(0, 2);
    if (order.length < 2 || !order.includes(from)) {
      const v = playing?.video;
      if (v) v.currentTime = 0; // a single card keeps looping
      return;
    }
    turn = order[(order.indexOf(from) + 1) % order.length];
    syncPreview();
  }
  function stopPreview() {
    if (!playing) return;
    clearTimeout(playing.timer);
    playing.detach();
    playing.card.classList.remove("is-playing");
    playing = null;
  }
  function syncPreview() {
    const i = paused ? null : active();
    if (playing?.i === i) return;
    stopPreview();
    if (i == null) return;
    const card = cards[i];
    const video = card.querySelector("video");
    const p = { i, card, video, detach: attachStream(video, items[i].video, { preview: true }) };
    playing = p;
    p.timer = setTimeout(() => playing === p && advance(i), 8000); // slow or failed load: move on anyway
    video.onplaying = () => {
      clearTimeout(p.timer);
      card.classList.add("is-playing");
    };
    video.ontimeupdate = () => {
      if (playing === p && video.currentTime >= PREVIEW_SECONDS) advance(i);
    };
    video.play().catch(() => {});
  }
  const io = new IntersectionObserver(
    (entries) => {
      const before = visible.size ? front() : null;
      entries.forEach((e) => {
        const i = Number(e.target.dataset.i);
        if (e.isIntersecting && e.intersectionRatio >= 0.5) visible.add(i);
        else visible.delete(i);
      });
      if ((visible.size ? front() : null) !== before) turn = null; // rail moved: start again from the front
      syncPreview();
    },
    { threshold: 0.5 },
  );
  cards.forEach((c) => io.observe(c));
  document.addEventListener("visibilitychange", () => {
    paused = document.hidden || player.isOpen();
    syncPreview();
  });

  const player = createPlayer(items, {
    onOpen() {
      paused = true;
      syncPreview();
    },
    onClose() {
      paused = false;
      syncPreview();
    },
  });
  rail.addEventListener("click", (e) => {
    const card = e.target.closest(".rl-card");
    if (card) player.open(Number(card.dataset.i), card);
  });
  section.querySelector("[data-shorts-all]")?.addEventListener("click", () => player.open(0));
}

/* ================= Player ================= */
function createPlayer(items, { onOpen, onClose }) {
  const root = document.createElement("div");
  root.className = "rp";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Short Trending");
  root.innerHTML = `
    <div class="rp__col">
      <div class="rp__pager" data-rp-pager></div>
      <button class="rp__back" type="button" data-rp-back aria-label="Kembali">${icon("arrow-left")}</button>
      <div class="rp__catch" data-rp-comments-close></div>
      <section class="rp-cm" aria-label="Komentar" data-rp-comments>
        <button class="rp-cm__grab" type="button" data-rp-comments-close aria-label="Tutup komentar"></button>
        <header class="rp-cm__head">
          <div>
            <h2>26 Komentar</h2>
            <p>Isi komentar sepenuhnya adalah tanggung jawab pengguna dan diatur dalam UU ITE</p>
          </div>
          ${icon("arrows-down-up", "rl-ic--22")}
        </header>
        <div class="rp-cm__list" data-rp-comments-list></div>
        <div class="rp-cm__input">
          <span class="rp-cm__me" aria-hidden="true">DW</span>
          <div class="rp-cm__field"><span>Tambahkan komentar...</span>${icon("sticker", "rl-ic--22")}${icon("smiley", "rl-ic--22")}</div>
        </div>
      </section>
      <div class="rp__toast" data-rp-toast role="status" aria-live="polite"></div>
    </div>`;
  document.body.append(root);

  const $ = (sel) => root.querySelector(sel);
  const pager = $("[data-rp-pager]");
  const toastEl = $("[data-rp-toast]");
  $("[data-rp-comments-list]").innerHTML = rolls.comments.map((c) => commentRow(c, 32)).join("");

  const state = { open: false, idx: 0, muted: false, liked: new Set(), saved: new Set(), comments: false };
  const pages = []; // { el, video, item, detach, paused, scrubbing }

  function addPages() {
    const start = pages.length;
    items.forEach((item, k) => {
      const i = start + k;
      const el = document.createElement("section");
      el.className = "rp-page";
      el.dataset.i = i;
      el.innerHTML = `
        <div class="rp-media">
          <img class="rp-media__blur" src="${esc(item.thumb)}" alt="" />
          <video class="rp-media__video" playsinline preload="none" loop></video>
          <span class="rp-media__spin" aria-label="Memuat video"></span>
        </div>
        <div class="rp-page__grad"></div>
        <div class="rp-page__tap" data-act="pause"></div>
        <div class="rp-page__dim" data-act="caption"></div>
        <span class="rp-page__paused" aria-hidden="true">${icon("play-fill")}</span>
        <div class="rp-page__bottom">
          <div class="rp-page__text" data-act="caption">
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.desc)}</p>
          </div>
          <div class="rp-rail">
            <button type="button" data-act="like" aria-pressed="false" aria-label="Suka, ${esc(item.likes)}">${icon("thumbs-up")}<span>${esc(item.likes)}</span></button>
            <button type="button" data-act="comments" aria-label="Komentar, ${esc(item.comments)}">${icon("chat-centered-text")}<span>${esc(item.comments)}</span></button>
            <button type="button" data-act="save" aria-pressed="false">${icon("bookmark-simple")}<span>Simpan</span></button>
            <button type="button" data-act="share">${icon("export")}<span>Bagikan</span></button>
            <button type="button" class="rp-rail__more" data-act="more" aria-label="Opsi">${icon("dots-three-vertical", "rl-ic--26")}</button>
            <button type="button" class="rp-rail__mute" data-act="mute" aria-label="Matikan suara">${icon("speaker-high-fill", "rl-ic--18")}</button>
          </div>
        </div>
        <div class="rp-scrub" data-scrub>
          <span class="rp-scrub__times"><span data-t-now></span><span data-t-left></span></span>
          <span class="rp-scrub__track"><b></b><i></i></span>
        </div>`;
      pager.append(el);
      const video = el.querySelector("video");
      const page = { el, video, item, detach: null, paused: false, scrubbing: false };
      video.addEventListener("playing", () => el.classList.add("is-ready"));
      video.addEventListener("waiting", () => el.classList.add("is-buffering"));
      video.addEventListener("playing", () => el.classList.remove("is-buffering"));
      video.addEventListener("loadedmetadata", () => layoutVideo(page));
      pages.push(page);
    });
  }
  addPages();

  /* video fits the column width, top-aligned; the blurred frame fills below and the
     video's lower edge fades into it (Reels on iOS) */
  function layoutVideo(page) {
    const w = pager.clientWidth;
    const h = pager.clientHeight;
    const aspect = page.video.videoWidth && page.video.videoHeight ? page.video.videoWidth / page.video.videoHeight : 9 / 16;
    const vh = w / aspect;
    const s = page.el.style;
    if (vh <= h) {
      const fade = Math.min(140, vh * 0.22);
      const start = ((vh - fade) / vh) * 100;
      s.setProperty("--vid-h", `${vh}px`);
      s.setProperty("--fade-a", `${start}%`);
      s.setProperty("--fade-b", `${start + (100 - start) * 0.55}%`);
      page.el.classList.remove("is-cover");
    } else {
      s.setProperty("--vid-h", `${h}px`);
      page.el.classList.add("is-cover");
    }
  }

  /* only the current video and its neighbours hold a stream */
  function syncStreams() {
    pages.forEach((p, i) => {
      const near = Math.abs(i - state.idx) <= 1;
      if (near && !p.detach) {
        p.video.preload = i === state.idx ? "auto" : "metadata";
        p.detach = attachStream(p.video, p.item.video);
      } else if (!near && p.detach) {
        p.detach();
        p.detach = null;
        p.el.classList.remove("is-ready", "is-buffering");
      }
    });
  }
  function playCurrent() {
    pages.forEach((p, i) => {
      if (i !== state.idx) p.video.pause();
    });
    const p = pages[state.idx];
    if (!p || !state.open || p.paused) return;
    p.video.muted = state.muted;
    p.video.play().catch(() => {
      // autoplay with sound refused: play muted instead
      if (!p.video.muted) {
        state.muted = true;
        syncMute();
        p.video.muted = true;
        p.video.play().catch(() => {});
      }
    });
  }
  function setIdx(i) {
    if (i === state.idx) return;
    const prev = pages[state.idx];
    if (prev) {
      prev.paused = false;
      prev.el.classList.remove("is-paused", "is-expanded");
      prev.video.currentTime = 0;
    }
    state.idx = i;
    if (i >= pages.length - 2) addPages(); // endless, like the app
    syncStreams();
    playCurrent();
  }

  let scrollT;
  pager.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => setIdx(Math.round(pager.scrollTop / pager.clientHeight)), 80);
    },
    { passive: true },
  );

  /* ---------- open / close ---------- */
  let lastFocus = null;
  let raf = 0;
  function open(i, fromEl) {
    lastFocus = document.activeElement;
    onOpen();
    state.open = true;
    if (fromEl) {
      const r = fromEl.getBoundingClientRect();
      root.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
    } else root.style.transformOrigin = "50% 50%";
    root.hidden = false;
    document.documentElement.classList.add("rm-scroll-lock");
    pages.forEach(layoutVideo);
    state.idx = -1;
    pager.scrollTop = i * pager.clientHeight;
    setIdx(i);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-open")));
    setTimeout(() => state.open && root.classList.add("is-open"), 60); // rAF is paused in background tabs
    $("[data-rp-back]").focus({ preventScroll: true });
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }
  function close() {
    closeComments(true);
    state.open = false;
    root.classList.remove("is-open");
    cancelAnimationFrame(raf);
    pages.forEach((p) => {
      p.detach?.();
      p.detach = null;
      p.paused = false;
      p.el.classList.remove("is-ready", "is-buffering", "is-paused", "is-expanded");
    });
    document.documentElement.classList.remove("rm-scroll-lock");
    setTimeout(() => {
      if (!state.open) root.hidden = true;
    }, 300);
    onClose();
    lastFocus?.focus?.({ preventScroll: true });
  }
  $("[data-rp-back]").addEventListener("click", close);

  /* ---------- progress ---------- */
  function tick() {
    const p = pages[state.idx];
    if (p && !p.scrubbing && p.video.duration) paintProgress(p, p.video.currentTime / p.video.duration);
    if (state.open) raf = requestAnimationFrame(tick);
  }
  function paintProgress(p, f) {
    p.el.style.setProperty("--prog", f);
    if (p.scrubbing) {
      const d = p.video.duration || 0;
      p.el.querySelector("[data-t-now]").textContent = timeStr(d * f);
      p.el.querySelector("[data-t-left]").textContent = `-${timeStr(d * (1 - f))}`;
    }
  }
  let scrub = null;
  pager.addEventListener("pointerdown", (e) => {
    const bar = e.target.closest("[data-scrub]");
    if (!bar) return;
    const p = pages[Number(bar.closest(".rp-page").dataset.i)];
    e.preventDefault();
    scrub = { p, bar, id: e.pointerId, wasPlaying: !p.video.paused };
    p.scrubbing = true;
    p.el.classList.add("is-scrubbing");
    p.video.pause();
    bar.setPointerCapture(e.pointerId);
    seek(e);
  });
  function seek(e) {
    const r = scrub.bar.querySelector(".rp-scrub__track").getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    if (scrub.p.video.duration) scrub.p.video.currentTime = f * scrub.p.video.duration;
    paintProgress(scrub.p, f);
  }
  pager.addEventListener("pointermove", (e) => {
    if (scrub && e.pointerId === scrub.id) seek(e);
  });
  const endScrub = (e) => {
    if (!scrub || e.pointerId !== scrub.id) return;
    const { p, wasPlaying } = scrub;
    scrub = null;
    p.scrubbing = false;
    p.el.classList.remove("is-scrubbing");
    if (wasPlaying || !p.paused) playCurrent();
  };
  pager.addEventListener("pointerup", endScrub);
  pager.addEventListener("pointercancel", endScrub);

  /* ---------- actions ---------- */
  function syncMute() {
    root.querySelectorAll("[data-act=mute]").forEach((b) => {
      b.innerHTML = icon(state.muted ? "speaker-slash-fill" : "speaker-high-fill", "rl-ic--18");
      b.setAttribute("aria-label", state.muted ? "Nyalakan suara" : "Matikan suara");
    });
  }
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-show"), 2400);
  }

  pager.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !state.open) return;
    const pageEl = b.closest(".rp-page");
    const i = Number(pageEl.dataset.i);
    const p = pages[i];
    const key = i % items.length;
    switch (b.dataset.act) {
      case "pause":
        p.paused = !p.paused;
        pageEl.classList.toggle("is-paused", p.paused);
        if (p.paused) p.video.pause();
        else playCurrent();
        break;
      case "caption":
        pageEl.classList.toggle("is-expanded");
        pager.classList.toggle("is-locked", pageEl.classList.contains("is-expanded"));
        break;
      case "like": {
        const on = !state.liked.has(key);
        if (on) state.liked.add(key);
        else state.liked.delete(key);
        paintToggle("like", key, on, "thumbs-up");
        break;
      }
      case "save": {
        const on = !state.saved.has(key);
        if (on) state.saved.add(key);
        else state.saved.delete(key);
        paintToggle("save", key, on, "bookmark-simple");
        toast(on ? "Video disimpan." : "Video dihapus dari Tersimpan.");
        break;
      }
      case "share":
        share(p.item);
        break;
      case "more":
        toast("Opsi lainnya belum tersedia di prototipe ini.");
        break;
      case "mute":
        state.muted = !state.muted;
        p.video.muted = state.muted;
        syncMute();
        break;
      case "comments":
        openComments();
        break;
    }
  });
  function paintToggle(act, key, on, name) {
    pages.forEach((p, i) => {
      if (i % items.length !== key) return;
      const b = p.el.querySelector(`[data-act=${act}]`);
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
      b.querySelector(".rl-ic").style.setProperty("--ic", `url('/assets/rolls/${name}${on ? "-fill" : ""}.svg')`);
    });
  }
  async function share(item) {
    const url = `https://video.kompas.com/rolls/${item.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => {});
    toast("Tautan video disalin.");
  }

  /* ---------- comments: the video shrinks to the top, the panel slides up ---------- */
  function openComments() {
    const p = pages[state.idx];
    const colW = pager.clientWidth;
    const scale = SMALL_VIDEO_W / colW;
    const videoH = Math.min(pager.clientHeight, colW * (16 / 9));
    const top = 8;
    root.style.setProperty("--cm-scale", scale);
    root.style.setProperty("--cm-top", `${top}px`);
    root.style.setProperty("--cm-clip", `${pager.clientHeight - videoH}px`);
    root.style.setProperty("--cm-radius", `${12 / scale}px`);
    root.style.setProperty("--cm-panel-top", `${top + SMALL_VIDEO_W * (16 / 9) + 16}px`);
    p.el.classList.add("is-small");
    state.comments = true;
    root.classList.add("is-comments");
    pager.classList.add("is-locked");
  }
  function closeComments(now) {
    if (!state.comments) return;
    state.comments = false;
    root.classList.remove("is-comments");
    pager.classList.remove("is-locked");
    const p = pages[state.idx];
    if (now) p?.el.classList.remove("is-small");
    else setTimeout(() => !state.comments && p?.el.classList.remove("is-small"), 400);
  }
  root.querySelectorAll("[data-rp-comments-close]").forEach((el) => el.addEventListener("click", () => closeComments()));
  $("[data-rp-comments-list]").addEventListener("click", (e) => {
    const t = e.target.closest("[data-replies]");
    if (!t) return;
    const box = t.closest(".rp-c__replies");
    const shown = box.classList.toggle("is-hidden") === false;
    t.querySelector("span").textContent = shown ? "Sembunyikan" : `Lihat ${t.dataset.replies} balasan`;
  });

  /* keyboard */
  window.addEventListener("keydown", (e) => {
    if (!state.open) return;
    if (e.key === "Escape") {
      if (state.comments) closeComments();
      else close();
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !state.comments) {
      e.preventDefault();
      const next = Math.max(0, state.idx + (e.key === "ArrowDown" ? 1 : -1));
      pager.scrollTo({ top: next * pager.clientHeight, behavior: "smooth" });
    } else if (e.key === " " && !e.target.closest("button")) {
      e.preventDefault();
      pages[state.idx]?.el.querySelector("[data-act=pause]").click();
    }
  });
  window.addEventListener("resize", () => state.open && pages.forEach(layoutVideo));

  return { open, isOpen: () => state.open };
}

function commentRow(c, size) {
  const replies = c.replies?.length
    ? `<div class="rp-c__replies">
         <div class="rp-c__replylist">${c.replies.map((r) => commentRow(r, 24)).join("")}</div>
         <button type="button" class="rp-c__toggle" data-replies="${c.replies.length}"><span>Sembunyikan</span>${icon("caret-down", "rl-ic--14")}</button>
       </div>`
    : "";
  return `
    <div class="rp-c" style="--av:${size}px">
      <span class="rp-c__av" style="background:${esc(c.color)}" aria-hidden="true">${esc(c.initials)}</span>
      <div class="rp-c__main">
        <div class="rp-c__meta"><b>${esc(c.name)}</b><span>${esc(c.time)}</span>${icon("dots-three-vertical", "rl-ic--16")}</div>
        ${c.sticker ? `<div class="rp-c__sticker">${c.sticker}</div>` : `<p>${esc(c.text)}</p>`}
        <div class="rp-c__acts"><span>${icon("thumbs-up")}${c.likes}</span>${icon("thumbs-down")}<b>Balas</b></div>
        ${replies}
      </div>
    </div>`;
}
