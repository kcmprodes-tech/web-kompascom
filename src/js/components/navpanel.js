/**
 * Menu panel behind the header's hamburger — the Kompas.com mobile navpanel
 * as used by home-v2 in the design repo (dummy-kompascom-design,
 * header_2021 + navpanel): search, KG Media ID, Membership, Aktivitas,
 * Jelajahi Kanal, Jaringan KG Media, social links and the app badges.
 * It opens under the black header; the hamburger turns into a red close
 * button while it is open.
 */
import "../../styles/components/navpanel.css";
import { readSession, initials } from "../utils/session.js";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name, extra = "") => `<i class="np-ic ${extra}" style="--ic:url('/assets/navpanel/${name}.svg')" aria-hidden="true"></i>`;

const KANAL = [
  ["Beranda", "./index.html"],
  ["Nasional"],
  ["Regional"],
  ["Megapolitan"],
  ["Global"],
  ["Kilas Daerah"],
  ["Kilas Korporasi"],
  ["Kilas Kementerian"],
  ["Sorot Politik"],
  ["Kilas Badan Negara"],
  ["Kilas Parlemen"],
  ["Pemilu", null, true],
  ["IKN", null, true],
  ["Tren"],
  ["Hype"],
  ["Food"],
  ["Money"],
  ["UMKM"],
  ["Foto"],
  ["Kilas BUMN"],
  ["Kilas Badan"],
  ["Kilas Transportasi"],
  ["Agri"],
  ["Bola"],
  ["Video"],
  ["Lestari"],
  ["Tekno"],
  ["Sains"],
  ["Otomotif"],
  ["Lifestyle"],
  ["Health"],
  ["Homey"],
  ["Parapuan"],
  ["Properti"],
  ["Buku"],
  ["Sorot Properti"],
  ["Travel"],
  ["Ohayo Jepang"],
  ["Edukasi"],
  ["Kilas Pendidikan"],
  ["Kolom"],
  ["Kata Netizen"],
];
const NETWORK = [
  ["Kompas.com", "https://www.kompas.com"],
  ["Harian Kompas", "https://www.kompas.id"],
  ["KompasTV", "https://www.kompas.tv"],
  ["Kompasiana", "https://www.kompasiana.com"],
  ["KG Media", "https://www.kgmedia.id"],
  ["KGNOW!", "https://www.kgnow.com"],
  ["PasangIklan.com", "https://www.pasangiklan.com"],
  ["Kontan", "https://www.kontan.co.id"],
  ["Sonora", "https://www.sonora.id"],
  ["Grid.ID", "https://www.grid.id"],
  ["GridOto.com", "https://www.gridoto.com"],
  ["BolaSport.com", "https://www.bolasport.com"],
  ["Parapuan", "https://www.parapuan.co"],
  ["Tribunnews", "https://www.tribunnews.com"],
  ["Gramedia.com", "https://www.gramedia.com"],
  ["Gramedia Digital", "https://ebooks.gramedia.com"],
  ["Santika Indonesia", "https://www.santika.com"],
];
const SOCIAL = [
  ["facebook-logo", "Facebook"],
  ["x-logo", "X"],
  ["telegram-logo", "Telegram"],
  ["instagram-logo", "Instagram"],
  ["youtube-logo", "YouTube"],
  ["whatsapp-logo", "WhatsApp"],
  ["tiktok-logo", "TikTok"],
];

/** two columns, filled top to bottom like the live menu */
function columns(items, render) {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)].map((col) => `<ul>${col.map(render).join("")}</ul>`).join("");
}

function row({ href, icon: ic, label, badge, dot }) {
  return `
    <a class="np-row" href="${href}">
      ${ic}
      <span class="np-row__label">${label}${badge ? `<span class="np-badge">${badge}</span>` : ""}${dot ? '<span class="np-dot" aria-label="baru"></span>' : ""}</span>
      ${icon("caret-right", "np-row__chev")}
    </a>`;
}

function markup(session, member) {
  const who = session
    ? row({
        href: "./profile.html",
        icon: `<span class="np-avatar" aria-hidden="true">${esc(initials(session.name))}</span>`,
        label: esc(session.name),
      })
    : row({ href: "./account.html", icon: icon("user-circle"), label: "Login" });
  return `
    <form class="np-search" role="search" onsubmit="return false">
      <input type="search" placeholder="Cari tokoh, topik atau peristiwa" aria-label="Cari tokoh, topik atau peristiwa" />
    </form>

    <section class="np-sec">
      <h2 class="np-sec__title">KG Media ID</h2>
      ${who}
      ${row({ href: "#", icon: `<span class="np-tier" aria-hidden="true">${icon("star-fill")}</span>`, label: "Level Pembaca Kompas.com", badge: "BETA" })}
    </section>

    ${
      member
        ? ""
        : `<section class="np-sec">
             <h2 class="np-sec__title">Membership</h2>
             ${row({ href: "./kompasplus.html", icon: '<img class="np-kplus" src="/assets/home/icons/kplus.svg" alt="" aria-hidden="true" />', label: "Gabung KOMPAS.com+", dot: true })}
           </section>`
    }

    <section class="np-sec">
      <h2 class="np-sec__title">Aktivitas</h2>
      ${row({ href: "./account.html", icon: icon("lamp"), label: "Atur Mode" })}
      ${row({ href: "#", icon: icon("chat-text"), label: "Berikan Masukanmu", dot: true })}
    </section>

    <section class="np-sec">
      <h2 class="np-sec__title">Jelajahi Kanal</h2>
      <div class="np-grid">
        ${columns(KANAL, ([name, href, isNew]) => `<li><a href="${href || "#"}">${name}${isNew ? '<span class="np-new">NEW</span>' : ""}</a></li>`)}
        <a class="np-vik" href="#" aria-label="VIK">VIK</a>
      </div>
    </section>

    <section class="np-sec">
      <h2 class="np-sec__title">Jaringan KG Media</h2>
      <div class="np-grid">
        ${columns(NETWORK, ([name, href]) => `<li><a href="${href}" target="_blank" rel="noopener">${name}</a></li>`)}
      </div>
    </section>

    <footer class="np-foot">
      <p class="np-foot__title">Ikuti kami</p>
      <div class="np-social">
        ${SOCIAL.map(([ic, name]) => `<a href="#" aria-label="${name}">${icon(ic)}</a>`).join("")}
      </div>
      <p class="np-foot__title">Download aplikasi Kompas.com sekarang</p>
      <div class="np-apps">
        <a href="#" aria-label="Download di App Store"><img src="/assets/app-store.png" alt="App Store" /></a>
        <a href="#" aria-label="Temukan di Google Play"><img src="/assets/play-store.png" alt="Google Play" /></a>
      </div>
      <p class="np-copy">Copyright 2008 - 2021 PT. Kompas Cyber Media (Kompas Gramedia Digital Group). All rights reserved.</p>
    </footer>`;
}

export function initNavPanel() {
  const toggles = () => document.querySelectorAll("[data-navpanel-toggle]");
  if (!toggles().length) return;

  const panel = document.createElement("div");
  panel.className = "np";
  panel.id = "navpanel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Menu");
  document.body.append(panel);

  let open = false;
  let lastFocus = null;
  function setOpen(next) {
    open = next;
    if (open) {
      lastFocus = document.activeElement;
      panel.innerHTML = markup(readSession(), document.documentElement.classList.contains("is-member"));
      panel.hidden = false;
      panel.scrollTop = 0;
    } else {
      panel.hidden = true;
    }
    document.documentElement.classList.toggle("np-open", open);
    if (open) {
      const bar = document.querySelector(".hm-header .hm-bar") || document.querySelector(".hm-bar");
      panel.style.setProperty("--np-top", `${Math.max(0, bar?.getBoundingClientRect().bottom ?? 50)}px`);
    }
    toggles().forEach((b) => {
      b.setAttribute("aria-expanded", String(open));
      b.setAttribute("aria-label", open ? "Tutup menu" : "Jelajahi");
    });
    if (!open) lastFocus?.focus?.({ preventScroll: true });
  }

  // delegated, so copies of the header (the reading view clones it) work too
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-navpanel-toggle]")) setOpen(!open);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });
}
