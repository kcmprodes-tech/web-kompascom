/**
 * Shared DOM helpers used across pages.
 */

/**
 * Make an element behave like a link/button: keyboard-accessible and clickable.
 * @param {Element} el - target element
 * @param {(() => void)} onActivate - callback fired on click or Enter/Space
 * @param {"link" | "button"} [role="link"] - ARIA role to expose
 */
export function makeClickable(el, onActivate, role = "link") {
  el.setAttribute("role", role);
  el.setAttribute("tabindex", "0");
  el.addEventListener("click", onActivate);
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  });
}

/** Navigate the browser to a URL. */
export function goTo(href) {
  window.location.href = href;
}
