/**
 * Karin chat: composer sizing, the word-by-word answer reveal, and the
 * feedback modal. Opens straight into an answer when arriving with ?answer=1.
 */
import "../styles/common.css";
import "../styles/pages/karin.css";

const karinPage = document.querySelector(".karin-chat-page");
const karinComposer = document.querySelector(".karin-chat-composer");
const karinInput = document.querySelector(".karin-chat-composer textarea");
const karinSend = document.querySelector(".karin-chat-composer button");
const karinQuestionBubble = document.querySelector(".karin-answer-question");
const karinFeedbackTrigger = document.querySelector(".karin-feedback-trigger");
const karinFeedbackModal = document.querySelector(".karin-feedback-modal");
const karinFeedbackImage = document.querySelector(".karin-feedback-card img");
const karinFeedbackClose = document.querySelector(".karin-feedback-close");
const karinFeedbackOption = document.querySelector(".karin-feedback-option");
const karinFeedbackSubmit = document.querySelector(".karin-feedback-submit");
const karinFeedbackCancel = document.querySelector(".karin-feedback-cancel");
const fallbackQuestion = karinQuestionBubble.textContent;
let karinWordsPrepared = false;

/** Wrap each answer word in a span with a staggered reveal delay. */
function prepareKarinAnswerWords() {
  if (karinWordsPrepared) return;
  let wordIndex = 0;
  document.querySelectorAll(".karin-answer-copy p").forEach((paragraph) => {
    const words = paragraph.textContent.trim().split(/\s+/);
    paragraph.textContent = "";
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.textContent = word;
      span.style.setProperty("--word-delay", `${wordIndex * 34}ms`);
      paragraph.appendChild(span);
      if (index < words.length - 1) paragraph.append(" ");
      wordIndex += 1;
    });
  });
  karinWordsPrepared = true;
}

function syncKarinComposer() {
  karinComposer.classList.toggle("has-text", karinInput.value.trim().length > 0);
  karinInput.style.height = "auto";
  karinInput.style.height = `${Math.min(132, karinInput.scrollHeight)}px`;
}

function openKarinAnswer(question) {
  karinQuestionBubble.textContent = question.trim() || fallbackQuestion;
  karinInput.value = "";
  syncKarinComposer();
  document.body.classList.add("is-karin-answering");
  karinPage.classList.add("is-answering", "is-answer-loading");
  karinPage.classList.remove("is-answer-ready", "is-word-animating");
  window.setTimeout(() => {
    prepareKarinAnswerWords();
    karinPage.classList.remove("is-answer-loading");
    karinPage.classList.add("is-answer-ready", "is-word-animating");
  }, 3000);
}

function openKarinFeedback() {
  karinFeedbackImage.src = "/assets/feedback-mobile.svg";
  karinFeedbackTrigger.classList.remove("is-active");
  karinFeedbackModal.hidden = false;
  document.body.classList.add("is-karin-feedback-open");
}

function closeKarinFeedback() {
  karinFeedbackModal.hidden = true;
  document.body.classList.remove("is-karin-feedback-open");
}

function activateKarinFeedback() {
  karinFeedbackImage.src = "/assets/feedback-mobile-aktif.svg";
  karinFeedbackTrigger.classList.add("is-active");
}

karinSend.addEventListener("click", () => openKarinAnswer(karinInput.value));
karinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    openKarinAnswer(karinInput.value);
  }
});
karinInput.addEventListener("input", syncKarinComposer);

document.querySelectorAll(".karin-chat-suggestions button").forEach((button) => {
  button.addEventListener("click", () => {
    karinInput.value = button.textContent;
    syncKarinComposer();
    openKarinAnswer(button.textContent);
  });
});
karinFeedbackTrigger?.addEventListener("click", openKarinFeedback);
karinFeedbackClose?.addEventListener("click", closeKarinFeedback);
karinFeedbackCancel?.addEventListener("click", closeKarinFeedback);
karinFeedbackSubmit?.addEventListener("click", closeKarinFeedback);
karinFeedbackOption?.addEventListener("click", activateKarinFeedback);
karinFeedbackModal?.addEventListener("click", (event) => {
  if (event.target === karinFeedbackModal) closeKarinFeedback();
});
syncKarinComposer();

const params = new URLSearchParams(window.location.search);
if (params.get("answer") === "1") {
  openKarinAnswer(params.get("q") || fallbackQuestion);
}
