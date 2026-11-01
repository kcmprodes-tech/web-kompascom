/**
 * AI summary card at the end of the article (Figma 11760:31452, "KARIN
 * Section"): "Mengapa ini penting?" with the first lines of the summary and
 * a Selengkapnya button that opens the full summary in a bottom sheet.
 *
 * The summaries are written ahead of time by an AI model and stored with the
 * article (/data/articles/<id>.json → summary: { penting, poin[] }); an
 * article without one simply gets no card.
 */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const SPARKLE = `<img class="ais__spark" src="/assets/article/sparkle-ai.svg" alt="" aria-hidden="true" />`;
const CLOSE = `<i class="rm-ic" style="--ic:url('/assets/reading/x.svg')" aria-hidden="true"></i>`;

/** Puts the card right after `anchor` and wires its sheet. */
export function renderAiSummary(anchor, summary) {
  if (!anchor || !summary?.penting) return;

  const card = document.createElement("section");
  card.className = "ais";
  card.setAttribute("aria-labelledby", "ais-title");
  card.innerHTML = `
    <h2 class="ais__title" id="ais-title">${SPARKLE}Mengapa ini penting?</h2>
    <p class="ais__text">${esc(summary.penting)}</p>
    <button class="ais__more" type="button" aria-haspopup="dialog"><span>Selengkapnya</span></button>`;
  anchor.after(card);

  const points = summary.poin || [];
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
          <h2 class="rm__title ais-sheet__title" id="ais-sheet-title">${SPARKLE}Ringkasan artikel</h2>
          <button class="rm-iconbtn" type="button" data-ais-close aria-label="Tutup">${CLOSE}</button>
        </header>
      </div>
      <div class="rm__body ais-sheet__body">
        <section class="ais-sheet__why">
          <h3>Mengapa ini penting?</h3>
          <p>${esc(summary.penting)}</p>
        </section>
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
