const STORAGE_KEY = "mayank-portfolio-sound";

export function resolveSoundPreference(storedValue) {
  return storedValue !== "off";
}

export function computeFadeVolume(elapsedMs, fadeMs, targetVolume) {
  const duration = Math.max(1, fadeMs);
  const progress = Math.min(Math.max(elapsedMs / duration, 0), 1);
  const eased = progress * progress * (3 - 2 * progress);

  return Number((targetVolume * eased).toFixed(3));
}

export function shouldAttemptAmbientStart({
  isEnabled,
  isLoaderComplete,
  isPlayPending,
  paused,
}) {
  return Boolean(isEnabled && isLoaderComplete && !isPlayPending && paused);
}

export function createAmbientAudioController(root = document, options = {}) {
  const button = root.querySelector("[data-sound-toggle]");
  const audio = root.querySelector("[data-ambient-audio]");
  if (!button || !audio) return { destroy() {} };

  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  let storage = options.storage;
  try { storage ??= view.localStorage; } catch { /* Private contexts may deny storage access. */ }
  const body = root.body ?? root.documentElement;
  const targetVolume = options.volume ?? 0.22;
  const fadeMs = options.fadeMs ?? 700;
  const loader = root.querySelector("[data-loader]");
  let isEnabled = true;
  try { isEnabled = resolveSoundPreference(storage?.getItem(STORAGE_KEY)); } catch { /* Optional preference storage. */ }
  let isLoaderComplete = !loader || loader.dataset.loaded === "true";
  let isPlayPending = false;
  let isDestroyed = false;
  let playRequest = 0;
  let fadeFrame = 0;
  let fadeStartedAt = 0;

  const setButtonState = () => {
    const isPlaying = isEnabled && !audio.paused;
    button.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    button.setAttribute(
      "aria-label",
      isPlaying ? "Pause background music" : "Play background music",
    );
    button.setAttribute("title", isPlaying ? "Pause background music" : isEnabled ? "Sound enabled; tap to start" : "Play background music");
    body?.setAttribute("data-sound-enabled", isEnabled ? "true" : "false");
    body?.setAttribute("data-sound-playing", isPlaying ? "true" : "false");
  };

  const savePreference = () => {
    try {
      storage?.setItem(STORAGE_KEY, isEnabled ? "on" : "off");
    } catch {
      // Storage can be blocked; audio should still remain controllable.
    }
  };

  const cancelFade = () => {
    if (fadeFrame) {
      view.cancelAnimationFrame(fadeFrame);
      fadeFrame = 0;
    }
  };

  const fadeIn = (timestamp) => {
    if (!isEnabled || isDestroyed || audio.paused) {
      fadeFrame = 0;
      return;
    }
    if (!fadeStartedAt) fadeStartedAt = timestamp;
    audio.volume = computeFadeVolume(timestamp - fadeStartedAt, fadeMs, targetVolume);

    if (audio.volume < targetVolume && isEnabled) {
      fadeFrame = view.requestAnimationFrame(fadeIn);
    } else {
      audio.volume = targetVolume;
      fadeFrame = 0;
    }
  };

  const start = async () => {
    if (
      isDestroyed ||
      !shouldAttemptAmbientStart({
        isEnabled,
        isLoaderComplete,
        isPlayPending,
        paused: audio.paused,
      })
    ) {
      return;
    }

    isPlayPending = true;
    const request = ++playRequest;
    cancelFade();
    audio.volume = 0;
    fadeStartedAt = 0;

    try {
      await audio.play();
      if (request !== playRequest || !isEnabled || isDestroyed) return;
      view.removeEventListener("click", handleGestureRetry);
      fadeFrame = view.requestAnimationFrame(fadeIn);
    } catch {
      // Mobile browsers may require the next tap after the loader is gone.
    } finally {
      if (request === playRequest) {
        isPlayPending = false;
        setButtonState();
      }
    }
  };

  const stop = () => {
    playRequest++;
    isPlayPending = false;
    cancelFade();
    audio.pause();
    audio.volume = 0;
    setButtonState();
  };

  const toggle = async () => {
    // A blocked autoplay is still an enabled preference, but the next press means Play.
    isEnabled = !(isPlayPending || !audio.paused);
    savePreference();
    setButtonState();

    if (isEnabled) {
      await start();
    } else {
      await stop();
    }
  };

  const handleLoaderComplete = (event) => {
    isLoaderComplete = true;
    if (typeof event.detail?.sound === "boolean") {
      isEnabled = event.detail.sound;
      savePreference();
      setButtonState();
    }
    start();
  };

  const handleGestureRetry = (event) => {
    if (button.contains(event.target)) return;
    start();
  };

  button.addEventListener("click", toggle);
  view.addEventListener("loader:complete", handleLoaderComplete);
  view.addEventListener("click", handleGestureRetry);
  audio.addEventListener("playing", setButtonState);
  audio.addEventListener("pause", setButtonState);
  audio.volume = 0;
  setButtonState();

  if (isLoaderComplete) {
    start();
  }

  return {
    destroy() {
      isDestroyed = true;
      button.removeEventListener("click", toggle);
      view.removeEventListener("loader:complete", handleLoaderComplete);
      view.removeEventListener("click", handleGestureRetry);
      audio.removeEventListener("playing", setButtonState);
      audio.removeEventListener("pause", setButtonState);
      stop();
    },
  };
}
