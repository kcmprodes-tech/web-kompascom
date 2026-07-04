/**
 * Article detail page: route Karin suggestion chips into the Karin chat.
 */
import "../styles/common.css";
import "../styles/pages/article.css";

document.querySelectorAll(".karin-question-rail button").forEach((button) => {
  button.addEventListener("click", () => {
    const question = encodeURIComponent(button.textContent.trim());
    window.location.href = `./karin-chat.html?answer=1&q=${question}`;
  });
});
