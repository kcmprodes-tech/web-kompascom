/**
 * AI summary card at the end of the article (Figma 11760:31452, "KARIN
 * Section"): "Mengapa ini penting?" with the first lines of the summary and
 * a Selengkapnya button that opens the full summary in a bottom sheet.
 *
 * The summaries are written ahead of time by an AI model and stored with the
 * article (/data/articles/<id>.json → summary: { penting, poin[] }); an
 * article without one simply gets no card.
 *
 * Policy articles (fuel prices, UMR, taxes…) can carry `impact` instead:
 * "Apa dampaknya buatmu?" with three short paragraphs on the card, and an
 * infographic plus a personal calculator in the sheet.
 */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rp = (n) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

const SPARKLE = `<img class="ais__spark" src="/assets/article/sparkle-ai.svg" alt="" aria-hidden="true" />`;
const CLOSE = `<i class="rm-ic" style="--ic:url('/assets/reading/x.svg')" aria-hidden="true"></i>`;

/* ---------- infographic: price per litre, before → now ---------- */
function infographic(info) {
  const max = Math.max(...info.items.map((i) => Math.max(i.before || 0, i.after)));
  const bar = (value, kind, label) =>
    `<span class="aig__bar aig__bar--${kind}" style="--w:${((value / max) * 100).toFixed(1)}%" title="${esc(label)}: ${rp(value)}">
       <i></i><b>${rp(value)}</b>
     </span>`;
  const rows = info.items
    .map((i) => {
      const diff = i.before ? i.after - i.before : 0;
      const tag = diff
        ? `<span class="aig__tag aig__tag--up">▲ ${rp(diff)} (+${((diff / i.before) * 100).toFixed(1).replace(".", ",")}%)</span>`
        : `<span class="aig__tag">Tetap</span>`;
      return `
        <li class="aig__row">
          <span class="aig__name">${esc(i.label)}${tag}</span>
          ${i.before ? bar(i.before, "before", `${i.label} sebelumnya`) : ""}
          ${bar(i.after, "after", `${i.label} sekarang`)}
        </li>`;
    })
    .join("");
  return `
    <figure class="aig">
      <figcaption>
        <h3>${esc(info.title)}</h3>
        <p>${esc(info.note)}</p>
      </figcaption>
      <ul class="aig__legend" aria-hidden="true">
        <li><i class="aig__key aig__key--before"></i>Sebelumnya</li>
        <li><i class="aig__key aig__key--after"></i>Sekarang</li>
      </ul>
      <ul class="aig__rows">${rows}</ul>
      ${info.why ? `<p class="aig__why">${esc(info.why)}</p>` : ""}
      <p class="aig__src">${esc(info.source)}</p>
    </figure>`;
}

/* ---------- calculator: extra fuel cost per month ---------- */
const VEHICLES = { motor: { label: "Motor", kmpl: 40 }, mobil: { label: "Mobil", kmpl: 12 } };

function calculator(calc) {
  return `
    <section class="acalc" aria-labelledby="acalc-title">
      <h3 id="acalc-title">Hitung tambahan biaya bensinmu</h3>
      <p class="acalc__lead">Masukkan jarak tempuh harianmu, ini tambahan biaya ${esc(calc.fuel)} per bulan.</p>
      <div class="acalc__seg" role="radiogroup" aria-label="Kendaraan">
        ${Object.entries(VEHICLES)
          .map(
            ([key, v], i) =>
              `<button type="button" role="radio" aria-checked="${i === 0}" data-vehicle="${key}">${v.label}</button>`,
          )
          .join("")}
      </div>
      <label class="acalc__field">
        <span>Jarak tempuh harian</span>
        <span class="acalc__input"><input type="number" inputmode="decimal" min="1" max="500" value="20" data-km /><em>km</em></span>
      </label>
      <label class="acalc__field">
        <span>Konsumsi BBM kendaraan</span>
        <span class="acalc__input"><input type="number" inputmode="decimal" min="1" max="100" value="${VEHICLES.motor.kmpl}" data-kmpl /><em>km/liter</em></span>
      </label>
      <label class="acalc__field">
        <span>Hari berkendara per bulan</span>
        <span class="acalc__input"><input type="number" inputmode="numeric" min="1" max="31" value="22" data-days /><em>hari</em></span>
      </label>
      <output class="acalc__out" aria-live="polite" data-out></output>
      <p class="acalc__note">Hitungan untuk pengguna ${esc(calc.fuel)} dengan harga ${rp(calc.before)} → ${rp(calc.after)} per liter. Konsumsi nyata bergantung pada kendaraan dan cara berkendara.</p>
    </section>`;
}

function wireCalculator(root, calc) {
  const $ = (sel) => root.querySelector(sel);
  const km = $("[data-km]");
  const kmpl = $("[data-kmpl]");
  const days = $("[data-days]");
  const out = $("[data-out]");
  const num = (input) => Math.max(0, Number(String(input.value).replace(",", ".")) || 0);

  function paint() {
    const litres = kmpl.value && num(kmpl) > 0 ? (num(km) * num(days)) / num(kmpl) : 0;
    const extra = litres * (calc.after - calc.before);
    out.innerHTML = `
      <span class="acalc__label">Tambahan biaya per bulan</span>
      <strong class="acalc__big">+${rp(extra)}</strong>
      <span class="acalc__rows">
        <span><span>Kebutuhan ${esc(calc.fuel)}</span><b>${litres.toLocaleString("id-ID", { maximumFractionDigits: 1 })} liter/bulan</b></span>
        <span><span>Dulu</span><b>${rp(litres * calc.before)}/bulan</b></span>
        <span><span>Sekarang</span><b>${rp(litres * calc.after)}/bulan</b></span>
        <span><span>Tambahan setahun</span><b>+${rp(extra * 12)}</b></span>
      </span>`;
  }

  root.querySelector(".acalc__seg").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-vehicle]");
    if (!btn) return;
    root.querySelectorAll("[data-vehicle]").forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
    kmpl.value = VEHICLES[btn.dataset.vehicle].kmpl;
    paint();
  });
  [km, kmpl, days].forEach((input) => input.addEventListener("input", paint));
  paint();
}

/** Puts the card right after `anchor` and wires its sheet. */
export function renderAiSummary(anchor, summary, impact) {
  if (!anchor || !(summary?.penting || impact)) return;

  const title = impact ? impact.title : "Mengapa ini penting?";
  const card = document.createElement("section");
  card.className = "ais";
  card.setAttribute("aria-labelledby", "ais-title");
  card.innerHTML = `
    <h2 class="ais__title" id="ais-title">${SPARKLE}${esc(title)}</h2>
    ${
      impact
        ? `<div class="ais__paras">${impact.paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`
        : `<p class="ais__text">${esc(summary.penting)}</p>`
    }
    <button class="ais__more" type="button" aria-haspopup="dialog"><span>Selengkapnya</span></button>`;
  anchor.after(card);

  const points = summary?.poin || [];
  const sheet = document.createElement("div");
  sheet.className = "rm ais-sheet";
  sheet.hidden = true;
  sheet.dataset.theme = "light";
  sheet.innerHTML = `
    <div class="rm__backdrop" data-ais-close></div>
    <section class="rm__sheet" role="dialog" aria-modal="true" aria-labelledby="ais-sheet-title" tabindex="-1">
      <div class="rm__top">
        <button class="rm__grab" type="button" data-ais-close aria-label="Tutup ringkasan"></button>
        <header class="rm__head">
          <h2 class="rm__title ais-sheet__title" id="ais-sheet-title">${SPARKLE}${impact ? esc(title) : "Ringkasan artikel"}</h2>
          <button class="rm-iconbtn" type="button" data-ais-close aria-label="Tutup">${CLOSE}</button>
        </header>
      </div>
      <div class="rm__body ais-sheet__body">
        ${
          impact
            ? `${impact.infographic ? infographic(impact.infographic) : ""}
               ${impact.calculator ? calculator(impact.calculator) : ""}`
            : `<section class="ais-sheet__why">
                 <h3>Mengapa ini penting?</h3>
                 <p>${esc(summary.penting)}</p>
               </section>`
        }
        ${
          points.length
            ? `<section class="ais-sheet__points">
                 <h3>Poin utama</h3>
                 <ul>${points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
               </section>`
            : ""
        }
        <p class="ais-sheet__note">Ringkasan ini dibuat oleh AI dari isi artikel dan bisa keliru. Baca artikel lengkap untuk konteksnya.</p>
      </div>
    </section>`;
  document.body.append(sheet);
  if (impact?.calculator) wireCalculator(sheet, impact.calculator);

  const more = card.querySelector(".ais__more");
  const open = () => {
    sheet.hidden = false;
    document.documentElement.classList.add("rm-scroll-lock");
    requestAnimationFrame(() => sheet.classList.add("is-open"));
    sheet.querySelector(".rm__sheet").focus({ preventScroll: true });
  };
  const close = () => {
    sheet.classList.remove("is-open");
    document.documentElement.classList.remove("rm-scroll-lock");
    setTimeout(() => (sheet.hidden = true), 280);
    more.focus({ preventScroll: true });
  };

  more.addEventListener("click", open);
  sheet.addEventListener("click", (event) => {
    if (event.target.closest("[data-ais-close]")) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sheet.hidden) close();
  });
}
