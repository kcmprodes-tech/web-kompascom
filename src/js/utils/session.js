/**
 * Prototype login session shared by every page (kept in localStorage).
 * Written by the account page's login flow; read by the header avatar,
 * the MyValue page, etc.
 */
const SESSION_KEY = "kompas-account-session";

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** "Dian meidina" → "DM" */
export function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "K";
}
