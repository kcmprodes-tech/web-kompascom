/**
 * KOMPAS.com+ entitlement — the single source of truth for premium access
 * (Reading Mode, etc.).
 *
 * Production contract (what `fetchEntitlement` stands in for):
 *   GET /api/v1/me/entitlement            (session cookie)
 *   200 → { status: "active" | "none" | "expired",
 *           plan: "lite" | "max" | "one" | null,
 *           period: "monthly" | "yearly" | null,
 *           expiresAt: ISO-8601 | null,
 *           features: ["reading_mode", ...] }
 *   401 → not logged in
 * The UI never trusts a client-side flag: it only renders what this call
 * returns, re-validates when the tab regains focus, and listens for
 * "entitlement-changed" so a purchase made in another tab unlocks features
 * without a new login or a manual refresh.
 *
 * Prototype: the "backend" below keeps subscriptions in localStorage and
 * answers with a short artificial latency.
 */
import { readSession } from "./session.js";

const DB_KEY = "kompas-mock-backend-subscriptions";
const CHANNEL = "kompas-entitlement";
const PLAN_FEATURES = {
  lite: ["reading_mode", "ad_free"],
  max: ["reading_mode", "ad_free", "premium_articles"],
  one: ["reading_mode", "ad_free", "premium_articles", "kompas_id", "kontan"],
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readDb() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || {};
  } catch {
    return {};
  }
}

function writeDb(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

/* ---------------- mock backend ---------------- */
export const mockBackend = {
  /** what the payment provider's success webhook would do server-side */
  async activate(userId, plan, period) {
    await wait(900);
    const months = period === "yearly" ? 12 : 1;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    const db = readDb();
    db[userId] = { plan, period, expiresAt: expires.toISOString() };
    writeDb(db);
    return db[userId];
  },
  /** demo helper: let the subscription lapse */
  expire(userId) {
    const db = readDb();
    if (db[userId]) db[userId].expiresAt = new Date(Date.now() - 60000).toISOString();
    writeDb(db);
  },
  reset(userId) {
    const db = readDb();
    delete db[userId];
    writeDb(db);
  },
};

/** GET /api/v1/me/entitlement */
export async function fetchEntitlement() {
  await wait(250);
  const session = readSession();
  if (!session) return { status: "guest", plan: null, period: null, expiresAt: null, features: [] };
  const record = readDb()[session.id];
  if (!record) return { status: "none", plan: null, period: null, expiresAt: null, features: [] };
  const active = new Date(record.expiresAt).getTime() > Date.now();
  return {
    status: active ? "active" : "expired",
    plan: record.plan,
    period: record.period,
    expiresAt: record.expiresAt,
    features: active ? PLAN_FEATURES[record.plan] || [] : [],
  };
}

export const hasFeature = (entitlement, feature) =>
  entitlement.status === "active" && entitlement.features.includes(feature);

/* ---------------- change notifications ---------------- */
const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL) : null;

/** tell every open tab that access may have changed (after payment, logout…) */
export function announceEntitlementChange() {
  channel?.postMessage("entitlement-changed");
  window.dispatchEvent(new Event("entitlement-changed"));
}

/**
 * Calls `onChange(entitlement)` now and whenever access may have changed:
 * a purchase/expiry in any tab, the session changing, or the tab coming back
 * into view (the backend is the authority, so we simply ask again).
 */
export function watchEntitlement(onChange) {
  let last = null;
  const check = async () => {
    const next = await fetchEntitlement();
    const key = JSON.stringify(next);
    if (key !== last) {
      last = key;
      onChange(next);
    }
  };
  check();
  channel?.addEventListener("message", check);
  window.addEventListener("entitlement-changed", check);
  window.addEventListener("storage", (event) => {
    if (event.key === DB_KEY || event.key === "kompas-account-session") check();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  return check;
}
