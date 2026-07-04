/**
 * Original detail: hero part switching, description/episode tabs, and the
 * premium blocker shown when tapping a locked episode.
 */
import "../styles/main.css";
import { makeClickable } from "./utils/dom.js";

const PART_DATA = {
  3: { image: "/assets/tato-dayak2.png", part: "Bagian 3, Tato Dayak Terakhir" },
  4: { image: "/assets/tato-dayak1.png", part: "Bagian 4, Tato Dayak Terakhir" },
};

const originalPage = document.querySelector(".original-detail-page");
const originalTabs = document.querySelectorAll("[data-original-tab]");
const premiumBlocker = document.querySelector(".premium-blocker");
const premiumBlockerClose = document.querySelector(".premium-blocker__close");
const premiumBlockerBackdrop = document.querySelector(".premium-blocker__backdrop");
const originalHeroImage = document.querySelector("#originalHeroImage");
const originalHeroPart = document.querySelector("#originalHeroPart");
const originalReaderLink = document.querySelector("#originalReaderLink");

const params = new URLSearchParams(window.location.search);
const part = params.get("part") === "3" ? "3" : "4";
const activePart = PART_DATA[part];
const readerPart = part === "4" ? "3" : part;

originalHeroImage.src = activePart.image;
originalHeroPart.textContent = activePart.part;
originalReaderLink.href = `./original-reader.html?part=${readerPart}`;

originalTabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    originalTabs.forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    originalPage.classList.toggle("is-description-mode", tab.dataset.originalTab === "description");
  });
});

function openPremiumBlocker() {
  premiumBlocker.classList.add("is-open");
  premiumBlocker.setAttribute("aria-hidden", "false");
}

function closePremiumBlocker() {
  premiumBlocker.classList.remove("is-open");
  premiumBlocker.setAttribute("aria-hidden", "true");
}

document.querySelectorAll(".original-episode-list .is-locked").forEach((episode) => {
  makeClickable(episode, openPremiumBlocker, "button");
});

premiumBlockerClose.addEventListener("click", closePremiumBlocker);
premiumBlockerBackdrop.addEventListener("click", closePremiumBlocker);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && premiumBlocker.classList.contains("is-open")) {
    closePremiumBlocker();
  }
});
