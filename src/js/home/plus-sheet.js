/**
 * Sticky bottom ad dismissal + the floating Kompas+ button that opens the
 * subscription plan sheet. The CTA is always present but sits behind the
 * sticky bottom ad, so it becomes visible once the ad is dismissed.
 */

export function initPlusSheet() {
  const stickyBottomAd = document.querySelector("[data-sticky-bottom-ad]");
  const stickyBottomAdClose = document.querySelector("[data-sticky-bottom-ad-close]");
  const plusFloatingButton = document.querySelector("[data-plus-floating-button]");
  const plusPlanSheet = document.querySelector("[data-plus-plan-sheet]");
  const plusPlanClose = document.querySelector("[data-plus-plan-close]");

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
  }

  stickyBottomAdClose?.addEventListener("click", () => {
    stickyBottomAd?.classList.add("is-hidden");
    document.body.classList.add("is-sticky-ad-hidden");
  });

  plusFloatingButton?.addEventListener("click", openPlusPlanSheet);
  plusPlanClose?.addEventListener("click", closePlusPlanSheet);
  plusPlanSheet?.addEventListener("click", (event) => {
    if (event.target === plusPlanSheet) closePlusPlanSheet();
  });
}
