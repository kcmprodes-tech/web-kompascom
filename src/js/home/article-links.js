/**
 * Turns home feed cards into keyboard-accessible links to their detail pages.
 */
import { makeClickable, goTo } from "../utils/dom.js";

const ARTICLE_CARD_SELECTORS = [
  ".hero-card",
  ".news-tile",
  ".story",
  ".wide-card",
  ".horizontal-rail article",
  ".topic-grid article",
  ".column-card",
  ".topic-choice-card",
  ".medium-article-card",
  ".finish-reading-rail article",
].join(",");

export function enableArticleLinks() {
  document.querySelectorAll(".original-card").forEach((card) => {
    const { originalPart } = card.dataset;
    const href = originalPart ? `./original-detail.html?part=${originalPart}` : "./original-detail.html";
    makeClickable(card, () => goTo(href));
  });

  document.querySelectorAll(ARTICLE_CARD_SELECTORS).forEach((card) => {
    makeClickable(card, () => goTo("./article-detail.html"));
  });
}
