import { createStableViewport, statementEnd } from './viewport.mjs';
import { createNavigation } from './navigation.mjs';

export function chapterAt(progress, count = 3) {
  if (count <= 0) return -1;
  const value = Number.isFinite(progress) ? progress : 0;
  return Math.min(count - 1, Math.max(0, Math.floor(value * count)));
}

export function createHoldReveal(button, surface, options = {}) {
  if (!button || !surface) return { destroy() {} };
  const view = options.view ?? button.ownerDocument.defaultView;
  const doc = button.ownerDocument;
  let holdTimer = 0, collapseTimer = 0, pressed = false;
  let pointerId = null;

  const collapse = (immediate = false) => {
    pressed = false;
    pointerId = null;
    view.clearTimeout(holdTimer);
    view.clearTimeout(collapseTimer);
    button.dataset.pending = "false";
    const finish = () => {
      surface.style.setProperty("--flood-radius", "0px");
      surface.style.setProperty("--size", "0px");
      button.dataset.active = "false";
    };
    if (immediate) finish();
    else collapseTimer = view.setTimeout(finish, options.collapseDelay ?? 100);
  };
  const press = (event) => {
    if (pressed || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault();
    pressed = true;
    options.onPress?.();
    pointerId = event.pointerId ?? null;
    if (pointerId !== null) button.setPointerCapture?.(pointerId);
    view.clearTimeout(holdTimer);
    view.clearTimeout(collapseTimer);
    button.dataset.pending = "true";

    const rect = button.getBoundingClientRect();
    const scrollY = (view && (view.scrollY !== undefined ? view.scrollY : view.pageYOffset)) || 0;
    const pillX = `${rect.left + rect.width / 2}px`;
    const pillY = `${rect.top + rect.height / 2 + scrollY}px`;

    surface.style.setProperty("--pill-x", pillX);
    surface.style.setProperty("--pill-y", pillY);
    surface.style.setProperty("--x", pillX);
    surface.style.setProperty("--y", pillY);

    holdTimer = view.setTimeout(() => {
      if (!pressed) return;
      button.dataset.active = "true";
      surface.style.setProperty("--flood-radius", "150vmax");
      surface.style.setProperty("--size", "150vmax");
      view.navigator?.vibrate?.([15, 30, 20]);
    }, options.holdDelay ?? 380);
  };
  const release = (event) => {
    if (pointerId !== null && event.pointerId !== undefined && event.pointerId !== pointerId) return;
    if (pressed || button.dataset.active === "true") collapse();
  };
  const keydown = (event) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) press(event);
    if (event.key === "Escape") collapse(true);
  };
  const keyup = (event) => { if (event.key === " " || event.key === "Enter") release(event); };
  const cancel = () => collapse(true);
  const visibility = () => { if (doc.hidden) cancel(); };
  button.addEventListener("pointerdown", press);
  button.addEventListener("keydown", keydown);
  button.addEventListener("keyup", keyup);
  view.addEventListener("pointerup", release);
  view.addEventListener("pointercancel", cancel);
  doc.addEventListener("visibilitychange", visibility);
  return { destroy() {
    cancel();
    button.removeEventListener("pointerdown", press);
    button.removeEventListener("keydown", keydown);
    button.removeEventListener("keyup", keyup);
    view.removeEventListener("pointerup", release);
    view.removeEventListener("pointercancel", cancel);
    doc.removeEventListener("visibilitychange", visibility);
  } };
}

export function createFolioExperience(root = document) {
  const view = root.defaultView;
  const gsap = view.gsap;
  const ScrollTrigger = view.ScrollTrigger;
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const tabs = [...root.querySelectorAll("[data-architecture-tab]")];
  const panels = [...root.querySelectorAll("[data-architecture-panel]")];
  const console = root.querySelector('[data-fleet-console]');
  const viewport = root.querySelector('.architecture-panels');
  const track = root.querySelector('.architecture-track');
  const marker = root.querySelector('.tab-marker');
  const progressLine = root.querySelector('.sequence-progress span');
  const navigation = createNavigation(root);
  let currentChapter = -1, media, started = false, destroyed = false, chapterTrigger, mode = 'manual';
  let rebuildMotion = () => {};

  const syncLayerSections = () => {
    const baseLayer = root.querySelector('.layer--base');
    const revealLayer = root.querySelector('.layer--reveal');
    if (!baseLayer || !revealLayer) return;
    const sections = [
      '.mask-stage',
      '.passing-statement',
      '.flagship-section',
      '.memory-section',
      '.secondary-work',
      '.research-shelf',
      '.practice-section',
      '.notebook-gates',
      '.contact-section'
    ];
    sections.forEach(sel => {
      const b = baseLayer.querySelector(sel);
      const r = revealLayer.querySelector(sel);
      if (b && r) {
        r.style.position = 'absolute';
        r.style.top = `${b.offsetTop}px`;
        r.style.left = '0';
        r.style.width = '100%';
        r.style.minHeight = `${b.offsetHeight}px`;
      }
    });

    const bStack = baseLayer.querySelector('.hero-stack');
    const rStack = revealLayer.querySelector('.hero-stack');
    if (bStack && rStack) {
      rStack.style.position = 'absolute';
      rStack.style.top = `${bStack.offsetTop}px`;
      rStack.style.left = `${bStack.offsetLeft}px`;
      rStack.style.width = `${bStack.offsetWidth}px`;
    }

    const bVitrine = baseLayer.querySelector('.architecture-vitrine');
    const rVitrine = revealLayer.querySelector('.architecture-vitrine');
    if (bVitrine && rVitrine) {
      rVitrine.style.height = `${bVitrine.offsetHeight}px`;
    }

    const bTabs = baseLayer.querySelector('.architecture-tabs');
    const rTabs = revealLayer.querySelector('.reveal-tabs-mock');
    if (bTabs && rTabs) {
      rTabs.style.height = `${bTabs.offsetHeight}px`;
    }

    const rWorkH2 = revealLayer.querySelector('.secondary-work h2');
    if (rWorkH2) {
      rWorkH2.style.minHeight = '';
    }
  };

  const stable = createStableViewport(root, () => {
    syncLayerSections();
    if (started && !destroyed) { media?.revert(); rebuildMotion(); ScrollTrigger?.refresh(); }
  });
  const listeners = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  const diagramParts = '.branch-nodes > div, .execution-flow > *, .stream-lines i';
  const setChapter = (index, animate = false) => {
    if (index === currentChapter) return;
    currentChapter = index;
    panels.forEach((panel, i) => {
      panel.hidden = false;
      panel.inert = i !== index;
      panel.setAttribute('aria-hidden', String(i !== index));
      tabs[i].setAttribute("aria-selected", String(i === index));
      tabs[i].tabIndex = i === index ? 0 : -1;
    });
    root.querySelector("[data-chapter-number]").textContent = `0${index + 1} / 03`;
    marker.style.transform = `translateX(${index * 100}%)`;
    if (mode === 'manual') progressLine.style.transform = `scaleX(${(index + 1) / panels.length})`;
    if (animate && gsap && !reduced.matches) {
      const parts = panels[index].querySelectorAll(diagramParts);
      gsap.killTweensOf(parts);
      gsap.fromTo(parts, { opacity: .35, y: 6 }, { opacity: 1, y: 0, duration: .3, stagger: .04, ease: 'power3.out', clearProps: 'transform,opacity' });
    }
  };
  const selectChapter = (index) => {
    if (chapterTrigger) {
      navigation.scrollToPosition(chapterTrigger.start + (chapterTrigger.end - chapterTrigger.start) * index / (panels.length - 1));
    } else viewport.scrollTo({ left: viewport.clientWidth * index, behavior: reduced.matches ? 'instant' : 'smooth' });
  };
  tabs.forEach((tab, index) => {
    listen(tab, "click", () => selectChapter(index));
    listen(tab, "keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectChapter(next);
      tabs[next].focus({ preventScroll: true });
    });
  });
  listen(viewport, 'scroll', () => {
    if (mode === 'manual') setChapter(Math.min(panels.length - 1, Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth))));
  }, { passive: true });
  console.dataset.mode = 'manual';
  setChapter(0);
  syncLayerSections();
  const hold = createHoldReveal(root.querySelector("[data-mobile-trigger]"), root.querySelector("[data-reveal-flood]"), { onPress: syncLayerSections });

  const baseLayer = root.querySelector('.layer--base');
  if (typeof ResizeObserver !== 'undefined' && baseLayer) {
    const ro = new ResizeObserver(() => {
      syncLayerSections();
    });
    ro.observe(baseLayer);
    listeners.push(() => ro.disconnect());
  }
  listen(view, 'resize', syncLayerSections, { passive: true });
  listen(view, 'orientationchange', syncLayerSections, { passive: true });

  const startMotion = () => {
    if (started || destroyed || !gsap || !ScrollTrigger) return;
    started = true;
    syncLayerSections();
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.addEventListener('refresh', syncLayerSections);
    // Refresh genuine layout changes ourselves, not every mobile toolbar frame.
    ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'DOMContentLoaded,load' });
    rebuildMotion = () => {
      media = gsap.matchMedia();
      media.add({ all: "all", desktop: "(min-width: 901px) and (pointer: fine)", reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
      const { desktop, reduce } = context.conditions;
      chapterTrigger = null;
      mode = 'manual';
      console.dataset.mode = mode;
      syncLayerSections();
      if (reduce) {
        track.style.transform = '';
        viewport.scrollLeft = currentChapter * viewport.clientWidth;
        return;
      }

      gsap.fromTo(".hero-copy .line-wrap > span", { yPercent: 50, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: .9, ease: "power3.out",
        stagger: (index) => (index % 3) * .08, clearProps: "transform,opacity",
      });
      gsap.fromTo(".scroll-stem", { scaleY: .25 }, { scaleY: 1, duration: 1, ease: "power3.out" });
      gsap.to(".mask-stage > .hero-stack", {
        y: desktop ? -60 : -20, ease: "none",
        scrollTrigger: { trigger: ".mask-stage", start: "top top", end: "bottom top", scrub: .65 },
      });

      const bTrack = root.querySelector('.layer--base .statement-track');
      const rTrack = root.querySelector('.layer--reveal .statement-track');
      const tracks = rTrack ? [bTrack, rTrack] : bTrack;
      gsap.fromTo(tracks, { x: 0 }, {
        x: () => statementEnd(bTrack.offsetWidth, root.querySelector('.layer--base .passing-statement').clientWidth),
        ease: "none",
        scrollTrigger: {
          id: 'passing-statement',
          trigger: ".layer--base .passing-statement",
          start: () => desktop ? `top ${stable.height * 0.95}` : 'top 75%',
          end: 'bottom top',
          scrub: .5,
          invalidateOnRefresh: true
        },
      });

      const baseRise = root.querySelectorAll('.layer--base [data-rise]');
      const revealRise = root.querySelectorAll('.layer--reveal [data-rise]');
      baseRise.forEach((bEl, i) => {
        const rEl = revealRise[i];
        const targets = rEl ? [bEl, rEl] : bEl;
        gsap.from(targets, {
          y: desktop ? 64 : 28, opacity: .05, duration: .85, ease: "power3.out",
          scrollTrigger: { trigger: bEl, start: "top 91%", toggleActions: "play none none none", once: true },
        });
      });

      if (stable.height >= 620) {
        mode = 'pinned';
        console.dataset.mode = mode;
        viewport.scrollLeft = 0;
        const pin = desktop ? root.querySelector('[data-fleet-stage]') : console;
        const revealPin = desktop ? root.querySelector('.layer--reveal .fleet-stage') : root.querySelector('.layer--reveal .fleet-console');
        const timeline = gsap.timeline({
          scrollTrigger: {
            id: 'fleet-architecture', trigger: pin, pin,
            start: () => `top ${desktop ? Math.round(stable.height * .1) : 80}`,
            end: () => `+=${Math.max(700, stable.height * (desktop ? 1.35 : 1.65))}`,
            scrub: .45, anticipatePin: 1, invalidateOnRefresh: true,
            onRefresh(self) {
              syncLayerSections();
              if (revealPin) {
                revealPin.style.marginBottom = `${self.end - self.start}px`;
              }
            },
          },
          onUpdate() {
            setChapter(Math.round(this.progress() * (panels.length - 1)), true);
            if (revealPin && pin) {
              revealPin.style.transform = pin.style.transform;
            }
          },
        });
        timeline.fromTo(track, { xPercent: 0 }, { xPercent: -100 * (panels.length - 1), ease: 'none', duration: 1 }, 0);
        timeline.fromTo(progressLine, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0);
        chapterTrigger = timeline.scrollTrigger;
      } else {
        track.style.transform = '';
        viewport.scrollLeft = currentChapter * viewport.clientWidth;
        const revealPin = root.querySelector('.layer--reveal .fleet-console, .layer--reveal .fleet-stage');
        if (revealPin) { revealPin.style.marginBottom = ''; revealPin.style.transform = ''; }
      }

      gsap.fromTo(root.querySelectorAll("[data-media-parallax]"), { yPercent: 6 }, {
        yPercent: -6, ease: "none",
        scrollTrigger: { trigger: ".layer--base .memory-figure", start: "top bottom", end: "bottom top", scrub: .65 },
      });

      const baseSheets = root.querySelectorAll('.layer--base [data-research-sheet]');
      const revealSheets = root.querySelectorAll('.layer--reveal [data-research-sheet]');
      baseSheets.forEach((bSheet, index) => {
        const rSheet = revealSheets[index];
        const targets = rSheet ? [bSheet, rSheet] : bSheet;
        gsap.fromTo(targets, { y: desktop ? 100 + index * 24 : 42, rotation: desktop ? (index - 1) * 3 : 0, opacity: .25 }, {
          y: 0, rotation: 0, opacity: 1, ease: "none",
          scrollTrigger: { trigger: bSheet, start: "top 98%", end: "top 55%", scrub: .55 },
        });
      });

      const baseGates = root.querySelectorAll('.layer--base .notebook-gate');
      const revealGates = root.querySelectorAll('.layer--reveal .notebook-gate');
      baseGates.forEach((bGate, index) => {
        const rGate = revealGates[index];
        const strongTargets = [bGate.querySelector("strong")];
        if (rGate && rGate.querySelector("strong")) strongTargets.push(rGate.querySelector("strong"));
        gsap.from(strongTargets, {
          x: index ? 50 : -50, opacity: .2, ease: "none",
          scrollTrigger: { trigger: bGate, start: "top bottom", end: "center 65%", scrub: .6 }
        });
        const typeTargets = [bGate.querySelector(".gate-type")];
        if (rGate && rGate.querySelector(".gate-type")) typeTargets.push(rGate.querySelector(".gate-type"));
        gsap.fromTo(typeTargets, { x: index ? 0 : -36 }, {
          x: index ? -36 : 0, ease: "none",
          scrollTrigger: { trigger: bGate, start: "top bottom", end: "bottom top", scrub: .7 }
        });
      });

      if (!desktop) {
        root.querySelectorAll('.work-list > a').forEach(row => {
          ScrollTrigger.create({ trigger: row, start: () => `top ${stable.height * .62}`, end: () => `bottom ${stable.height * .35}`,
            onToggle: self => { row.dataset.reading = String(self.isActive); },
          });
        });
      }
      return () => {
        chapterTrigger = null;
        root.querySelectorAll('[data-reading]').forEach(row => row.removeAttribute('data-reading'));
        gsap.killTweensOf(root.querySelectorAll(diagramParts));
      };
      });
    };
    rebuildMotion();
    root.fonts?.ready.then(() => {
      if (destroyed) return;
      syncLayerSections();
      ScrollTrigger.refresh();
      if (view.location.hash) {
        let target;
        try { target = root.getElementById(decodeURIComponent(view.location.hash.slice(1))); } catch { return; }
        if (target) navigation.scrollToTarget(target, false);
      }
    });
  };
  listen(view, "loader:complete", startMotion);
  if (root.querySelector("[data-loader]")?.dataset.loaded === "true") startMotion();

  return { destroy() {
    destroyed = true;
    listeners.forEach(remove => remove());
    ScrollTrigger?.removeEventListener?.('refresh', syncLayerSections);
    hold.destroy();
    navigation.destroy();
    media?.revert();
    stable.destroy();
    gsap?.killTweensOf(root.querySelectorAll(diagramParts));
  } };
}
