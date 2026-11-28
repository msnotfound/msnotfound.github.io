export function computeMaskPosition(pointerEvent, rect) {
  const x = clamp(pointerEvent.clientX - rect.left, 0, rect.width);
  const y = clamp(pointerEvent.clientY - rect.top, 0, rect.height);

  return {
    x,
    y,
    xCss: `${Math.round(x)}px`,
    yCss: `${Math.round(y)}px`,
  };
}

export function computeLayeredMaskPosition(pointerEvent, maskRect) {
  return {
    mask: computeMaskPosition(pointerEvent, maskRect),
    cursor: {
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
      xCss: `${Math.round(pointerEvent.clientX)}px`,
      yCss: `${Math.round(pointerEvent.clientY)}px`,
    },
  };
}

export function computeTouchMaskUpdate(touchEvent, rect, revealSize = 220) {
  const touch = touchEvent.touches?.[0];
  if (!touch) return null;

  const position = computeMaskPosition(
    {
      clientX: touch.clientX,
      clientY: touch.clientY,
    },
    rect,
  );

  return {
    x: position.x,
    y: position.y,
    xCss: position.xCss,
    yCss: position.yCss,
    sizeCss: `${revealSize}px`,
  };
}

export function computeCenteredRevealMask(rect, scale = 1.5) {
  return {
    xCss: `${Math.round(rect.width / 2)}px`,
    yCss: `${Math.round(rect.height / 2)}px`,
    sizeCss: `${Math.round(Math.max(rect.width, rect.height) * scale)}px`,
  };
}

export function computePillVisibility(heroBottom, threshold = 100) {
  const isVisible = heroBottom >= threshold;

  return {
    isVisible,
    opacity: isVisible ? "1" : "0",
    pointerEvents: isVisible ? "auto" : "none",
  };
}

export function computeRadialFloodOrigin(pillRect, floodRect) {
  const x = pillRect.left + pillRect.width / 2 - floodRect.left;
  const y = pillRect.top + pillRect.height / 2 - floodRect.top;

  return {
    x,
    y,
    xCss: `${Math.round(x)}px`,
    yCss: `${Math.round(y)}px`,
  };
}

export function shouldTriggerHoldReveal(elapsedMs, holdDelay = 260) {
  return elapsedMs >= holdDelay;
}

export function computeMobileParallax(scrollY, viewportHeight) {
  const clampedScroll = clamp(scrollY, 0, viewportHeight);
  const y = clampedScroll * 0.18;
  const opacity = clamp(1 - scrollY / (viewportHeight * 0.75), 0, 1);

  return {
    y,
    opacity,
    css: `translate3d(0, ${Math.round(y)}px, 0)`,
  };
}

export function computeTeleprompterProgress(rectTop, viewportHeight, options = {}) {
  const triggerStart = options.triggerStart ?? 0.88;
  const triggerEnd = options.triggerEnd ?? 0.38;
  const startPx = viewportHeight * triggerStart;
  const endPx = viewportHeight * triggerEnd;
  const range = startPx - endPx || 1;
  const rawProgress = (startPx - rectTop) / range;

  return Number(clamp(rawProgress, 0, 1).toFixed(3));
}

export function computeTeleprompterWordStates(progress, wordCount) {
  if (wordCount <= 0) return [];

  const litCount = progress <= 0
    ? 0
    : Math.ceil(clamp(progress, 0, 1) * wordCount);

  return Array.from({ length: wordCount }, (_, index) => index < litCount);
}

export function computeTiltParallax(orientationEvent, maxOffset = 12) {
  const gamma = clamp(orientationEvent.gamma || 0, -30, 30);
  const beta = clamp((orientationEvent.beta || 0) - 45, -30, 30);
  const x = Math.round((gamma / 30) * maxOffset);
  const y = Math.round((beta / 30) * maxOffset);

  return {
    x,
    y,
    css: `translate3d(${x}px, ${y}px, 0)`,
  };
}

export function computeMaskBounds(viewport, inset) {
  return {
    left: inset.left,
    top: inset.top,
    width: Math.max(0, viewport.width - inset.left - inset.right),
    height: Math.max(0, viewport.height - inset.top - inset.bottom),
  };
}

export function interpolatePosition(current, target, ease) {
  return {
    x: current.x + (target.x - current.x) * ease,
    y: current.y + (target.y - current.y) * ease,
  };
}

export function computeMagneticTransform(pointerEvent, rect, strength = 0.28) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const x = Math.round((pointerEvent.clientX - centerX) * strength);
  const y = Math.round((pointerEvent.clientY - centerY) * strength);

  return {
    x,
    y,
    css: `translate3d(${x}px, ${y}px, 0)`,
  };
}

export function computeFloatingPreviewPosition(
  pointerEvent,
  viewport,
  previewSize,
  offset = 28,
) {
  const x = clamp(
    pointerEvent.clientX + offset,
    offset,
    viewport.width - previewSize.width - offset,
  );
  const y = clamp(
    pointerEvent.clientY + offset,
    offset,
    viewport.height - previewSize.height - offset,
  );

  return {
    x,
    y,
    css: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
  };
}

export function getMaskSizeForInteraction(state) {
  const sizes = {
    idle: 0,
    compressed: 42,
    expanded: 280,
  };

  return sizes[state] ?? sizes.idle;
}

export function isMaskExpansionTarget(target) {
  return Boolean(target?.closest?.("[data-mask-target]"));
}

export function getMaskSizeForTarget(isTarget, sizes = {}) {
  return isTarget
    ? (sizes.expanded ?? getMaskSizeForInteraction("expanded"))
    : (sizes.idle ?? getMaskSizeForInteraction("idle"));
}

export function getPreviewMotionConfig() {
  return {
    ease: 0.048,
    offset: 48,
    width: 360,
    height: 342,
    gap: 84,
  };
}

export function computePreviewTrackOffset(index, itemHeight, gap = 0) {
  const y = -Math.max(0, index) * (itemHeight + gap);

  return {
    y,
    css: `translate3d(0, ${Math.round(y)}px, 0)`,
  };
}

export function decidePreviewIndex(pointerY, itemRects, currentIndex = -1, hysteresis = 18) {
  const currentRect = itemRects[currentIndex];
  if (
    currentRect &&
    pointerY >= currentRect.top - hysteresis &&
    pointerY <= currentRect.bottom + hysteresis
  ) {
    return currentIndex;
  }

  return itemRects.findIndex((rect) => pointerY >= rect.top && pointerY <= rect.bottom);
}

export function createCursorMaskController(root, options = {}) {
  if (!root) {
    throw new Error("createCursorMaskController requires a root element");
  }

  const cursor =
    options.cursorElement ??
    root.querySelector("[data-mask-cursor]") ??
    root.ownerDocument?.querySelector("[data-mask-cursor]");
  const maskSurface = root.querySelector("[data-mask-surface]") || root;
  const expandedMaskSize =
    options.expandedMaskSize ?? getMaskSizeForInteraction("expanded");
  const idleMaskSize = options.idleMaskSize ?? getMaskSizeForInteraction("idle");
  const ease = options.ease ?? 0.18;
  let hasPointer = false;
  let pendingPointer = null;
  let lastPointer = null;
  let lastMaskSize;
  let animationFrame = 0;
  let current = { x: maskSurface.clientWidth / 2, y: maskSurface.clientHeight / 2 };
  let target = { ...current };
  let cursorCurrent = {
    x: root.ownerDocument?.defaultView?.innerWidth / 2 || 0,
    y: root.ownerDocument?.defaultView?.innerHeight / 2 || 0,
  };
  let cursorTarget = { ...cursorCurrent };

  const setMaskSize = (size) => {
    if (size === lastMaskSize) return;
    lastMaskSize = size;
    maskSurface.style.setProperty("--mask-size", `${size}px`);
  };

  const setTargetPosition = (event) => {
    pendingPointer = { clientX: event.clientX, clientY: event.clientY };
    lastPointer = pendingPointer;
    startAnimation();
  };

  const renderPosition = () => {
    if (pendingPointer) {
      const positions = computeLayeredMaskPosition(pendingPointer, maskSurface.getBoundingClientRect());
      target = { x: positions.mask.x, y: positions.mask.y };
      cursorTarget = { x: positions.cursor.x, y: positions.cursor.y };
      pendingPointer = null;
    }
    current = interpolatePosition(current, target, ease);
    cursorCurrent = interpolatePosition(cursorCurrent, cursorTarget, ease);
    const xCss = `${Math.round(current.x)}px`;
    const yCss = `${Math.round(current.y)}px`;
    const cursorXCss = `${Math.round(cursorCurrent.x)}px`;
    const cursorYCss = `${Math.round(cursorCurrent.y)}px`;

    maskSurface.style.setProperty("--mask-x", xCss);
    maskSurface.style.setProperty("--mask-y", yCss);

    if (cursor) {
      cursor.style.transform = `translate3d(${cursorXCss}, ${cursorYCss}, 0) translate(-50%, -50%)`;
    }

    const deltaX = Math.abs(current.x - target.x);
    const deltaY = Math.abs(current.y - target.y);
    const cursorDeltaX = Math.abs(cursorCurrent.x - cursorTarget.x);
    const cursorDeltaY = Math.abs(cursorCurrent.y - cursorTarget.y);
    if (deltaX > 0.5 || deltaY > 0.5 || cursorDeltaX > 0.5 || cursorDeltaY > 0.5) {
      animationFrame = targetWindow.requestAnimationFrame(renderPosition);
    } else {
      animationFrame = 0;
    }
  };

  const startAnimation = () => {
    if (!animationFrame) {
      animationFrame = targetWindow.requestAnimationFrame(renderPosition);
    }
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === "touch") return;
    hasPointer = true;
    setTargetPosition(event);
    cursor?.classList.toggle("is-interactive", Boolean(event.target?.closest?.("a, button, [data-magnetic], .work-list a")));
    setMaskSize(
      getMaskSizeForTarget(isMaskExpansionTarget(event.target), {
        expanded: expandedMaskSize,
        idle: idleMaskSize,
      }),
    );
  };

  const handlePointerEnter = (event) => {
    handlePointerMove(event);
    root.dataset.maskActive = "true";
  };

  const handlePointerLeave = () => {
    hasPointer = false;
    setMaskSize(idleMaskSize);
    cursor?.classList.remove("is-interactive");
    root.dataset.maskActive = "false";
  };

  const handleGeometryChange = () => {
    if (hasPointer && lastPointer) setTargetPosition(lastPointer);
  };

  const targetWindow = root.ownerDocument?.defaultView ?? window;
  targetWindow.addEventListener("pointerenter", handlePointerEnter);
  targetWindow.addEventListener("pointermove", handlePointerMove);
  targetWindow.addEventListener("pointerleave", handlePointerLeave);
  targetWindow.addEventListener("blur", handlePointerLeave);
  targetWindow.addEventListener("scroll", handleGeometryChange, { passive: true });
  targetWindow.addEventListener("resize", handleGeometryChange);
  setMaskSize(idleMaskSize);

  return {
    destroy() {
      targetWindow.removeEventListener("pointerenter", handlePointerEnter);
      targetWindow.removeEventListener("pointermove", handlePointerMove);
      targetWindow.removeEventListener("pointerleave", handlePointerLeave);
      targetWindow.removeEventListener("blur", handlePointerLeave);
      targetWindow.removeEventListener("scroll", handleGeometryChange);
      targetWindow.removeEventListener("resize", handleGeometryChange);
      if (animationFrame) targetWindow.cancelAnimationFrame(animationFrame);
    },
  };
}

export function createMagneticButtonController(root = document) {
  const elements = [...root.querySelectorAll("[data-magnetic]")];

  const handleMove = (event) => {
    const element = event.currentTarget;
    const transform = computeMagneticTransform(
      event,
      element.getBoundingClientRect(),
      Number(element.dataset.magneticStrength || 0.28),
    );
    element.style.transform = transform.css;
  };

  const handleLeave = (event) => {
    event.currentTarget.style.transform = "translate3d(0px, 0px, 0)";
  };

  elements.forEach((element) => {
    element.addEventListener("pointermove", handleMove);
    element.addEventListener("pointerleave", handleLeave);
  });

  return {
    destroy() {
      elements.forEach((element) => {
        element.removeEventListener("pointermove", handleMove);
        element.removeEventListener("pointerleave", handleLeave);
      });
    },
  };
}

export function createWorkPreviewController(root = document, options = {}) {
  const preview = root.querySelector("[data-work-preview]");
  const track = root.querySelector("[data-work-preview-track]");
  const list = root.querySelector("[data-work-list]");
  const items = [...root.querySelectorAll("[data-preview-title]")];
  if (!preview || !track || !list || items.length === 0) return { destroy() {} };

  const bounce = root.querySelector("[data-work-preview-bounce]");
  const previewBtn = root.querySelector("[data-work-preview-btn]");
  const previewSpan = root.querySelector("[data-work-preview-span]");
  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  const docEl = root.documentElement ?? root.ownerDocument?.documentElement;

  let animationFrame = 0;
  let lastTime = 0;
  let hasPointer = false;
  let isActive = false;
  let activeIndex = -1;
  let bounceTimer = 0;
  let pendingListPointer = null;
  let pendingScrollCheck = false;

  let mouse = { x: (view.innerWidth || 1200) / 2, y: (view.innerHeight || 800) / 2 };
  let posImg = { ...mouse };
  let posBtn = { ...mouse };
  let posSpan = { ...mouse };

  const setActiveState = (active) => {
    const val = active ? "true" : "false";
    preview.dataset.active = val;
    if (previewBtn) previewBtn.dataset.active = val;
    if (previewSpan) previewSpan.dataset.active = val;
    if (docEl) docEl.dataset.workPreviewActive = val;
  };

  const setPressedState = (pressed) => {
    const val = pressed ? "true" : "false";
    if (previewBtn) previewBtn.dataset.pressed = val;
    if (previewSpan) previewSpan.dataset.pressed = val;
  };

  const updatePreview = (item, index) => {
    if (index === activeIndex || index < 0) return;
    const prevIndex = activeIndex;
    activeIndex = index;
    preview.dataset.variant = item.dataset.previewVariant || "default";

    const gsap = view.gsap;
    if (gsap && typeof gsap.to === "function") {
      gsap.to(track, {
        yPercent: -index * 100,
        duration: prevIndex === -1 ? 0 : 0.6,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    } else {
      track.style.transform = `translate3d(0, ${-index * 100}%, 0)`;
    }

    if (bounce && prevIndex !== -1) {
      bounce.classList.add("is-bouncing");
      view.clearTimeout?.(bounceTimer);
      bounceTimer = view.setTimeout?.(() => {
        bounce.classList.remove("is-bouncing");
      }, 220) ?? 0;
    }
  };

  // Frame-rate normalized Dennis Snellenberg chase:
  // Image /12, Circle /7, Label /6 at Dennis's 120Hz tick (8.333ms)
  const stepFactor = (divisor, dtMs) => {
    const base = 1 / divisor;
    const steps = clamp(dtMs / 8.3333, 0.4, 3.2);
    return 1 - Math.pow(1 - base, steps);
  };

  const renderPreview = (now = 0) => {
    if (pendingListPointer) {
      const itemRects = items.map((item) => item.getBoundingClientRect());
      const nextIndex = decidePreviewIndex(
        pendingListPointer.clientY,
        itemRects,
        activeIndex,
        options.hysteresis ?? 12,
      );
      if (nextIndex >= 0) updatePreview(items[nextIndex], nextIndex);
      setActiveState(true);
      pendingListPointer = null;
      pendingScrollCheck = false;
    } else if (pendingScrollCheck) {
      pendingScrollCheck = false;
      if (isActive && hasPointer) {
        const listRect = list.getBoundingClientRect();
        const inside =
          mouse.x >= listRect.left &&
          mouse.x <= listRect.right &&
          mouse.y >= listRect.top &&
          mouse.y <= listRect.bottom;
        if (inside) {
          const itemRects = items.map((item) => item.getBoundingClientRect());
          const nextIndex = decidePreviewIndex(mouse.y, itemRects, activeIndex, 10);
          if (nextIndex >= 0) updatePreview(items[nextIndex], nextIndex);
        } else {
          handleLeave();
        }
      }
    }

    const dt = lastTime ? Math.max(4, now - lastTime) : 16.67;
    lastTime = now;

    posImg = interpolatePosition(posImg, mouse, stepFactor(12, dt));
    posBtn = interpolatePosition(posBtn, mouse, stepFactor(7, dt));
    posSpan = interpolatePosition(posSpan, mouse, stepFactor(6, dt));

    preview.style.transform = `translate3d(${posImg.x.toFixed(2)}px, ${posImg.y.toFixed(2)}px, 0) translate(-50%, -52%)`;
    if (previewBtn) {
      previewBtn.style.transform = `translate3d(${posBtn.x.toFixed(2)}px, ${posBtn.y.toFixed(2)}px, 0) translate(-50%, -56%)`;
    }
    if (previewSpan) {
      previewSpan.style.transform = `translate3d(${posSpan.x.toFixed(2)}px, ${posSpan.y.toFixed(2)}px, 0) translate(-50%, -56%)`;
    }

    const settled =
      Math.abs(posImg.x - mouse.x) < 0.35 &&
      Math.abs(posImg.y - mouse.y) < 0.35 &&
      Math.abs(posBtn.x - mouse.x) < 0.35 &&
      Math.abs(posBtn.y - mouse.y) < 0.35;

    if (!settled) {
      animationFrame = view.requestAnimationFrame(renderPreview);
    } else {
      animationFrame = 0;
      lastTime = 0;
    }
  };

  const startAnimation = () => {
    if (!animationFrame) {
      lastTime = 0;
      animationFrame = view.requestAnimationFrame(renderPreview);
    }
  };

  // Keep Dennis's 3 layers warm at cursor position across the whole viewport
  const handleGlobalMove = (event) => {
    if (event.pointerType === "touch") return;
    mouse = { x: event.clientX, y: event.clientY };
    if (!hasPointer) {
      hasPointer = true;
      posImg = { ...mouse };
      posBtn = { ...mouse };
      posSpan = { ...mouse };
    }
    startAnimation();
  };

  const handleListMove = (event) => {
    if (event.pointerType === "touch") return;
    isActive = true;
    pendingListPointer = { clientX: event.clientX, clientY: event.clientY };
    handleGlobalMove(event);
  };

  const handleLeave = () => {
    isActive = false;
    pendingListPointer = null;
    pendingScrollCheck = false;
    activeIndex = -1;
    setPressedState(false);
    setActiveState(false);
  };

  const handleScroll = () => {
    if (!isActive || !hasPointer) return;
    pendingScrollCheck = true;
    startAnimation();
  };

  const handleDown = () => {
    if (isActive) setPressedState(true);
  };

  const handleUp = () => {
    setPressedState(false);
  };

  const itemHandlers = items.map((item, index) => {
    const onEnter = (event) => {
      if (event.pointerType === "touch") return;
      handleGlobalMove(event);
      isActive = true;
      updatePreview(item, index);
      setActiveState(true);
    };
    item.addEventListener("pointerenter", onEnter);
    return { item, onEnter };
  });

  view.addEventListener("pointermove", handleGlobalMove, { passive: true });
  list.addEventListener("pointermove", handleListMove);
  list.addEventListener("pointerleave", handleLeave);
  list.addEventListener("pointerdown", handleDown);
  view.addEventListener("pointerup", handleUp);
  view.addEventListener("scroll", handleScroll, { passive: true });
  view.addEventListener("blur", handleLeave);

  return {
    destroy() {
      itemHandlers.forEach(({ item, onEnter }) => {
        item.removeEventListener("pointerenter", onEnter);
      });
      view.removeEventListener("pointermove", handleGlobalMove);
      list.removeEventListener("pointermove", handleListMove);
      list.removeEventListener("pointerleave", handleLeave);
      list.removeEventListener("pointerdown", handleDown);
      view.removeEventListener("pointerup", handleUp);
      view.removeEventListener("scroll", handleScroll);
      view.removeEventListener("blur", handleLeave);
      view.clearTimeout?.(bounceTimer);
      setPressedState(false);
      setActiveState(false);
      if (animationFrame) view.cancelAnimationFrame(animationFrame);
    },
  };
}

export function enableMobileTouchReveal(maskTarget, maskSurface, options = {}) {
  if (!maskTarget || !maskSurface) return { destroy() {} };

  const revealSize = options.revealSize ?? 220;

  const setMaskUpdate = (event) => {
    const update = computeTouchMaskUpdate(
      event,
      maskSurface.getBoundingClientRect(),
      revealSize,
    );
    if (!update) return;

    maskSurface.style.setProperty("--mask-x", update.xCss);
    maskSurface.style.setProperty("--mask-y", update.yCss);
    maskSurface.style.setProperty("--mask-size", update.sizeCss);
  };

  const collapseMask = () => {
    maskSurface.style.setProperty("--mask-size", "0px");
  };

  maskTarget.addEventListener("touchstart", setMaskUpdate, { passive: true });
  maskTarget.addEventListener("touchmove", setMaskUpdate, { passive: true });
  maskTarget.addEventListener("touchend", collapseMask, { passive: true });
  maskTarget.addEventListener("touchcancel", collapseMask, { passive: true });
  collapseMask();

  return {
    destroy() {
      maskTarget.removeEventListener("touchstart", setMaskUpdate);
      maskTarget.removeEventListener("touchmove", setMaskUpdate);
      maskTarget.removeEventListener("touchend", collapseMask);
      maskTarget.removeEventListener("touchcancel", collapseMask);
    },
  };
}

export function initMobileRevealPill(pillElement, maskSurface, options = {}) {
  if (!pillElement || !maskSurface) return { destroy() {} };

  const view = options.window ?? pillElement.ownerDocument?.defaultView ?? window;
  const root = options.root ?? pillElement.ownerDocument?.querySelector(".mask-stage");
  const label = pillElement.querySelector(".pill-label");
  const defaultLabel = label?.textContent ?? "Hold to reveal";
  const activeLabel = options.activeLabel ?? "Revealing...";
  const revealScale = options.revealScale ?? 1.5;

  const startReveal = () => {
    const mask = computeCenteredRevealMask(
      maskSurface.getBoundingClientRect(),
      revealScale,
    );

    pillElement.dataset.active = "true";
    if (label) label.textContent = activeLabel;
    maskSurface.style.setProperty("--mask-x", mask.xCss);
    maskSurface.style.setProperty("--mask-y", mask.yCss);
    maskSurface.style.setProperty("--mask-size", mask.sizeCss);
    view.navigator?.vibrate?.(15);
  };

  const endReveal = () => {
    pillElement.dataset.active = "false";
    if (label) label.textContent = defaultLabel;
    maskSurface.style.setProperty("--mask-size", "0px");
  };

  const updateVisibility = () => {
    const visibility = computePillVisibility(
      root?.getBoundingClientRect?.().bottom ?? 0,
      options.hideThreshold ?? 100,
    );
    pillElement.style.opacity = visibility.opacity;
    pillElement.style.pointerEvents = visibility.pointerEvents;
  };

  pillElement.addEventListener("pointerdown", startReveal);
  view.addEventListener("pointerup", endReveal);
  view.addEventListener("pointercancel", endReveal);
  view.addEventListener("scroll", updateVisibility, { passive: true });
  endReveal();
  updateVisibility();

  return {
    destroy() {
      pillElement.removeEventListener("pointerdown", startReveal);
      view.removeEventListener("pointerup", endReveal);
      view.removeEventListener("pointercancel", endReveal);
      view.removeEventListener("scroll", updateVisibility);
    },
  };
}

export function initMobileRadialFlood(pillElement, floodLayer, options = {}) {
  if (!pillElement || !floodLayer) return { destroy() {} };

  const view = options.window ?? pillElement.ownerDocument?.defaultView ?? window;
  const holdDelay = options.holdDelay ?? 380;
  const collapseDelay = options.collapseDelay ?? 140;
  let holdTimer = 0;
  let collapseTimer = 0;
  let pressStartedAt = 0;

  const expandWave = () => {
    const origin = computeRadialFloodOrigin(
      pillElement.getBoundingClientRect(),
      floodLayer.getBoundingClientRect(),
    );

    floodLayer.style.setProperty("--pill-x", origin.xCss);
    floodLayer.style.setProperty("--pill-y", origin.yCss);
    floodLayer.style.setProperty("--flood-radius", options.radius ?? "150vmax");
    pillElement.dataset.active = "true";
    view.navigator?.vibrate?.([15, 30, 20]);
  };

  const queueWave = (event) => {
    event?.preventDefault?.();
    view.clearTimeout?.(holdTimer);
    view.clearTimeout?.(collapseTimer);
    pressStartedAt = view.performance?.now?.() ?? Date.now();
    pillElement.dataset.pending = "true";
    holdTimer = view.setTimeout(() => {
      const elapsed = (view.performance?.now?.() ?? Date.now()) - pressStartedAt;
      if (shouldTriggerHoldReveal(elapsed, holdDelay)) {
        expandWave();
      }
    }, holdDelay);
  };

  const collapseWave = () => {
    view.clearTimeout?.(holdTimer);
    pillElement.dataset.pending = "false";
    view.clearTimeout?.(collapseTimer);
    collapseTimer = view.setTimeout(() => {
      floodLayer.style.setProperty("--flood-radius", "0px");
      pillElement.dataset.active = "false";
    }, collapseDelay);
  };

  pillElement.addEventListener("pointerdown", queueWave);
  view.addEventListener("pointerup", collapseWave);
  view.addEventListener("pointercancel", collapseWave);
  collapseWave();

  return {
    destroy() {
      pillElement.removeEventListener("pointerdown", queueWave);
      view.removeEventListener("pointerup", collapseWave);
      view.removeEventListener("pointercancel", collapseWave);
      view.clearTimeout?.(holdTimer);
      view.clearTimeout?.(collapseTimer);
    },
  };
}

export function createTeleprompterScrollController(root = document, options = {}) {
  const elements = [...root.querySelectorAll("[data-teleprompter]")]
    .map((element) => ({
      element,
      words: prepareTeleprompterWords(element),
    }))
    .filter((entry) => entry.words.length > 0);
  if (elements.length === 0) return { destroy() {} };

  const view = root.defaultView ?? root.ownerDocument?.defaultView ?? window;
  let ticking = false;

  const update = () => {
    ticking = false;
    const viewportHeight = view.innerHeight || 1;

    elements.forEach(({ element, words }) => {
      const progress = computeTeleprompterProgress(
        element.getBoundingClientRect().top,
        viewportHeight,
        options,
      );
      element.style.setProperty("--teleprompter-progress", progress.toFixed(3));
      const states = computeTeleprompterWordStates(progress, words.length);
      words.forEach((word, index) => {
        word.classList.toggle("is-lit", states[index]);
      });
    });
  };

  const scheduleUpdate = () => {
    if (!ticking) {
      ticking = true;
      view.requestAnimationFrame(update);
    }
  };

  view.addEventListener("scroll", scheduleUpdate, { passive: true });
  view.addEventListener("resize", scheduleUpdate, { passive: true });
  update();

  return {
    destroy() {
      view.removeEventListener("scroll", scheduleUpdate);
      view.removeEventListener("resize", scheduleUpdate);
    },
  };
}

export function createMobileParallaxController(root = document, options = {}) {
  const view = root.defaultView ?? window;
  const heroStack = root.querySelector(".hero-stack");
  const maskFrame = root.querySelector(".hero-mask-frame");
  if (!heroStack && !maskFrame) {
    return { destroy() {} };
  }

  let ticking = false;
  let animationFrame = 0;
  let lastParallax = null;

  const renderScroll = () => {
    ticking = false;
    animationFrame = 0;
    const parallax = computeMobileParallax(view.scrollY || 0, view.innerHeight || 1);
    if (lastParallax?.y === parallax.y && lastParallax?.opacity === parallax.opacity) return;
    lastParallax = parallax;

    if (heroStack) {
      heroStack.style.transform = parallax.css;
      heroStack.style.opacity = parallax.opacity.toFixed(3);
    }
  };

  const handleScroll = () => {
    if (!ticking) {
      ticking = true;
      animationFrame = view.requestAnimationFrame(renderScroll);
    }
  };

  const handleTilt = (event) => {
    if (!maskFrame) return;
    maskFrame.style.setProperty("--tilt-transform", computeTiltParallax(event).css);
  };

  view.addEventListener("scroll", handleScroll, { passive: true });
  view.addEventListener("resize", handleScroll);

  if (
    view.DeviceOrientationEvent &&
    typeof view.DeviceOrientationEvent.requestPermission !== "function"
  ) {
    view.addEventListener("deviceorientation", handleTilt, { passive: true });
  }

  renderScroll();

  return {
    destroy() {
      view.removeEventListener("scroll", handleScroll);
      view.removeEventListener("resize", handleScroll);
      view.removeEventListener("deviceorientation", handleTilt);
      if (animationFrame) view.cancelAnimationFrame(animationFrame);
    },
  };
}

function prepareTeleprompterWords(element) {
  const existingWords = [...element.querySelectorAll(".teleprompter-word")];
  if (existingWords.length > 0) return existingWords;

  const text = element.textContent?.trim().replace(/\s+/g, " ");
  if (!text) return [];

  element.textContent = "";
  return text.split(" ").map((word, index) => {
    const span = element.ownerDocument.createElement("span");
    span.className = "teleprompter-word";
    span.textContent = index === 0 ? word : ` ${word}`;
    element.append(span);
    return span;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
