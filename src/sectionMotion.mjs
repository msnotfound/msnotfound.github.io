const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function sectionProgress(rect, viewportHeight) {
  return Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height)));
}

export function createSectionMotionController(root = document) {
  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  const sections = [...root.querySelectorAll("[data-motion-section]")].map((element) => ({
    element,
    active: false,
    current: null,
    target: 0,
    layers: [...element.querySelectorAll("[data-parallax]")].map((element) => ({
      element,
      originalTransform: element.style.transform,
      lastTransform: null,
    })),
  }));
  if (!sections.length || !view.IntersectionObserver) return { destroy() {} };

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = view.matchMedia("(max-width: 900px), (pointer: coarse)");
  const revealTargets = [...root.querySelectorAll("[data-motion-enter]")];
  const seen = new WeakSet();
  const entrances = new Map();
  const sectionByElement = new Map(sections.map((section) => [section.element, section]));
  let scrollAnimations = [];
  let observer;
  let frame = 0;
  let previousTime = 0;
  let dirty = true;
  let nativeScroll = false;
  let running = false;
  let ready = !root.querySelector("[data-loader]") || root.querySelector("[data-loader]").dataset.loaded === "true";
  let destroyed = false;

  const distance = (layer) => (layer.element.dataset.parallax === "title" ? 28 : 10) * (compact.matches ? 0.45 : 1);
  const stopFrame = () => {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };

  const render = (time) => {
    frame = 0;
    if (!running || root.hidden) return;
    const visible = sections.filter((section) => section.active);
    // Measure the stationary sections before writing any child transforms.
    if (dirty) {
      const measurements = visible.map((section) => section.element.getBoundingClientRect());
      visible.forEach((section, index) => {
        section.target = 1 - 2 * sectionProgress(measurements[index], view.innerHeight || 1);
      });
      dirty = false;
    }
    const elapsed = previousTime ? Math.min(64, time - previousTime) : 16.67;
    previousTime = time;
    const ease = compact.matches ? 1 : 1 - Math.exp(-elapsed / 90);
    let moving = false;
    visible.forEach((section) => {
      if (section.current === null) section.current = section.target;
      section.current += (section.target - section.current) * ease;
      if (Math.abs(section.target - section.current) < 0.001) section.current = section.target;
      else moving = true;
      section.layers.forEach((layer) => {
        const transform = `translate3d(0, ${(section.current * distance(layer)).toFixed(2)}px, 0)`;
        if (transform !== layer.lastTransform) {
          layer.element.style.transform = transform;
          layer.lastTransform = transform;
        }
      });
    });
    if (moving) frame = view.requestAnimationFrame(render);
    else previousTime = 0;
  };

  const schedule = () => {
    dirty = true;
    if (running && !nativeScroll && !root.hidden && !frame && sections.some((section) => section.active)) {
      frame = view.requestAnimationFrame(render);
    }
  };

  const finishEntrance = (element) => {
    entrances.get(element)?.cancel();
    entrances.delete(element);
  };

  const enter = (entry, delay) => {
    const element = entry.target;
    if (seen.has(element)) return;
    seen.add(element);
    observer.unobserve(element);
    if (root.hidden || entry.boundingClientRect.bottom <= 0 || element.contains(root.activeElement)) return;
    if (!element.animate) return;
    // Content is visible by default; only an actual entrance owns its opacity.
    const animation = element.animate([
      { opacity: 0, transform: `translate3d(0, ${compact.matches ? 10 : 18}px, 0)` },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ], { duration: compact.matches ? 480 : 640, delay, easing: EASE, fill: "backwards" });
    entrances.set(element, animation);
    animation.onfinish = () => finishEntrance(element);
  };

  const focus = (event) => {
    const element = event.target.closest?.("[data-motion-enter]");
    if (!element) return;
    seen.add(element);
    observer?.unobserve(element);
    finishEntrance(element);
  };

  const visibility = () => {
    if (root.hidden) {
      stopFrame();
      [...entrances.keys()].forEach(finishEntrance);
    } else schedule();
  };

  const stop = () => {
    running = false;
    observer?.disconnect();
    stopFrame();
    [...entrances.keys()].forEach(finishEntrance);
    scrollAnimations.forEach((animation) => animation.cancel());
    scrollAnimations = [];
    view.removeEventListener("scroll", schedule);
    view.removeEventListener("resize", schedule);
    root.removeEventListener("focusin", focus);
    root.removeEventListener("visibilitychange", visibility);
    sections.forEach((section) => {
      delete section.element.dataset.motionReady;
      section.active = false;
      section.current = null;
      section.layers.forEach((layer) => {
        layer.element.style.transform = layer.originalTransform;
        layer.lastTransform = null;
      });
    });
  };

  const start = () => {
    stop();
    if (destroyed || !ready || reduced.matches) return;
    running = true;
    nativeScroll = false;
    // Native timelines follow scrolling without a JavaScript ticker.
    if (view.ViewTimeline) {
      try {
        sections.forEach((section) => {
          const timeline = new view.ViewTimeline({ subject: section.element, axis: "block" });
          section.layers.forEach((layer) => {
            const travel = distance(layer);
            scrollAnimations.push(layer.element.animate({
              transform: [`translate3d(0, ${travel}px, 0)`, `translate3d(0, ${-travel}px, 0)`],
            }, { timeline, fill: "both", easing: "linear" }));
          });
        });
        nativeScroll = true;
      } catch {
        scrollAnimations.forEach((animation) => animation.cancel());
        scrollAnimations = [];
      }
    }

    observer = new view.IntersectionObserver((entries) => {
      if (!running) return;
      const groupCounts = new Map();
      entries.forEach((entry) => {
        const section = sectionByElement.get(entry.target);
        if (section) {
          section.active = entry.isIntersecting;
          if (entry.isIntersecting) section.element.dataset.sectionEntered = "true";
          else section.current = null;
        } else if (entry.isIntersecting) {
          const group = entry.target.parentElement;
          const index = groupCounts.get(group) ?? 0;
          groupCounts.set(group, index + 1);
          enter(entry, Math.min(index, 3) * (compact.matches ? 35 : 60));
        }
      });
      schedule();
    }, { rootMargin: "0px 0px 6% 0px", threshold: 0 });
    sections.forEach((section) => {
      section.element.dataset.motionReady = "true";
      observer.observe(section.element);
    });
    revealTargets.filter((element) => !seen.has(element)).forEach((element) => observer.observe(element));
    if (!nativeScroll) {
      view.addEventListener("scroll", schedule, { passive: true });
      view.addEventListener("resize", schedule, { passive: true });
    }
    root.addEventListener("focusin", focus);
    root.addEventListener("visibilitychange", visibility);
  };

  const loaderComplete = () => { ready = true; start(); };
  view.addEventListener("loader:complete", loaderComplete);
  reduced.addEventListener("change", start);
  compact.addEventListener("change", start);
  start();

  return {
    destroy() {
      destroyed = true;
      stop();
      view.removeEventListener("loader:complete", loaderComplete);
      reduced.removeEventListener("change", start);
      compact.removeEventListener("change", start);
      sections.forEach((section) => { delete section.element.dataset.sectionEntered; });
    },
  };
}
