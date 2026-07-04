/**
 * Home audio experience: the "headline" podcast player and the AI-generated
 * ("aio") text-to-speech summary, plus the pip (mini player) and full player view.
 */

const AIO_SPEECH_TEXT =
  "Update pilihan hari ini. Sejumlah isu publik menjadi perhatian, mulai dari dinamika kebijakan pemerintah, ekonomi rumah tangga, transportasi publik, kualitas udara, hingga layanan digital. Simak ringkasan utama agar kamu tetap mendapatkan konteks penting tanpa perlu membaca semua artikel satu per satu.";

function formatAudioTime(value = 0) {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function initHomeAudioPlayer() {
  const headlineAudioButton = document.querySelector(".headline-badge");
  const wpAioSection = document.querySelector(".wp-aio-section");
  const wpAioExpand = document.querySelector(".wp-aio-expand");
  const wpAioClose = document.querySelector(".wp-aio-close");
  const wpAioHide = document.querySelector(".wp-aio-hide");
  const wpAioPlay = document.querySelector(".wp-aio-play");
  const wpAioSources = document.querySelectorAll(".wp-aio-source");
  const homeAudio = document.querySelector("[data-home-audio]");
  const audioPip = document.querySelector(".audio-pip");
  const audioPipOpen = document.querySelector(".audio-pip-open");
  const audioPipClose = document.querySelector(".audio-pip-close");
  const audioPlayerView = document.querySelector(".audio-player-view");
  const audioPlayerClose = document.querySelector(".audio-player-close");
  const audioPlayButtons = document.querySelectorAll(".audio-pip-play, .audio-player-play");
  const audioRewind = document.querySelector(".audio-rewind");
  const audioForward = document.querySelector(".audio-forward");
  const audioProgress = document.querySelector(".audio-progress");
  const audioFill = document.querySelector(".audio-progress b");
  const audioThumb = document.querySelector(".audio-progress i");
  const audioCurrent = document.querySelector(".audio-current");
  const audioRemaining = document.querySelector(".audio-remaining");

  let audioMode = "headline";
  let aioUtterance = null;
  let aioPlaying = false;

  function updateHomeAudioPlayer() {
    if (!homeAudio) return;

    if (audioMode === "aio") {
      audioPlayButtons.forEach((button) => button.classList.toggle("is-audio-playing", aioPlaying));
      return;
    }

    const duration = Number.isFinite(homeAudio.duration) ? homeAudio.duration : 0;
    const current = Number.isFinite(homeAudio.currentTime) ? homeAudio.currentTime : 0;
    const progress = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    const remaining = duration > 0 ? Math.max(0, duration - current) : 0;
    const isPlaying = !homeAudio.paused;

    if (audioFill) audioFill.style.width = `${progress}%`;
    if (audioThumb) audioThumb.style.left = `${progress}%`;
    if (audioCurrent) audioCurrent.textContent = formatAudioTime(current);
    if (audioRemaining) audioRemaining.textContent = `-${formatAudioTime(remaining)}`;
    audioPlayButtons.forEach((button) => button.classList.toggle("is-audio-playing", isPlaying));
  }

  function showHomeAudioPip() {
    if (!audioPip) return;
    audioPip.hidden = false;
    const pipTitle = audioPip.querySelector(".audio-pip-open span");
    if (pipTitle) {
      pipTitle.textContent = audioMode === "aio" ? "Update pilihan hari ini..." : "Menkeu Pastikan Program Fiskal...";
    }
    updateHomeAudioPlayer();
  }

  function hideHomeAudioPip() {
    if (!audioPip) return;
    audioPip.hidden = true;
  }

  function openHomeAudioPlayer(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!audioPlayerView) return;
    audioPlayerView.hidden = false;
    audioPlayerView.classList.remove("is-leaving");
    hideHomeAudioPip();
    updateHomeAudioPlayer();
  }

  function minimizeHomeAudioPlayer(event) {
    event?.preventDefault();
    audioPlayerView?.classList.add("is-leaving");
    window.setTimeout(() => {
      if (audioPlayerView) {
        audioPlayerView.hidden = true;
        audioPlayerView.classList.remove("is-leaving");
      }
      showHomeAudioPip();
    }, 240);
  }

  function playAioSpeech() {
    if (!("speechSynthesis" in window)) return;
    homeAudio?.pause();
    window.speechSynthesis.cancel();
    aioUtterance = new SpeechSynthesisUtterance(AIO_SPEECH_TEXT);
    aioUtterance.lang = "id-ID";
    aioUtterance.rate = 1;
    aioUtterance.onend = () => {
      aioPlaying = false;
      updateHomeAudioPlayer();
    };
    aioUtterance.onerror = () => {
      aioPlaying = false;
      updateHomeAudioPlayer();
    };
    aioPlaying = true;
    window.speechSynthesis.speak(aioUtterance);
    updateHomeAudioPlayer();
  }

  function toggleHomeAudio(event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (audioMode === "aio") {
      if (!("speechSynthesis" in window)) return;
      if (aioPlaying) {
        window.speechSynthesis.pause();
        aioPlaying = false;
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        aioPlaying = true;
      } else {
        playAioSpeech();
      }
      updateHomeAudioPlayer();
      return;
    }

    if (!homeAudio) return;
    if (homeAudio.paused) {
      homeAudio.play().catch(() => {});
    } else {
      homeAudio.pause();
    }
    updateHomeAudioPlayer();
  }

  function seekHomeAudioBy(seconds) {
    if (!homeAudio) return;
    const duration = Number.isFinite(homeAudio.duration) ? homeAudio.duration : homeAudio.currentTime + seconds;
    homeAudio.currentTime = Math.min(Math.max(homeAudio.currentTime + seconds, 0), duration);
    updateHomeAudioPlayer();
  }

  function seekHomeAudioFromProgress(event) {
    if (!homeAudio || !audioProgress || !Number.isFinite(homeAudio.duration)) return;
    const rect = audioProgress.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    homeAudio.currentTime = ratio * homeAudio.duration;
    updateHomeAudioPlayer();
  }

  function collapseWpAio() {
    if (!wpAioSection) return;
    wpAioSection.classList.remove("is-open");
    wpAioExpand?.setAttribute("aria-expanded", "false");
  }

  headlineAudioButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    audioMode = "headline";
    aioPlaying = false;
    window.speechSynthesis?.cancel();
    showHomeAudioPip();
    homeAudio?.play().catch(() => {});
    updateHomeAudioPlayer();
  });

  wpAioExpand?.addEventListener("click", () => {
    if (!wpAioSection) return;
    wpAioSection.classList.add("is-open");
    wpAioExpand.setAttribute("aria-expanded", "true");
  });

  wpAioClose?.addEventListener("click", collapseWpAio);
  wpAioHide?.addEventListener("click", collapseWpAio);
  wpAioSources.forEach((source) => source.addEventListener("click", (event) => event.preventDefault()));

  wpAioPlay?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    audioMode = "aio";
    openHomeAudioPlayer(event);
    playAioSpeech();
  });

  audioPlayButtons.forEach((button) => button.addEventListener("click", toggleHomeAudio));
  audioPipOpen?.addEventListener("click", openHomeAudioPlayer);
  audioPipClose?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    homeAudio?.pause();
    window.speechSynthesis?.cancel();
    aioPlaying = false;
    hideHomeAudioPip();
    updateHomeAudioPlayer();
  });
  audioPlayerClose?.addEventListener("click", minimizeHomeAudioPlayer);
  audioRewind?.addEventListener("click", () => seekHomeAudioBy(-15));
  audioForward?.addEventListener("click", () => seekHomeAudioBy(15));
  audioProgress?.addEventListener("click", seekHomeAudioFromProgress);
  homeAudio?.addEventListener("loadedmetadata", updateHomeAudioPlayer);
  homeAudio?.addEventListener("timeupdate", updateHomeAudioPlayer);
  homeAudio?.addEventListener("play", updateHomeAudioPlayer);
  homeAudio?.addEventListener("pause", updateHomeAudioPlayer);
  homeAudio?.addEventListener("ended", updateHomeAudioPlayer);
}
