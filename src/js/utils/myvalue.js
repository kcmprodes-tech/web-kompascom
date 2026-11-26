/**
 * Whether the reader's KOMPAS.com account is linked to MyValue (prototype,
 * kept in localStorage). Set by the "berhasil terhubung" page, cleared by
 * "Berhenti menghubungkan akun" on the MyValue Poin page.
 *
 * Nothing saved yet: members start linked (their account card shows points,
 * as in the design repo's akun-member pages), everyone else starts unlinked.
 */
const KEY = "kompas-myvalue-linked";

export function isMyValueLinked({ member = false } = {}) {
  let saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  if (saved === "1") return true;
  if (saved === "0") return false;
  return member;
}

export function setMyValueLinked(linked) {
  try {
    localStorage.setItem(KEY, linked ? "1" : "0");
  } catch {
    /* ignore */
  }
}
