/**
 * MyValue Poin page (Figma 11999:55551): the last step of the MyValue linking
 * flow and the target of the account page's "MyValue Poin" card. Shows the
 * saved user, points, tier, the "Riwayat Poin" list and the three-dot menu
 * whose "Berhenti menghubungkan akun" (after a confirm dialog) unlinks
 * MyValue and returns to the account page.
 */
import "../styles/components/site-header.css";
import "../styles/pages/myvalue.css";
import { readSession, initials } from "./utils/session.js";
import { isMyValueLinked, setMyValueLinked } from "./utils/myvalue.js";
import { initHeaderAvatar, initMemberView } from "./site-header.js";

/* ---------- Logged-in, linked user ---------- */
const session = readSession();
const demo = new URLSearchParams(window.location.search).has("demo");
if (!demo) {
  // Points are only for logged-in readers with a linked MyValue account.
  if (!session) window.location.replace("./account.html");
  else if (!isMyValueLinked()) window.location.replace("./myvalue-connect.html");
}
if (session) {
  document.querySelector("[data-user-name]").textContent = session.name;
  document.querySelector("[data-user-email]").textContent = session.id;
  document.querySelector("[data-user-initials]").textContent = initials(session.name);
}
initHeaderAvatar();
initMemberView();

/* ---------- Riwayat Poin ---------- */
const TYPE_LABEL = {
  earning: "Earning",
  redeem: "Redeem",
  "cancel-earning": "Cancel Earning",
  "cancel-redeem": "Cancel Redeem",
};

const HISTORY = [
  {
    month: "Sep 2026",
    items: Array.from({ length: 5 }, () => ({
      store: "Gramedia Palmerah Barat",
      branch: "Gramedia Palmerah Barat",
      date: "21 Sep 2026",
      exp: "01 Oct 2028",
      points: 2800,
      type: "earning",
    })),
  },
];

const fmt = new Intl.NumberFormat("id-ID");
document.querySelector("[data-mv-list]").innerHTML = HISTORY.map(
  (g) => `
    <div class="mv-month">
      <p class="mv-month__head">${g.month} <i aria-hidden="true"></i> ${g.items.length} transaksi</p>
      <ul class="mv-month__items">
        ${g.items
          .map(
            (it) => `
          <li class="mv-item">
            <div class="mv-item__main">
              <div class="mv-item__where">
                <span class="mv-item__store">${it.store}</span>
                <span class="mv-item__branch">${it.branch}</span>
              </div>
              <span class="mv-item__date">${it.date} <span>(exp. ${it.exp})</span></span>
            </div>
            <div class="mv-item__amount">
              <p class="mv-item__pts">${it.points > 0 ? "+" : ""}${fmt.format(it.points)} poin</p>
              <p class="mv-item__type mv-item__type--${it.type}">${TYPE_LABEL[it.type]}</p>
            </div>
          </li>`,
          )
          .join("")}
      </ul>
    </div>`,
).join("");

/* ---------- Three-dot menu → confirm → unlink ---------- */
const more = document.querySelector("[data-mv-more]");
const dialog = document.querySelector("[data-mv-disconnect]");

document.addEventListener("click", (event) => {
  if (more.open && !more.contains(event.target)) more.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") more.open = false;
});

document.querySelector("[data-mv-disconnect-open]").addEventListener("click", () => {
  more.open = false;
  dialog.showModal();
});
document.querySelector("[data-mv-disconnect-cancel]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close(); // backdrop
});
document.querySelector("[data-mv-disconnect-confirm]").addEventListener("click", () => {
  setMyValueLinked(false);
  window.location.href = "./account.html";
});
