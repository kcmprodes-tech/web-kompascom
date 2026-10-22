/**
 * Black site header: once the reader is logged in, the account icon turns
 * into their profile avatar (gradient circle with initials, as on the
 * account page).
 */
import { readSession, initials } from "./utils/session.js";

export function initHeaderAvatar() {
  const session = readSession();
  const link = document.querySelector(".hm-act--user");
  const ring = link?.querySelector(".hm-user-ring");
  if (!session || !ring) return;

  ring.classList.add("hm-user-ring--avatar");
  ring.textContent = initials(session.name);
  link.setAttribute("aria-label", `Akun ${session.name}`);
}
