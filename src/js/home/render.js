/**
 * Renders the home feed: story lists, popular list, horizontal rails, and
 * shuffles in local article thumbnails.
 */
import { stories, updates, railItems, articleImages } from "../data.js";

function createStory(story) {
  const article = document.createElement("article");
  article.className = "story";
  article.innerHTML = `
    <img src="${story.image}" alt="" loading="lazy" />
    <div>
      <span class="label">${story.tag}</span>
      <h3>${story.title}</h3>
      <p>${story.meta}</p>
    </div>
  `;
  return article;
}

function createPopularStory(story, index) {
  const article = document.createElement("article");
  article.className = "story popular-story";
  article.innerHTML = `
    <div class="popular-media">
      <img src="${story.image}" alt="" loading="lazy" />
      <span>${index + 1}</span>
    </div>
    <div>
      <h3>${story.title}</h3>
      <p>${story.tag}</p>
    </div>
  `;
  return article;
}

function createRailCard(story) {
  const article = document.createElement("article");
  article.innerHTML = `
    <img src="${story.image}" alt="" loading="lazy" />
    <h3>${story.title}</h3>
    <p>${story.tag} <span>•</span> ${story.meta || "1 Menit lalu"}</p>
  `;
  return article;
}

function renderInto(id, items, factory) {
  const target = document.getElementById(id);
  if (!target) return;
  items.forEach((item, index) => target.appendChild(factory(item, index)));
}

/** Replace placeholder article images with a shuffled set of local thumbnails. */
function randomizeArticleImages() {
  const shuffledImages = [...articleImages].sort(() => Math.random() - 0.5);
  const images = document.querySelectorAll(".page-shell article img, .kg-video-section > img");
  images.forEach((image, index) => {
    if (image.closest(".column-author")) return;
    image.src = shuffledImages[index % shuffledImages.length];
    image.loading = "lazy";
  });
}

/** Populate every home feed section and shuffle in local thumbnails. */
export function renderHomeFeed() {
  renderInto("popularList", stories.slice(0, 5), createPopularStory);
  renderInto("columnList", stories.slice(2, 5), createStory);
  renderInto("recommendationList", [...stories.slice(4), ...updates, ...stories.slice(0, 4)], createStory);
  renderInto("appointmentList", stories.slice(0, 5), createStory);
  renderInto("moneyList", [...stories.slice(2, 6), ...updates.slice(0, 2)], createStory);
  renderInto("genzList", stories.slice(5, 10), createStory);
  renderInto("newsRail", [...updates, ...stories.slice(0, 2)], createRailCard);
  renderInto("shortRail", railItems, createRailCard);
  renderInto("moneyRail", [railItems[3], ...updates.slice(1, 4)], createRailCard);
  renderInto("commentedRail", [stories[8], stories[1], updates[0]], createRailCard);
  renderInto("photoRail", [stories[8], stories[4], updates[2]], createRailCard);

  randomizeArticleImages();
}
