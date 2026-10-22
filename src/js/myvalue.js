/**
 * MyValue Poin page (Figma 11695:95793): opened from the account page's
 * "MyValue Poin" card once the reader is logged in. Shows the saved user,
 * the dismissible info card and the filterable "Riwayat Poin" list.
 */
import "../styles/components/site-header.css";
import "../styles/pages/myvalue.css";

const SESSION_KEY = "kompas-account-session";

/* ---------- Logged-in user (same session the account page writes) ---------- */
let session = null;
try {
  session = JSON.parse(localStorage.getItem(SESSION_KEY));
} catch {
  session = null;
}
if (!session && !new URLSearchParams(window.location.search).has("demo")) {
  // Points are only for logged-in readers; send guests back to log in.
  window.location.replace("./account.html");
}
if (session) {
  const parts = session.name.trim().split(/\s+/);
  document.querySelector("[data-user-name]").textContent = session.name;
  document.querySelector("[data-user-email]").textContent = session.id;
  document.querySelector("[data-user-initials]").textContent =
    ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "K";
}

/* ---------- Info card ---------- */
document.querySelector("[data-mv-info-close]")?.addEventListener("click", () => {
  document.querySelector("[data-mv-info]").hidden = true;
});

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
    items: Array.from({ length: 4 }, () => ({
      store: "Gramedia Palmerah Barat",
      branch: "Gramedia Palmerah Barat",
      date: "21 Sep 2026",
      exp: "01 Oct 2028",
      points: 2800,
      type: "earning",
    })),
  },
];

const list = document.querySelector("[data-mv-list]");
const fmt = new Intl.NumberFormat("id-ID");

function renderHistory(filter) {
  const groups = HISTORY.map((g) => ({
    month: g.month,
    items: g.items.filter((it) => filter === "all" || it.type === filter),
  })).filter((g) => g.items.length);

  if (!groups.length) {
    list.innerHTML = `<p class="mv-empty">Belum ada riwayat ${TYPE_LABEL[filter]}.</p>`;
    return;
  }

  list.innerHTML = groups
    .map(
      (g) => `
        <div class="mv-month">
          <p class="mv-month__head"><span>${g.month}</span><span>${g.items.length} transaksi</span></p>
          <ul class="mv-month__items">
            ${g.items
              .map(
                (it) => `
              <li class="mv-item">
                <div class="mv-item__main">
                  <span class="mv-item__store">${it.store}</span>
                  <span class="mv-item__branch">${it.branch}</span>
                  <span class="mv-item__date">${it.date} <span>(exp. ${it.exp})</span></span>
                </div>
                <div class="mv-item__pts">
                  <span>${it.points > 0 ? "+" : ""}${fmt.format(it.points)} poin</span>
                  <span class="mv-item__type mv-item__type--${it.type}">${TYPE_LABEL[it.type]}</span>
                </div>
              </li>`,
              )
              .join("")}
          </ul>
        </div>`,
    )
    .join("");
}

document.querySelector(".mv-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".mv-tab");
  if (!tab) return;
  document.querySelectorAll(".mv-tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
  tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  renderHistory(tab.dataset.filter);
});

renderHistory("all");
