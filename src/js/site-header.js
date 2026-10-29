/**
 * Black site header: once the reader is logged in, the account icon turns
 * into their profile avatar (gradient circle with initials, as on the
 * account page). For KOMPAS.com+ members the logo becomes KOMPAS.com+ and
 * ads go away (html.is-member, see site-header.css).
 */
import { readSession, initials } from "./utils/session.js";
import { watchEntitlement } from "./utils/entitlement.js";

export function initHeaderAvatar() {
  const session = readSession();
  const link = document.querySelector(".hm-act--user");
  const ring = link?.querySelector(".hm-user-ring");
  if (!session || !ring) return;

  ring.classList.add("hm-user-ring--avatar");
  ring.textContent = initials(session.name);
  link.setAttribute("aria-label", `Akun ${session.name}`);
}

/** KOMPAS.com+ member view, from the backend entitlement: html.is-member
 *  (hides ads) and the KOMPAS.com+ logo. `onChange(member, entitlement)`
 *  lets a page add its own member perks. */
export function initMemberView(onChange) {
  const logo = document.querySelector(".hm-logo");
  watchEntitlement((ent) => {
    const member = ent.status === "active";
    document.documentElement.classList.toggle("is-member", member);
    if (logo) {
      logo.src = member ? "/assets/kplus/logo-kompascom-plus.svg" : "/assets/home/logo-kompas.svg";
      logo.alt = member ? "KOMPAS.com+" : "Kompas.com";
      logo.classList.toggle("hm-logo--plus", member);
    }
    onChange?.(member, ent);
  });
}
