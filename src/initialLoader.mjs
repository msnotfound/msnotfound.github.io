export function initInitialLoader(root = document, options = {}) {
  const loader = root.querySelector("[data-loader]");
  if (!loader) return { destroy() {} };

  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  const delay = options.delay ?? 700;
  const startButton = loader.querySelector("[data-loader-start]");
  const silentButton = loader.querySelector("[data-loader-silent]");
  const count = loader.querySelector("[data-loader-count]");
  const background = [...(root.body?.children ?? [])]
    .filter((element) => element !== loader)
    .map((element) => ({ element, wasInert: element.inert }));
  let timer = 0;
  let countFrame = 0;
  let countStartedAt = 0;
  let isReady = false;
  let hasEntered = false;
  let isDestroyed = false;

  const setCount = (value) => {
    if (!count) return;
    count.textContent = String(Math.round(value)).padStart(2, "0");
  };

  const renderCount = (timestamp) => {
    if (isDestroyed || isReady) return;
    if (!countStartedAt) countStartedAt = timestamp;
    const progress = Math.min((timestamp - countStartedAt) / delay, 1);
    setCount(progress * 100);
    if (progress < 1) {
      countFrame = view.requestAnimationFrame(renderCount);
    } else {
      countFrame = 0;
    }
  };

  const restorePage = () => {
    background.forEach(({ element, wasInert }) => { element.inert = wasInert; });
    root.body?.classList.remove("is-loading");
  };

  const complete = (event) => {
    if (!isReady || hasEntered || isDestroyed) return;
    hasEntered = true;
    loader.dataset.loaded = "true";
    restorePage();
    const focusTarget = root.querySelector("[data-mask-root]");
    focusTarget?.setAttribute("tabindex", "-1");
    focusTarget?.focus({ preventScroll: true });
    loader.setAttribute("aria-hidden", "true");
    // Dispatch synchronously so audio.play() retains the Start click's activation.
    view.dispatchEvent(new view.CustomEvent("loader:complete", {
      detail: { loader, sound: event?.currentTarget !== silentButton },
    }));
  };

  const ready = () => {
    if (isDestroyed) return;
    isReady = true;
    if (countFrame) view.cancelAnimationFrame(countFrame);
    countFrame = 0;
    setCount(100);
    loader.dataset.ready = "true";
    loader.setAttribute("aria-busy", "false");
    if (startButton) {
      startButton.disabled = false;
      if (silentButton) silentButton.disabled = false;
      startButton.focus({ preventScroll: true });
    } else {
      complete();
    }
  };

  const queueReady = () => {
    view.clearTimeout(timer);
    if (countFrame) view.cancelAnimationFrame(countFrame);
    countStartedAt = 0;
    countFrame = view.requestAnimationFrame(renderCount);
    timer = view.setTimeout(ready, delay);
  };

  root.body?.classList.add("is-loading");
  background.forEach(({ element }) => { element.inert = true; });
  startButton?.addEventListener("click", complete);
  silentButton?.addEventListener("click", complete);

  if (root.readyState === "complete") {
    queueReady();
  } else {
    view.addEventListener("load", queueReady, { once: true });
  }

  return {
    destroy() {
      isDestroyed = true;
      view.clearTimeout?.(timer);
      if (countFrame) view.cancelAnimationFrame(countFrame);
      view.removeEventListener("load", queueReady);
      startButton?.removeEventListener("click", complete);
      silentButton?.removeEventListener("click", complete);
      restorePage();
      loader.dataset.loaded = "true";
      loader.setAttribute("aria-hidden", "true");
    },
  };
}
