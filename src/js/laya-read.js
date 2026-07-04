/**
 * Laya reader: swap the hero image for the alternate story part.
 */
import "../styles/main.css";

const params = new URLSearchParams(window.location.search);
if (params.get("part") === "3") {
  const heroImage = document.querySelector(".laya-read-hero__image");
  if (heroImage) heroImage.src = "/assets/tato-dayak2.png";
}
