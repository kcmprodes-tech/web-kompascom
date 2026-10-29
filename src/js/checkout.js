/**
 * KOMPAS.com+ checkout (prototype). Steps: plan/period + payment method →
 * (login bottom sheet, for a guest who taps Bayar) → processing → success →
 * back to where the reader came from (e.g. the article in Mode Baca).
 *
 * "Payment" is simulated by mockBackend.activate(), standing in for the
 * payment provider's webhook that activates the subscription server-side.
 * Afterwards every open tab is told to re-check its entitlement, so access
 * appears without logging in again or refreshing.
 */
import "../styles/tokens/kds-tokens.css";
import "../styles/pages/checkout.css";
import { readSession } from "./utils/session.js";
import { fetchEntitlement, mockBackend, announceEntitlementChange } from "./utils/entitlement.js";
import { initLoginSheet } from "./components/login-sheet.js";

const params = new URLSearchParams(window.location.search);
const main = document.querySelector(".co");
const $ = (sel) => document.querySelector(sel);

const PLANS = {
  lite: { name: "KOMPAS.com+ LITE", note: "Tanpa iklan, lebih ringan", monthly: 29000, yearly: 290000 },
  max: { name: "KOMPAS.com+ MAX", note: "Tanpa iklan, artikel premium", monthly: 59000, yearly: 590000 },
  one: { name: "KOMPAS ONE", note: "Kompas.com+, Kompas.id, Kontan", monthly: 99000, yearly: 990000 },
};
const rupiah = (n) => `Rp${n.toLocaleString("id-ID")}`;

/** same-origin return path (article the reader came from) */
const returnTo = (() => {
  const raw = params.get("return");
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.href);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
})();

if (params.get("reset") === "1") {
  // demo helper: drop the current subscription
  const s = readSession();
  if (s) mockBackend.reset(s.id);
  announceEntitlementChange();
}

function show(step) {
  main.dataset.coStep = step;
  document.querySelectorAll("[data-co-panel]").forEach((p) => (p.hidden = p.dataset.coPanel !== step));
  window.scrollTo(0, 0);
}

/* ---------- back link keeps the trip ---------- */
const backUrl = new URL("./kompasplus.html", window.location.href);
if (params.get("ref")) backUrl.searchParams.set("ref", params.get("ref"));
if (params.get("return")) backUrl.searchParams.set("return", params.get("return"));
$("[data-co-back]").href = backUrl.pathname + backUrl.search;
document.querySelectorAll("[data-co-continue]").forEach((a) => (a.href = returnTo || "./index.html"));
$("[data-co-ref]").hidden = params.get("ref") !== "reading-mode";

/* ---------- plan cards ---------- */
let plan = PLANS[params.get("plan")] ? params.get("plan") : "max";
const plansBox = $("[data-co-plans]");
function period() {
  return document.querySelector('input[name="period"]:checked').value;
}
function renderPlans() {
  const per = period();
  plansBox.innerHTML = Object.entries(PLANS)
    .map(
      ([key, p]) => `
      <label class="co-plan">
        <input type="radio" name="plan" value="${key}" ${key === plan ? "checked" : ""} />
        <span class="co-plan__body">
          <b>${p.name}</b>
          <small>${p.note}</small>
        </span>
        <span class="co-plan__price">${rupiah(p[per])}<small>/${per === "yearly" ? "tahun" : "bulan"}</small></span>
      </label>`,
    )
    .join("");
  renderSummary();
}
function renderSummary() {
  const per = period();
  const p = PLANS[plan];
  $("[data-co-sum-name]").textContent = `${p.name} · ${per === "yearly" ? "Tahunan" : "Bulanan"}`;
  $("[data-co-sum-price]").textContent = rupiah(p[per]);
  $("[data-co-pay]").textContent = `Bayar ${rupiah(p[per])}`;
}
document.querySelector(".co-form").addEventListener("change", (event) => {
  if (event.target.name === "plan") plan = event.target.value;
  if (event.target.name === "period") renderPlans();
  else renderSummary();
});

/* ---------- pay ---------- */
// a guest picks a plan first, then logs in from the sheet; payment carries on after
const login = initLoginSheet({
  async afterSuccess() {
    const ent = await fetchEntitlement();
    if (ent.status === "active") showOwned(ent); // this account already has it
    else pay();
    return false;
  },
});

document.querySelector(".co-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!readSession()) return login.open();
  pay();
});

async function pay() {
  const session = readSession();
  show("processing");
  await mockBackend.activate(session.id, plan, period()); // ≈ payment webhook
  const ent = await fetchEntitlement(); // re-validate instead of trusting the client
  if (ent.status !== "active") {
    show("form");
    return;
  }
  announceEntitlementChange();
  const until = new Date(ent.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  $("[data-co-success-text]").textContent = `${PLANS[plan].name} aktif hingga ${until}. Akses langsung tersedia di akun ${session.id}.`;
  show("success");
  if (returnTo) {
    // take the reader straight back to the article (Reading Mode opens there)
    const auto = $("[data-co-auto]");
    auto.hidden = false;
    let left = 4;
    const tick = () => {
      auto.textContent = `Kembali ke artikel dalam ${left} detik…`;
      if (left-- === 0) window.location.href = returnTo;
      else setTimeout(tick, 1000);
    };
    tick();
  }
}

function showOwned(ent) {
  const until = new Date(ent.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  $("[data-co-owned-text]").textContent = `${PLANS[ent.plan].name} aktif hingga ${until}. Mode Baca dan semua manfaatnya sudah bisa dipakai.`;
  show("owned");
}

/* ---------- start: straight to choosing a plan, even for a guest ---------- */
(async () => {
  renderPlans();
  if (readSession()) {
    const ent = await fetchEntitlement();
    if (ent.status === "active") return showOwned(ent);
  }
  show("form");
})();
