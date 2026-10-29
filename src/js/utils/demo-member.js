/**
 * Demo links for the prototype: a shareable URL that shows the site as a
 * KOMPAS.com+ subscriber, or as a non-subscriber again.
 *
 *   index.html?member=1  → logs in a demo reader (if nobody is logged in) and
 *                          activates KOMPAS.com+ MAX in the mock backend
 *   index.html?member=0  → removes the subscription (stays logged in)
 *
 * Goes through the same mock backend + broadcast as a real checkout, so every
 * page and open tab follows. The parameter is dropped from the URL afterwards.
 */
import { readSession, saveSession } from "./session.js";
import { mockBackend, announceEntitlementChange } from "./entitlement.js";

const DEMO_READER = { name: "Pembaca Plus", id: "pembaca.plus@kompas.com" };

export function applyDemoMemberLink() {
  const url = new URL(window.location.href);
  const flag = url.searchParams.get("member");
  if (flag !== "1" && flag !== "0") return;

  url.searchParams.delete("member");
  history.replaceState(null, "", url.pathname + url.search + url.hash);

  let session = readSession();
  if (flag === "1" && !session) {
    session = DEMO_READER;
    saveSession(session); // before the header reads it, so the avatar shows
  }
  if (!session) return;

  if (flag === "1") mockBackend.activate(session.id, "max", "monthly").then(announceEntitlementChange);
  else {
    mockBackend.reset(session.id);
    announceEntitlementChange();
  }
}
