const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const IST_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function computeSpatialPointer(clientX, clientY, width, height) {
  const x = clamp((clientX / Math.max(width, 1) - 0.5) * 2, -1, 1);
  const y = clamp((clientY / Math.max(height, 1) - 0.5) * 2, -1, 1);

  return {
    x,
    y,
    gridX: `${Math.round(x * -8)}px`,
    gridY: `${Math.round(y * -8)}px`,
    foreground: `translate3d(${(x * 7).toFixed(2)}px, ${(y * 5).toFixed(2)}px, 0)`,
  };
}

export function computeWorkRowDrift(rect, viewportHeight, index, compact = false) {
  const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
  const direction = index % 2 === 0 ? -1 : 1;
  const amplitude = compact ? 8 : 18;
  const y = Math.sin((progress - 0.5) * Math.PI) * amplitude * direction;
  const x = compact ? 0 : Math.sin(progress * Math.PI) * 8 * direction;

  return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
}

export function formatIstClock(date = new Date()) {
  return `${IST_FORMAT.format(date)} IST`;
}

export function computeCountValue(progress, target, prefix = "") {
  const eased = progress * progress * (3 - 2 * progress);
  return `${prefix}${Math.round(target * eased).toString().padStart(target < 10 ? 1 : 2, "0")}`;
}

export function createSpatialFolioController(root = document, options = {}) {
  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  const stage = root.querySelector("[data-mask-root]");
  const heroStack = stage?.querySelector(".hero-stack");
  const telemetry = root.querySelector("[data-system-telemetry]");
  const clock = root.querySelector("[data-ist-clock]");
  const counters = [...root.querySelectorAll("[data-count-to]")].map((element) => ({
    element,
    target: Number(element.dataset.countTo || 0),
    prefix: element.dataset.countPrefix || "",
  }));
  const rows = [...root.querySelectorAll("[data-work-list] a")].map((element, index) => ({
    element,
    index,
    originalTransform: element.style.transform,
    lastTransform: "",
  }));
  const tiltCards = [...root.querySelectorAll(".research-entry, .capability-item, .notes-contact-list a")];
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = view.matchMedia("(max-width: 900px), (pointer: coarse)");
  const finePointer = view.matchMedia("(hover: hover) and (pointer: fine)");
  const loader = root.querySelector("[data-loader]");
  let ready = !loader || loader.dataset.loaded === "true";
  let destroyed = false;
  let pointerFrame = 0;
  let scrollFrame = 0;
  let clockTimer = 0;
  let counterFrame = 0;
  let countStartedAt = 0;
  let lastPointer = null;
  let observer = null;
  let isRowsActive = false;

  const setClock = () => {
    if (!clock) return;
    const now = new Date();
    const label = formatIstClock(now);
    clock.textContent = label;
    clock.dateTime = now.toISOString();
  };

  const startClock = () => {
    setClock();
    clockTimer = view.setInterval(setClock, options.clockInterval ?? 1000);
  };

  const stopClock = () => {
    if (clockTimer) view.clearInterval(clockTimer);
    clockTimer = 0;
  };

  const renderCounters = (timestamp) => {
    if (destroyed || reduced.matches) return;
    if (!countStartedAt) countStartedAt = timestamp;
    const progress = clamp((timestamp - countStartedAt) / (options.countDuration ?? 960), 0, 1);
    counters.forEach(({ element, target, prefix }) => {
      element.textContent = computeCountValue(progress, target, prefix);
    });
    if (progress < 1) counterFrame = view.requestAnimationFrame(renderCounters);
    else counterFrame = 0;
  };

  const startCounters = () => {
    if (!counters.length || counterFrame || countStartedAt) return;
    counterFrame = view.requestAnimationFrame(renderCounters);
  };

  const renderPointer = () => {
    pointerFrame = 0;
    if (!lastPointer || !stage || !heroStack || destroyed || reduced.matches) return;
    const spatial = computeSpatialPointer(
      lastPointer.clientX,
      lastPointer.clientY,
      view.innerWidth || 1,
      view.innerHeight || 1,
    );
    stage.style.setProperty("--stage-grid-x", spatial.gridX);
    stage.style.setProperty("--stage-grid-y", spatial.gridY);
    heroStack.style.setProperty("--hero-depth-transform", spatial.foreground);
  };

  const pointerMove = (event) => {
    if (!finePointer.matches || event.pointerType === "touch") return;
    lastPointer = event;
    if (!pointerFrame) pointerFrame = view.requestAnimationFrame(renderPointer);
  };

  const pointerLeave = () => {
    lastPointer = null;
    stage?.style.setProperty("--stage-grid-x", "0px");
    stage?.style.setProperty("--stage-grid-y", "0px");
    heroStack?.style.setProperty("--hero-depth-transform", "translate3d(0, 0, 0)");
  };

  const renderRows = () => {
    scrollFrame = 0;
    if (!isRowsActive || destroyed || reduced.matches) return;
    const viewportHeight = view.innerHeight || 1;
    rows.forEach((row) => {
      const transform = computeWorkRowDrift(
        row.element.getBoundingClientRect(),
        viewportHeight,
        row.index,
        compact.matches,
      );
      if (transform !== row.lastTransform) {
        row.element.style.transform = transform;
        row.lastTransform = transform;
      }
    });
  };

  const scheduleRows = () => {
    if (!scrollFrame && isRowsActive && !reduced.matches) {
      scrollFrame = view.requestAnimationFrame(renderRows);
    }
  };

  const attachTiltCard = (card) => {
    card.addEventListener("pointermove", tiltCardMove);
    card.addEventListener("pointerleave", tiltCardLeave);
  };

  const detachTiltCard = (card) => {
    card.removeEventListener("pointermove", tiltCardMove);
    card.removeEventListener("pointerleave", tiltCardLeave);
    card.style.removeProperty("--glare-x");
    card.style.removeProperty("--glare-y");
    card.style.removeProperty("--card-tilt");
  };

  function tiltCardMove(event) {
    if (!finePointer.matches || reduced.matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    const y = clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
    const rotateY = (x - 0.5) * 5;
    const rotateX = (0.5 - y) * 4;
    event.currentTarget.style.setProperty("--glare-x", `${Math.round(x * 100)}%`);
    event.currentTarget.style.setProperty("--glare-y", `${Math.round(y * 100)}%`);
    event.currentTarget.style.setProperty(
      "--card-tilt",
      `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, -2px, 0)`,
    );
  }

  function tiltCardLeave(event) {
    event.currentTarget.style.setProperty("--card-tilt", "perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)");
  }

  const start = () => {
    if (destroyed || !ready) return;
    startClock();
    root.documentElement?.dataset && (root.documentElement.dataset.spatialReady = "true");
    if (!reduced.matches) {
      view.addEventListener("pointermove", pointerMove, { passive: true });
      view.addEventListener("pointerleave", pointerLeave);
      view.addEventListener("scroll", scheduleRows, { passive: true });
      view.addEventListener("resize", scheduleRows, { passive: true });
      tiltCards.forEach(attachTiltCard);
      if (view.IntersectionObserver) {
        observer = new view.IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.target === telemetry && entry.isIntersecting) startCounters();
            else if (entry.target.matches?.("[data-work-list]")) {
              isRowsActive = entry.isIntersecting;
              if (isRowsActive) scheduleRows();
            }
          });
        }, { rootMargin: "12% 0px 12% 0px", threshold: 0 });
        if (telemetry) observer.observe(telemetry);
        const workList = root.querySelector("[data-work-list]");
        if (workList) observer.observe(workList);
      }
    }
  };

  const stop = () => {
    stopClock();
    view.removeEventListener("pointermove", pointerMove);
    view.removeEventListener("pointerleave", pointerLeave);
    view.removeEventListener("scroll", scheduleRows);
    view.removeEventListener("resize", scheduleRows);
    observer?.disconnect();
    observer = null;
    if (pointerFrame) view.cancelAnimationFrame(pointerFrame);
    if (scrollFrame) view.cancelAnimationFrame(scrollFrame);
    if (counterFrame) view.cancelAnimationFrame(counterFrame);
    pointerFrame = 0;
    scrollFrame = 0;
    counterFrame = 0;
    isRowsActive = false;
    pointerLeave();
    tiltCards.forEach(detachTiltCard);
    rows.forEach((row) => {
      row.element.style.transform = row.originalTransform;
      row.lastTransform = "";
    });
    root.documentElement?.removeAttribute("data-spatial-ready");
  };

  const loaderComplete = () => {
    ready = true;
    start();
  };

  const mediaChange = () => {
    stop();
    start();
  };

  view.addEventListener("loader:complete", loaderComplete);
  reduced.addEventListener("change", mediaChange);
  compact.addEventListener("change", mediaChange);
  finePointer.addEventListener("change", mediaChange);
  start();

  return {
    destroy() {
      destroyed = true;
      stop();
      view.removeEventListener("loader:complete", loaderComplete);
      reduced.removeEventListener("change", mediaChange);
      compact.removeEventListener("change", mediaChange);
      finePointer.removeEventListener("change", mediaChange);
    },
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
