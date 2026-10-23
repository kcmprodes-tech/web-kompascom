/**
 * KOMPAS.com+ landing (Figma 5970:10053). Scroll motion in the spirit of
 * apple.com/iphone: copy fades up as it enters, and every device stage
 * drives a 0→1 progress (--p) from its scroll position that each layer
 * inside it turns into its own movement (see kompasplus.css).
 */
import "../styles/pages/home.css";
import "../styles/pages/kompasplus.css";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* ---------- Copy reveal ---------- */
const reveals = document.querySelectorAll("[data-reveal]");
if (reduce || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  reveals.forEach((el) => io.observe(el));
}

/* ---------- Scroll-linked stages ---------- */
const hero = document.querySelector('[data-stage="hero"]');
const stages = [...document.querySelectorAll('[data-stage]:not([data-stage="hero"])')];

function update() {
  const vh = window.innerHeight;

  // hero: 0 at the top of the page → 1 once it has scrolled out
  const hr = hero.getBoundingClientRect();
  hero.style.setProperty("--h", clamp(-hr.top / hr.height).toFixed(4));

  // stages: 0 when the stage's top meets the bottom of the screen,
  // 1 when its centre reaches ~55% of the screen height
  stages.forEach((stage) => {
    const r = stage.getBoundingClientRect();
    const start = vh;
    const end = vh * 0.55 - r.height / 2;
    const p = easeOut(clamp((start - r.top) / (start - end)));
    stage.style.setProperty("--p", p.toFixed(4));
  });
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    update();
    ticking = false;
  });
}

if (!reduce) {
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

/* ---------- Bar: highlight the section in view, smooth anchor scroll ---------- */
const links = [...document.querySelectorAll(".kp-bar__nav a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
const barH = document.querySelector(".kp-bar").offsetHeight;

links.forEach((a, i) =>
  a.addEventListener("click", (event) => {
    event.preventDefault();
    const top = i === 0 ? 0 : sections[i].getBoundingClientRect().top + window.scrollY - barH;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }),
);

function markCurrent() {
  let current = 0;
  sections.forEach((sec, i) => {
    if (i && sec.getBoundingClientRect().top - barH <= window.innerHeight * 0.35) current = i;
  });
  if (window.scrollY < 40) current = 0;
  links.forEach((a, i) => a.classList.toggle("is-current", i === current));
}
markCurrent();
window.addEventListener("scroll", () => requestAnimationFrame(markCurrent), { passive: true });
