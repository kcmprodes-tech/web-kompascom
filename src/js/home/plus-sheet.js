/**
 * Sticky bottom ad dismissal + the floating Kompas+ button that reveals the
 * subscription plan sheet as the reader scrolls past the AI summary.
 */

export function initPlusSheet() {
  const stickyBottomAd = document.querySelector("[data-sticky-bottom-ad]");
  const stickyBottomAdClose = document.querySelector("[data-sticky-bottom-ad-close]");
  const plusFloatingButton = document.querySelector("[data-plus-floating-button]");
  const plusPlanSheet = document.querySelector("[data-plus-plan-sheet]");
  const plusPlanClose = document.querySelector("[data-plus-plan-close]");
  const wpAioSection = document.querySelector(".wp-aio-section");
  const originalSection = document.querySelector(".original-section");

  let plusFloatingHasShined = false;
  let plusFloatingDismissed = false;

  function updatePlusFloatingButton() {
    if (!plusFloatingButton || !wpAioSection || !originalSection) return;
    if (plusFloatingDismissed) {
      plusFloatingButton.classList.remove("is-visible");
      return;
    }
    const wpAioBottom = wpAioSection.getBoundingClientRect().bottom;
    const originalTop = originalSection.getBoundingClientRect().top;
    const shouldShow = wpAioBottom < 0 && originalTop > window.innerHeight * 0.36;
    plusFloatingButton.classList.toggle("is-visible", shouldShow);
    if (shouldShow && !plusFloatingHasShined) {
      plusFloatingHasShined = true;
      window.setTimeout(() => plusFloatingButton.classList.add("has-shined"), 1100);
    }
  }

  function openPlusPlanSheet() {
    if (!plusPlanSheet) return;
    plusPlanSheet.classList.add("is-open");
    plusPlanSheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-plus-plan-open");
  }

  function closePlusPlanSheet() {
    if (!plusPlanSheet) return;
    plusPlanSheet.classList.remove("is-open");
    plusPlanSheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-plus-plan-open");
    plusFloatingDismissed = true;
    plusFloatingButton?.classList.remove("is-visible");
  }

  stickyBottomAdClose?.addEventListener("click", () => {
    stickyBottomAd?.classList.add("is-hidden");
    document.body.classList.add("is-sticky-ad-hidden");
    updatePlusFloatingButton();
  });

  plusFloatingButton?.addEventListener("click", openPlusPlanSheet);
  plusPlanClose?.addEventListener("click", closePlusPlanSheet);
  plusPlanSheet?.addEventListener("click", (event) => {
    if (event.target === plusPlanSheet) closePlusPlanSheet();
  });
  window.addEventListener("scroll", updatePlusFloatingButton, { passive: true });
  window.addEventListener("resize", updatePlusFloatingButton);
  updatePlusFloatingButton();
}
