/**
 * Original index: make each original card open its reader (or the detail page).
 */
import "../styles/common.css";
import "../styles/pages/original-index.css";
import { makeClickable, goTo } from "./utils/dom.js";

document.querySelectorAll(".original-card").forEach((card) => {
  const { originalPart } = card.dataset;
  const href = originalPart ? `./laya-read.html?part=${originalPart}` : "./original-detail.html";
  makeClickable(card, () => goTo(href));
});
