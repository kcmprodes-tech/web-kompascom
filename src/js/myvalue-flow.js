/**
 * Linking a KOMPAS.com account to MyValue (design repo section "Myvalue",
 * Figma 12004:56964). One module for the four steps, picked by
 * body[data-page]:
 *
 *   connect   "Hubungkan akun MyValue"  → login / register
 *   login     MyValue login             → berhasil
 *   register  MyValue register          → berhasil
 *   done      "berhasil terhubung"      → MyValue Poin (myvalue.html)
 *
 * The flow needs a logged-in reader (guests log in through the account
 * page's MyValue sheet); ?demo skips that check.
 */
import "../styles/components/site-header.css";
import "../styles/pages/myvalue-flow.css";
import { readSession } from "./utils/session.js";
import { setMyValueLinked } from "./utils/myvalue.js";
import { initHeaderAvatar, initMemberView } from "./site-header.js";

const page = document.body.dataset.page;

if (!readSession() && !new URLSearchParams(window.location.search).has("demo")) {
  window.location.replace("./account.html");
}
initHeaderAvatar();
initMemberView();

/* MyValue login / register: the submit button wakes up once an e-mail or phone is typed */
const input = document.querySelector("[data-auth-input]");
const submit = document.querySelector("[data-auth-submit]");
if (input && submit) {
  input.addEventListener("input", () => {
    submit.disabled = !input.value.trim();
  });
}

/* Linked: the account page now shows "MyValue Poin" instead of "Hubungkan akun" */
if (page === "done") setMyValueLinked(true);
