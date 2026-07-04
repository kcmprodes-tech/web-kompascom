/**
 * Home page entry point. Wires up the feed, article links, audio player and
 * the Kompas+ plan sheet.
 */
import "../styles/common.css";
import "../styles/pages/home.css";
import { renderHomeFeed } from "./home/render.js";
import { enableArticleLinks } from "./home/article-links.js";
import { initHomeAudioPlayer } from "./home/audio-player.js";
import { initPlusSheet } from "./home/plus-sheet.js";

renderHomeFeed();
enableArticleLinks();
initHomeAudioPlayer();
initPlusSheet();
