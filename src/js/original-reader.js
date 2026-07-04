/**
 * Original reader: vertical episode reader with video playback,
 * progress tracking, chapter navigation and the premium paywall.
 */
import "../styles/common.css";
import "../styles/pages/original-reader.css";

const readerParams = new URLSearchParams(window.location.search);
const isReaderExperiment = readerParams.get("part") === "3";

if (isReaderExperiment) {
  document.body.classList.add("reader-experiment-b");
}

if (window.location.protocol === "file:") {
  document.querySelectorAll(".reel-youtube[data-local-fallback]").forEach((iframe) => {
    const fallback = document.createElement("video");
    fallback.src = iframe.dataset.localFallback;
    fallback.poster = iframe.dataset.localPoster || "";
    fallback.autoplay = true;
    fallback.muted = true;
    fallback.loop = true;
    fallback.playsInline = true;
    iframe.replaceWith(fallback);
  });
}

document.querySelectorAll(".reel-slide").forEach((slide) => {
  const media = slide.querySelector("video, iframe, img");
  if (!media) return;
  slide.classList.add("is-video-loading");

  function markMediaReady() {
    slide.classList.remove("is-video-loading");
  }

  if (media.tagName === "IFRAME") {
    media.addEventListener("load", markMediaReady, { once: true });
    window.setTimeout(markMediaReady, 1200);
  } else if (media.tagName === "VIDEO" && media.readyState >= 3) {
    markMediaReady();
  } else if (media.tagName === "IMG" && media.complete) {
    markMediaReady();
  } else {
    media.addEventListener("loadeddata", markMediaReady, { once: true });
    media.addEventListener("canplay", markMediaReady, { once: true });
    media.addEventListener("load", markMediaReady, { once: true });
  }
});

document.querySelectorAll(".reel-copy").forEach((copy) => {
  const slideRoot = copy.closest(".reel-slide");
  const handle = copy.querySelector(".reel-sheet-handle");
  const helper = slideRoot.querySelector(".reel-reader-helper");
  const isFirstSlide = slideRoot === document.querySelector(".reel-slide");

  const nextHelper = isFirstSlide && !isReaderExperiment ? document.createElement("div") : null;
  let touchStartY = 0;
  let touchMoved = false;
  let normalTouchStartY = 0;
  let normalTouchShouldAdvance = false;
  let normalTouchMoved = false;
  let contentTouchStartY = 0;
  let contentTouchStartedAtBottom = false;
  let contentTouchMoved = false;
  let contentTouchIsSheetGesture = false;
  let contentTouchShouldAdvance = false;
  let contentPointerActive = false;
  let experimentSheetNextReady = false;
  let nextHelperTouchStartY = 0;
  let nextHelperWasShown = false;

  if (nextHelper) {
    nextHelper.className = "reel-next-helper";
    nextHelper.setAttribute("role", "button");
    nextHelper.setAttribute("tabindex", "0");
    nextHelper.setAttribute("aria-label", "Lanjut ke halaman berikutnya");
    nextHelper.innerHTML = `
      <div>
        <img src="/assets/scroll-up.svg" alt="" aria-hidden="true" />
        <span>Geser ke atas untuk melihat halaman selanjutnya</span>
      </div>
    `;
    slideRoot.appendChild(nextHelper);
  }

  function hideHelper() {
    if (!helper) return;
    helper.classList.add("is-hidden");
  }

  function showNextHelper(slide) {
    if (
      isFirstSlide &&
      !isReaderExperiment &&
      !nextHelperWasShown &&
      slide.classList.contains("is-expanded") &&
      slide.nextElementSibling?.classList.contains("reel-slide")
    ) {
      nextHelperWasShown = true;
      slide.classList.add("is-next-helper-visible");
    }
  }

  function hideNextHelper(slide) {
    slide.classList.remove("is-next-helper-visible");
  }

  helper?.addEventListener("click", hideHelper);
  helper?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      hideHelper();
    }
  });

  function openSheet(slide) {
    hideHelper();
    hideNextHelper(slide);
    resetSheetDrag(slide);
    slide.classList.add("is-expanded");
    slide.classList.remove("is-sheet-full", "is-closing");
    window.setTimeout(() => {
      if (slide.classList.contains("is-expanded") && isCopyAtBottom()) {
        showNextHelper(slide);
      }
    }, 360);
  }

  function closeSheet(slide, animated = false) {
    hideNextHelper(slide);
    resetSheetDrag(slide);
    experimentSheetNextReady = false;
    if (animated && slide.classList.contains("is-expanded")) {
      slide.classList.add("is-closing");
      window.setTimeout(() => {
        slide.classList.remove("is-expanded", "is-sheet-full", "is-closing");
      }, 220);
      return;
    }
    slide.classList.remove("is-expanded", "is-sheet-full", "is-closing");
  }

  slideRoot.addEventListener("click", (event) => {
    if (!isReaderExperiment) return;
    if (!slideRoot.classList.contains("is-expanded")) return;
    if (copy.contains(event.target)) return;
    closeSheet(slideRoot, true);
  });

  function resetSheetDrag(slide) {
    slide.classList.remove("is-dragging");
    slide.style.removeProperty("--reel-sheet-down");
    slide.style.removeProperty("--reel-video-extra");
  }

  function settleHalfSheet(slide) {
    hideNextHelper(slide);
    slide.classList.remove("is-dragging", "is-sheet-full");
    window.requestAnimationFrame(() => resetSheetDrag(slide));
  }

  function syncSheetDrag(slide, deltaY) {
    const dragDown = Math.min(Math.max(deltaY / 220, 0), 1);
    slide.classList.add("is-dragging");
    slide.style.setProperty("--reel-sheet-down", `${Math.round(dragDown * 84)}px`);
    slide.style.setProperty("--reel-video-extra", `${Math.round(dragDown * 84)}px`);
  }

  function isCopyAtBottom() {
    return copy.scrollHeight - copy.scrollTop - copy.clientHeight <= 72;
  }

  function isCopyScrollable() {
    return copy.scrollHeight > copy.clientHeight + 72;
  }

  function shouldGoNextOnSwipeUp() {
    return !isCopyScrollable() || isCopyAtBottom();
  }

  function goToNextSlide(slide) {
    const nextSlide = slide.nextElementSibling;
    if (!nextSlide || !nextSlide.classList.contains("reel-slide")) return;
    hideNextHelper(slide);
    closeSheet(slide);
    experimentSheetNextReady = false;
    nextSlide.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function syncNextHelper() {
    const slide = copy.closest(".reel-slide");
    if (slide.classList.contains("is-next-helper-visible")) return;
    if (!isFirstSlide || nextHelperWasShown) return;
    if (slide.classList.contains("is-expanded") && isCopyAtBottom()) {
      showNextHelper(slide);
      return;
    }
  }

  nextHelper?.addEventListener("click", () => hideNextHelper(slideRoot));
  nextHelper?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      hideNextHelper(slideRoot);
    }
  });
  nextHelper?.addEventListener(
    "touchstart",
    (event) => {
      nextHelperTouchStartY = event.touches[0].clientY;
    },
    { passive: true },
  );
  nextHelper?.addEventListener(
    "touchmove",
    (event) => {
      const deltaY = event.touches[0].clientY - nextHelperTouchStartY;
      if (Math.abs(deltaY) > 8) {
        hideNextHelper(slideRoot);
      }
    },
    { passive: true },
  );
  nextHelper?.addEventListener("touchend", (event) => {
    const deltaY = event.changedTouches[0].clientY - nextHelperTouchStartY;
    if (deltaY < -42) {
      hideNextHelper(slideRoot);
      goToNextSlide(slideRoot);
      return;
    }
  });

  copy.addEventListener("click", () => {
    const slide = copy.closest(".reel-slide");
    if (!slide.classList.contains("is-expanded")) {
      openSheet(slide);
    }
  });

  copy.addEventListener(
    "touchstart",
    (event) => {
      if (event.target === handle) return;
      const slide = copy.closest(".reel-slide");
      if (isReaderExperiment && !slide.classList.contains("is-expanded")) {
        normalTouchStartY = event.touches[0].clientY;
        normalTouchShouldAdvance = shouldGoNextOnSwipeUp();
        normalTouchMoved = false;
        return;
      }
      if (!slide.classList.contains("is-expanded")) return;
      startContentGesture(event.touches[0].clientY);
    },
    { passive: true },
  );

  copy.addEventListener(
    "touchmove",
    (event) => {
      if (event.target === handle) return;
      const slide = copy.closest(".reel-slide");
      if (isReaderExperiment && !slide.classList.contains("is-expanded")) {
        const deltaY = event.touches[0].clientY - normalTouchStartY;
        if (Math.abs(deltaY) > 8) normalTouchMoved = true;
        if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
          if (event.cancelable) event.preventDefault();
        }
        return;
      }
      moveContentGesture(event.touches[0].clientY, event);
    },
    { passive: false },
  );

  copy.addEventListener("touchend", (event) => {
    if (event.target === handle) return;
    const slide = copy.closest(".reel-slide");
    if (isReaderExperiment && !slide.classList.contains("is-expanded")) {
      const deltaY = event.changedTouches[0].clientY - normalTouchStartY;
      if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        goToNextSlide(slide);
      }
      return;
    }
    endContentGesture(event.changedTouches[0].clientY);
  });

  copy.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || event.target === handle) return;
    const slide = copy.closest(".reel-slide");
    if (isReaderExperiment && !slide.classList.contains("is-expanded")) {
      contentPointerActive = true;
      normalTouchStartY = event.clientY;
      normalTouchShouldAdvance = shouldGoNextOnSwipeUp();
      normalTouchMoved = false;
      copy.setPointerCapture?.(event.pointerId);
      return;
    }
    if (!slide.classList.contains("is-expanded")) return;
    contentPointerActive = true;
    copy.setPointerCapture?.(event.pointerId);
    startContentGesture(event.clientY);
  });

  copy.addEventListener("pointermove", (event) => {
    if (!contentPointerActive || event.pointerType === "touch") return;
    const slide = copy.closest(".reel-slide");
    if (isReaderExperiment && !slide.classList.contains("is-expanded")) {
      const deltaY = event.clientY - normalTouchStartY;
      if (Math.abs(deltaY) > 8) normalTouchMoved = true;
      if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (event.cancelable) event.preventDefault();
      }
      return;
    }
    moveContentGesture(event.clientY, event);
  });

  copy.addEventListener("pointerup", (event) => {
    if (!contentPointerActive || event.pointerType === "touch") return;
    const slide = copy.closest(".reel-slide");
    if (isReaderExperiment && !slide.classList.contains("is-expanded")) {
      const deltaY = event.clientY - normalTouchStartY;
      contentPointerActive = false;
      copy.releasePointerCapture?.(event.pointerId);
      if (deltaY < -48 && (normalTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        goToNextSlide(slide);
      }
      return;
    }
    contentPointerActive = false;
    copy.releasePointerCapture?.(event.pointerId);
    endContentGesture(event.clientY);
  });

  copy.addEventListener("pointercancel", (event) => {
    if (event.pointerType === "touch") return;
    contentPointerActive = false;
    resetSheetDrag(copy.closest(".reel-slide"));
  });

  function startContentGesture(clientY) {
    contentTouchStartY = clientY;
    contentTouchStartedAtBottom = isCopyAtBottom();
    contentTouchShouldAdvance = shouldGoNextOnSwipeUp();
    contentTouchMoved = false;
    contentTouchIsSheetGesture = false;
  }

  function moveContentGesture(clientY, event) {
    const slide = copy.closest(".reel-slide");
    if (!slide.classList.contains("is-expanded")) return;
    const deltaY = clientY - contentTouchStartY;

    if (Math.abs(deltaY) <= 8 && !contentTouchMoved) return;
    if (isReaderExperiment) {
      contentTouchMoved = true;
      if (!shouldGoNextOnSwipeUp()) {
        experimentSheetNextReady = false;
      }
      if (deltaY < -48 && (contentTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (event.cancelable) event.preventDefault();
      }
      return;
    }
    if (deltaY < 0 && contentTouchShouldAdvance) {
      contentTouchStartedAtBottom = true;
      contentTouchMoved = true;
      contentTouchIsSheetGesture = true;
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (deltaY < 0) return;

    contentTouchMoved = true;
    contentTouchIsSheetGesture = true;
    syncSheetDrag(slide, deltaY);
    if (event.cancelable) event.preventDefault();
  }

  function endContentGesture(clientY) {
    const slide = copy.closest(".reel-slide");
    if (!slide.classList.contains("is-expanded")) return;
    const deltaY = clientY - contentTouchStartY;

    if (isReaderExperiment) {
      if (deltaY < -48 && (contentTouchShouldAdvance || shouldGoNextOnSwipeUp())) {
        if (!experimentSheetNextReady) {
          experimentSheetNextReady = true;
          return;
        }
        goToNextSlide(slide);
      }
      return;
    }

    if (deltaY < -48 && contentTouchShouldAdvance) {
      goToNextSlide(slide);
      return;
    }

    if (contentTouchIsSheetGesture) {
      if (deltaY > 48) {
        closeSheet(slide, true);
        return;
      }
      resetSheetDrag(slide);
      return;
    }

    if (deltaY < -48 && contentTouchShouldAdvance) {
      showNextHelper(slide);
    }
  }

  copy.addEventListener("scroll", syncNextHelper, { passive: true });

  copy.addEventListener(
    "wheel",
    (event) => {
      const slide = copy.closest(".reel-slide");
      if (isReaderExperiment && !slide.classList.contains("is-expanded")) {
        if (event.deltaY > 0 && shouldGoNextOnSwipeUp()) {
          event.preventDefault();
          goToNextSlide(slide);
        }
        return;
      }
      if (!slide.classList.contains("is-expanded")) return;

      if (event.deltaY > 0 && shouldGoNextOnSwipeUp()) {
      event.preventDefault();
        if (isReaderExperiment && !experimentSheetNextReady) {
          experimentSheetNextReady = true;
          return;
        }
        if (isReaderExperiment || !isFirstSlide || nextHelperWasShown) {
          goToNextSlide(slide);
          return;
        }
        showNextHelper(slide);
      } else if (isReaderExperiment) {
        experimentSheetNextReady = false;
      }
    },
    { passive: false },
  );

  handle.addEventListener(
    "touchstart",
    (event) => {
      touchStartY = event.touches[0].clientY;
      touchMoved = false;
    },
    { passive: true },
  );

  handle.addEventListener(
    "touchmove",
    (event) => {
      const deltaY = event.touches[0].clientY - touchStartY;
      if (Math.abs(deltaY) > 8) touchMoved = true;
      const slide = copy.closest(".reel-slide");

      if (
        event.cancelable &&
        slide.classList.contains("is-expanded")
      ) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  handle.addEventListener("touchend", (event) => {
    if (!touchMoved) return;
    const slide = copy.closest(".reel-slide");
    const deltaY = event.changedTouches[0].clientY - touchStartY;

    if (!slide.classList.contains("is-expanded")) return;

    if (deltaY > 48) {
      closeSheet(slide, true);
    }
  });
});

function setupExperimentReader(copy, slide, helper) {
  let startY = 0;
  let pointerActive = false;
  let shouldAdvanceOnSwipe = false;
  let suppressClick = false;

  helper?.classList.add("is-hidden");

  function isCopyAtEnd() {
    return copy.scrollHeight - copy.scrollTop - copy.clientHeight <= 48;
  }

  function isCopyScrollable() {
    return copy.scrollHeight > copy.clientHeight + 48;
  }

  function goToNextExperimentSlide() {
    const nextSlide = slide.nextElementSibling;
    if (!nextSlide || !nextSlide.classList.contains("reel-slide")) return;
    slide.classList.remove("is-copy-foreground-expanded");
    nextSlide.classList.remove("is-copy-foreground-expanded");
    const nextCopy = nextSlide.querySelector(".reel-copy");
    if (nextCopy) nextCopy.scrollTop = 0;
    nextSlide.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleCopy() {
    slide.classList.toggle("is-copy-foreground-expanded");
  }

  function startGesture(clientY) {
    startY = clientY;
    shouldAdvanceOnSwipe = !isCopyScrollable() || isCopyAtEnd();
  }

  function moveGesture(clientY, event) {
    const deltaY = clientY - startY;
    if (Math.abs(deltaY) < 12) return;
    suppressClick = true;

    if (deltaY < -48 && (shouldAdvanceOnSwipe || isCopyAtEnd())) {
      goToNextExperimentSlide();
      if (event.cancelable) event.preventDefault();
      return;
    }
  }

  copy.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    toggleCopy();
  });

  copy.addEventListener(
    "touchstart",
    (event) => {
      suppressClick = false;
      startGesture(event.touches[0].clientY);
    },
    { passive: true },
  );

  copy.addEventListener(
    "touchmove",
    (event) => {
      moveGesture(event.touches[0].clientY, event);
    },
    { passive: false },
  );

  copy.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") return;
    pointerActive = true;
    suppressClick = false;
    copy.setPointerCapture?.(event.pointerId);
    startGesture(event.clientY);
  });

  copy.addEventListener("pointermove", (event) => {
    if (!pointerActive || event.pointerType === "touch") return;
    moveGesture(event.clientY, event);
  });

  copy.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") return;
    pointerActive = false;
    copy.releasePointerCapture?.(event.pointerId);
  });

  copy.addEventListener("pointercancel", () => {
    pointerActive = false;
  });

  copy.addEventListener(
    "wheel",
    (event) => {
      if (event.deltaY > 0 && (!isCopyScrollable() || isCopyAtEnd())) {
        event.preventDefault();
        goToNextExperimentSlide();
      }
    },
    { passive: false },
  );
}
