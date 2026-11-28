// Portfolio Mount-Time Modular Component Engine & Interactive Layers
// Zero repetition on a single visit — 4 swappable component slots (3 x 3 x 2 x 2 = 36 editions)
// Slots:
//   hero:      waves | constellation | isobars
//   craft:     matrix | axioms
//   work:      folders | ledger | inspector
//   telemetry: heatmap | cadence

export const EDITION_SLOTS = {
  hero: ["waves", "constellation", "isobars"],
  craft: ["matrix", "axioms"],
  work: ["folders", "ledger", "inspector"],
  telemetry: ["heatmap", "cadence"],
};

export function computeEditionCode(state) {
  const h = Math.max(0, EDITION_SLOTS.hero.indexOf(state.hero));
  const c = Math.max(0, EDITION_SLOTS.craft.indexOf(state.craft));
  const w = Math.max(0, EDITION_SLOTS.work.indexOf(state.work));
  const t = Math.max(0, EDITION_SLOTS.telemetry.indexOf(state.telemetry));
  const num = h * 12 + c * 6 + w * 2 + t + 1;
  return String(num).padStart(2, "0");
}

function randomPick(list, exclude) {
  const pool = exclude && list.length > 1 ? list.filter((x) => x !== exclude) : list;
  let r = Math.random();
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    r = buf[0] / 0xffffffff;
  } catch {
    // fallback to Math.random
  }
  return pool[Math.floor(r * pool.length)] ?? list[0];
}

export function initEditionEngine(doc = document, onChange = () => {}) {
  const html = doc.documentElement;
  const labelNodes = [...doc.querySelectorAll("[data-edition-label]")];
  const shuffleBtns = [...doc.querySelectorAll("[data-edition-shuffle]")];

  const readState = () => ({
    hero: EDITION_SLOTS.hero.includes(html.dataset.slotHero) ? html.dataset.slotHero : "waves",
    craft: EDITION_SLOTS.craft.includes(html.dataset.slotCraft) ? html.dataset.slotCraft : "matrix",
    work: EDITION_SLOTS.work.includes(html.dataset.slotWork) ? html.dataset.slotWork : "folders",
    telemetry: EDITION_SLOTS.telemetry.includes(html.dataset.slotTelemetry) ? html.dataset.slotTelemetry : "heatmap",
  });

  const applyState = (next, notify = true) => {
    html.dataset.slotHero = next.hero;
    html.dataset.slotCraft = next.craft;
    html.dataset.slotWork = next.work;
    html.dataset.slotTelemetry = next.telemetry;
    const code = computeEditionCode(next);
    html.dataset.edition = code;

    try {
      sessionStorage.setItem("mayank-portfolio-edition", JSON.stringify(next));
    } catch {
      // ignore storage errors
    }

    labelNodes.forEach((el) => {
      el.textContent = `Edition #${code}`;
    });

    if (notify) {
      onChange(next, code);
      requestAnimationFrame(() => {
        window.ScrollTrigger?.refresh?.();
      });
    }
  };

  const shuffle = () => {
    const cur = readState();
    // Always change work + flip at least craft or telemetry + fresh hero field
    const next = {
      hero: randomPick(EDITION_SLOTS.hero, cur.hero),
      craft: randomPick(EDITION_SLOTS.craft, cur.craft),
      work: randomPick(EDITION_SLOTS.work, cur.work),
      telemetry: randomPick(EDITION_SLOTS.telemetry, cur.telemetry),
    };
    applyState(next, true);
    shuffleBtns.forEach((btn) => {
      btn.dataset.spinning = "true";
      setTimeout(() => (btn.dataset.spinning = "false"), 360);
    });
  };

  const setSlot = (slot, value) => {
    if (!EDITION_SLOTS[slot]?.includes(value)) return;
    const cur = readState();
    applyState({ ...cur, [slot]: value }, true);
  };

  shuffleBtns.forEach((btn) => btn.addEventListener("click", shuffle));
  applyState(readState(), false);

  return { readState, applyState, shuffle, setSlot };
}

export function initHeroCanvas(doc = document) {
  const canvas = doc.querySelector("[data-hero-canvas]");
  if (!canvas) return { destroy() {} };
  const view = doc.defaultView ?? window;
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy() {} };

  let raf = 0;
  let running = true;
  let visible = true;
  let t = 0;
  let pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let w = 0;
  let h = 0;

  // Deterministic blueprint constellation nodes
  const nodes = Array.from({ length: 28 }, (_, i) => ({
    x: ((i * 73 + 19) % 100) / 100,
    y: ((i * 41 + 11) % 100) / 100,
    vx: (((i % 5) - 2) * 0.00018) || 0.00014,
    vy: ((((i + 2) % 5) - 2) * 0.00016) || -0.00012,
  }));

  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(view.devicePixelRatio || 1, 1.5);
    w = Math.max(300, Math.round(rect.width));
    h = Math.max(300, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawWaves = (isLight) => {
    const lines = 7;
    for (let i = 0; i < lines; i++) {
      const ratio = i / (lines - 1);
      const baseY = h * (0.24 + ratio * 0.56);
      const amp = 26 + (i % 3) * 14;
      const freq = 0.0026 + i * 0.00045;
      const phase = t * (0.9 + i * 0.14) + pointer.x * 2.4;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 24) {
        const dx = x / w - pointer.x;
        const influence = Math.exp(-(dx * dx) * 6) * (pointer.y - 0.5) * 44;
        const y =
          baseY +
          Math.sin(x * freq + phase) * amp +
          Math.cos(x * freq * 0.55 - phase * 0.7) * (amp * 0.45) +
          influence;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      if (i === 2 || i === 4) {
        ctx.strokeStyle = isLight ? "rgba(22, 68, 224, 0.14)" : "rgba(209, 255, 72, 0.15)";
        ctx.lineWidth = 1.25;
      } else {
        ctx.strokeStyle = isLight ? "rgba(18, 28, 48, 0.07)" : "rgba(226, 232, 240, 0.07)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }
  };

  const drawConstellation = (isLight) => {
    const px = pointer.x * w;
    const py = pointer.y * h;
    const maxDist = Math.min(220, w * 0.18);

    nodes.forEach((n) => {
      if (!reduced.matches) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0.04 || n.x > 0.96) n.vx *= -1;
        if (n.y < 0.08 || n.y > 0.92) n.vy *= -1;
      }
    });

    for (let i = 0; i < nodes.length; i++) {
      const ax = nodes[i].x * w;
      const ay = nodes[i].y * h;
      for (let j = i + 1; j < nodes.length; j++) {
        const bx = nodes[j].x * w;
        const by = nodes[j].y * h;
        const dist = Math.hypot(ax - bx, ay - by);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.12;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = isLight
            ? `rgba(22, 68, 224, ${alpha.toFixed(3)})`
            : `rgba(226, 232, 240, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      const pd = Math.hypot(ax - px, ay - py);
      if (pd < maxDist * 1.15) {
        const alpha = (1 - pd / (maxDist * 1.15)) * 0.22;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(px, py);
        ctx.strokeStyle = isLight
          ? `rgba(22, 68, 224, ${alpha.toFixed(3)})`
          : `rgba(209, 255, 72, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(ax, ay, pd < maxDist ? 2.4 : 1.6, 0, Math.PI * 2);
      ctx.fillStyle =
        pd < maxDist
          ? isLight
            ? "rgba(22, 68, 224, 0.36)"
            : "rgba(209, 255, 72, 0.42)"
          : isLight
            ? "rgba(18, 28, 48, 0.18)"
            : "rgba(226, 232, 240, 0.18)";
      ctx.fill();
    }
  };

  const drawIsobars = (isLight) => {
    const cx = w * (0.58 + (pointer.x - 0.5) * 0.22);
    const cy = h * (0.48 + (pointer.y - 0.5) * 0.18);
    const rings = 9;
    const step = Math.max(46, Math.min(w, h) * 0.075);

    for (let i = 1; i <= rings; i++) {
      const baseR = i * step;
      ctx.beginPath();
      const segs = 72;
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const wobble =
          Math.sin(a * 3 + t * 0.8 + i * 0.6) * 10 +
          Math.cos(a * 5 - t * 0.55) * 6;
        const rx = cx + Math.cos(a) * (baseR * 1.32 + wobble);
        const ry = cy + Math.sin(a) * (baseR * 0.86 + wobble);
        if (s === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      if (i === 3 || i === 6) {
        ctx.strokeStyle = isLight ? "rgba(22, 68, 224, 0.14)" : "rgba(209, 255, 72, 0.15)";
        ctx.lineWidth = 1.25;
      } else {
        ctx.strokeStyle = isLight ? "rgba(18, 28, 48, 0.06)" : "rgba(226, 232, 240, 0.065)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }
  };

  const drawFrame = () => {
    raf = 0;
    if (!running || !visible) return;
    t += 0.008;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    ctx.clearRect(0, 0, w, h);
    const isLight = doc.documentElement.dataset.theme === "light";
    const fieldMode = doc.documentElement.dataset.slotHero || "waves";

    if (fieldMode === "constellation") drawConstellation(isLight);
    else if (fieldMode === "isobars") drawIsobars(isLight);
    else drawWaves(isLight);

    if (!reduced.matches) {
      raf = view.requestAnimationFrame(drawFrame);
    }
  };

  const onMove = (e) => {
    if (e.pointerType === "touch") return;
    pointer.tx = Math.min(1, Math.max(0, e.clientX / Math.max(1, view.innerWidth)));
    pointer.ty = Math.min(1, Math.max(0, e.clientY / Math.max(1, view.innerHeight)));
  };

  const io = new view.IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && !raf && !reduced.matches) raf = view.requestAnimationFrame(drawFrame);
    },
    { threshold: 0 },
  );
  io.observe(canvas);

  resize();
  view.addEventListener("resize", resize, { passive: true });
  view.addEventListener("pointermove", onMove, { passive: true });
  drawFrame();

  return {
    redraw() {
      if (!raf) drawFrame();
    },
    destroy() {
      running = false;
      if (raf) view.cancelAnimationFrame(raf);
      io.disconnect();
      view.removeEventListener("resize", resize);
      view.removeEventListener("pointermove", onMove);
    },
  };
}

export function initCommandPalette(doc = document, edition = null) {
  const dialog = doc.querySelector("[data-cmd-dialog]");
  const input = doc.querySelector("[data-cmd-input]");
  const list = doc.querySelector("[data-cmd-list]");
  const triggers = [...doc.querySelectorAll("[data-cmd-open]")];
  if (!dialog || !input || !list) return;

  const items = [...list.querySelectorAll("[data-cmd-item]")];
  let activeIdx = 0;

  const visibleItems = () => items.filter((el) => !el.hidden);

  const highlight = (idx) => {
    const vis = visibleItems();
    if (!vis.length) return;
    activeIdx = ((idx % vis.length) + vis.length) % vis.length;
    vis.forEach((el, i) => el.classList.toggle("is-selected", i === activeIdx));
    vis[activeIdx]?.scrollIntoView({ block: "nearest" });
  };

  const open = () => {
    if (dialog.open) return;
    input.value = "";
    items.forEach((el) => (el.hidden = false));
    dialog.showModal();
    highlight(0);
    input.focus();
  };

  const close = () => {
    if (dialog.open) dialog.close();
  };

  const runAction = (el) => {
    const action = el.dataset.cmdAction;
    const target = el.dataset.cmdTarget;
    close();

    if (action === "scroll" && target) {
      doc.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (action === "link" && target) {
      if (el.dataset.cmdExternal === "true") window.open(target, "_blank", "noopener,noreferrer");
      else window.location.href = target;
    } else if (action === "theme") {
      doc.querySelector("[data-theme-toggle]")?.click();
    } else if (action === "shuffle") {
      edition?.shuffle?.();
    } else if (action === "slot" && target) {
      const [slotName, variant] = target.split(":");
      edition?.setSlot?.(slotName, variant);
      const scrollMap = {
        hero: "#top",
        craft: "#craft-lens",
        work: "#work-explorer",
        telemetry: "#github-activity",
      };
      if (scrollMap[slotName]) {
        doc.querySelector(scrollMap[slotName])?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (action === "copy-email") {
      doc.getElementById("main-copy-email")?.click();
    }
  };

  triggers.forEach((t) => t.addEventListener("click", open));
  dialog.querySelector("[data-cmd-close]")?.addEventListener("click", close);

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    items.forEach((el) => {
      const hay = (el.dataset.cmdSearch || el.textContent || "").toLowerCase();
      el.hidden = Boolean(q && !hay.includes(q));
    });
    highlight(0);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight(activeIdx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight(activeIdx - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const vis = visibleItems();
      if (vis[activeIdx]) runAction(vis[activeIdx]);
    }
  });

  items.forEach((el) => {
    el.addEventListener("click", () => runAction(el));
    el.addEventListener("pointerenter", () => {
      const vis = visibleItems();
      const idx = vis.indexOf(el);
      if (idx >= 0) highlight(idx);
    });
  });

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      dialog.open ? close() : open();
    }
  });
}

export function initScrollRail(doc = document) {
  const rail = doc.querySelector("[data-scroll-rail]");
  if (!rail) return;
  const links = [...rail.querySelectorAll("a[href^='#']")];
  const sections = links
    .map((link) => ({ link, el: doc.querySelector(link.getAttribute("href")) }))
    .filter((entry) => entry.el);
  if (!sections.length) return;

  const update = () => {
    const y = window.scrollY + window.innerHeight * 0.35;
    let active = sections[0];
    for (const s of sections) {
      const top = s.el.getBoundingClientRect().top + window.scrollY;
      if (top <= y) active = s;
    }
    sections.forEach((s) => {
      const isCurrent = s === active;
      s.link.classList.toggle("is-active", isCurrent);
      s.link.setAttribute("aria-current", isCurrent ? "location" : "false");
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

export function initCapabilityMatrix(doc = document) {
  const tiles = [...doc.querySelectorAll(".layer--base [data-cap-tile]")];
  if (!tiles.length) return;

  const select = (tile) => {
    tiles.forEach((t) => {
      const active = t === tile;
      t.classList.toggle("is-selected", active);
      t.setAttribute("aria-pressed", String(active));
    });
  };

  tiles.forEach((tile) => {
    tile.addEventListener("click", () => select(tile));
  });
}

export function initAxiomLedger(doc = document) {
  const cards = [...doc.querySelectorAll(".layer--base [data-axiom-card]")];
  if (!cards.length) return;

  const select = (card) => {
    cards.forEach((c) => {
      const active = c === card;
      c.classList.toggle("is-selected", active);
      c.setAttribute("aria-pressed", String(active));
    });
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => select(card));
  });
}

export function initFolderArchive(doc = document, onResize = () => {}) {
  const triggers = [...doc.querySelectorAll(".layer--base [data-folder-trigger]")];
  const panels = [...doc.querySelectorAll(".layer--base [data-folder-panel]")];
  if (!triggers.length || !panels.length) return;

  const openFolder = (id) => {
    triggers.forEach((btn) => {
      const active = btn.dataset.folderTrigger === id;
      btn.classList.toggle("is-open", active);
      btn.setAttribute("aria-expanded", String(active));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.folderPanel !== id;
    });
    onResize();
  };

  triggers.forEach((btn) => {
    btn.addEventListener("click", () => openFolder(btn.dataset.folderTrigger));
  });

  openFolder(triggers[0].dataset.folderTrigger);
}

export function initSystemInspector(doc = document, onResize = () => {}) {
  const tabs = [...doc.querySelectorAll(".layer--base [data-inspector-tab]")];
  const panels = [...doc.querySelectorAll(".layer--base [data-inspector-panel]")];
  if (!tabs.length || !panels.length) return;

  const select = (id) => {
    tabs.forEach((btn) => {
      const active = btn.dataset.inspectorTab === id;
      btn.classList.toggle("is-selected", active);
      btn.setAttribute("aria-selected", String(active));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.inspectorPanel !== id;
    });
    onResize();
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => select(btn.dataset.inspectorTab));
  });

  select(tabs[0].dataset.inspectorTab);
}

export async function initGithubActivity(doc = document) {
  const grid = doc.querySelector(".layer--base [data-gh-grid]");
  const monthsEl = doc.querySelector(".layer--base [data-gh-months]");
  const tooltip = doc.querySelector(".layer--base [data-gh-tooltip]");
  const cadenceBars = doc.querySelector(".layer--base [data-cadence-bars]");
  const cadenceReadout = doc.querySelector(".layer--base [data-cadence-readout]");
  if (!grid && !cadenceBars) return;

  try {
    const res = await fetch("./data/github-activity.json");
    if (!res.ok) return;
    const data = await res.json();

    const setAll = (sel, val) => {
      doc.querySelectorAll(sel).forEach((el) => {
        el.textContent = String(val);
      });
    };

    setAll("[data-gh-total]", data.totalContributions);
    setAll("[data-gh-active-days]", data.activeDays);
    setAll("[data-gh-streak]", `${data.longestStreak}d`);
    setAll("[data-gh-busiest-day]", data.busiestDayCount);
    setAll("[data-gh-busiest-day-label]", `Busiest day (${data.busiestDayLabel})`);
    setAll("[data-gh-busiest-month]", data.busiestMonthCount);
    setAll("[data-gh-busiest-month-label]", `Peak month (${data.busiestMonthLabel})`);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. Populate 53-week Heatmap Variant
    if (grid) {
      if (monthsEl) {
        monthsEl.innerHTML = "";
        let lastMonth = "";
        data.weeks.forEach((week, colIdx) => {
          const firstDay = week[0]?.[0];
          if (!firstDay) return;
          const m = monthNames[Number(firstDay.slice(5, 7)) - 1];
          if (m !== lastMonth && colIdx < data.weeks.length - 2) {
            const span = doc.createElement("span");
            span.textContent = m;
            span.style.gridColumnStart = String(colIdx + 1);
            monthsEl.appendChild(span);
            lastMonth = m;
          }
        });
      }

      const frag = doc.createDocumentFragment();
      data.weeks.forEach((week) => {
        const col = doc.createElement("div");
        col.className = "gh-week";
        week.forEach(([date, count, level]) => {
          const cell = doc.createElement("span");
          cell.className = `gh-day gh-lvl-${level}`;
          cell.dataset.date = date;
          cell.dataset.count = String(count);
          cell.setAttribute("aria-label", `${count} contributions on ${date}`);
          col.appendChild(cell);
        });
        frag.appendChild(col);
      });
      grid.innerHTML = "";
      grid.appendChild(frag);

      if (tooltip) {
        grid.addEventListener("pointerover", (e) => {
          const cell = e.target.closest(".gh-day");
          if (!cell) return;
          const count = Number(cell.dataset.count);
          const word = count === 1 ? "contribution" : "contributions";
          tooltip.textContent = `${cell.dataset.date} — ${count} ${word}`;
        });
        grid.addEventListener("pointerleave", () => {
          tooltip.textContent = "Hover any square to inspect daily commit volume";
        });
      }
    }

    // 2. Populate 12-Month Cadence Bar Chart Variant (computed from exact same GraphQL weeks)
    if (cadenceBars) {
      const monthMap = new Map();
      data.weeks.forEach((week) => {
        week.forEach(([date, count]) => {
          const key = date.slice(0, 7); // YYYY-MM
          const cur = monthMap.get(key) || { key, total: 0, activeDays: 0, peak: 0 };
          cur.total += count;
          if (count > 0) cur.activeDays += 1;
          if (count > cur.peak) cur.peak = count;
          monthMap.set(key, cur);
        });
      });

      const months = [...monthMap.values()].slice(-12);
      const maxTotal = Math.max(1, ...months.map((m) => m.total));
      const peakMonth = months.reduce((a, b) => (b.total > a.total ? b : a), months[0]);

      const formatMonth = (key) => {
        const [yr, mo] = key.split("-");
        return `${monthNames[Number(mo) - 1]} ${yr}`;
      };

      const setReadout = (m) => {
        if (!cadenceReadout || !m) return;
        cadenceReadout.textContent = `${formatMonth(m.key)} — ${m.total} contributions across ${m.activeDays} active days (single-day peak: ${m.peak})`;
      };

      cadenceBars.innerHTML = "";
      months.forEach((m) => {
        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "cadence-col" + (m.key === peakMonth.key ? " is-peak is-selected" : "");
        const pct = m.total > 0 ? Math.max(8, Math.round((m.total / maxTotal) * 100)) : 3;
        const shortMonth = monthNames[Number(m.key.slice(5, 7)) - 1];
        btn.innerHTML = `
          <span class="cadence-val">${m.total > 0 ? m.total : "·"}</span>
          <span class="cadence-track"><span class="cadence-fill" style="height:${pct}%"></span></span>
          <span class="cadence-label">${shortMonth}</span>
        `;
        btn.setAttribute("aria-label", `${formatMonth(m.key)}: ${m.total} contributions`);
        const focusBar = () => {
          cadenceBars.querySelectorAll(".cadence-col").forEach((c) => c.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          setReadout(m);
        };
        btn.addEventListener("pointerenter", focusBar);
        btn.addEventListener("click", focusBar);
        cadenceBars.appendChild(btn);
      });

      setReadout(peakMonth);
    }
  } catch {
    // Graceful silent fallback if offline
  }
}

export function initIstClock(doc = document) {
  const nodes = [...doc.querySelectorAll("[data-ist-clock]")];
  if (!nodes.length) return;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const tick = () => {
    const label = `${fmt.format(new Date())} IST`;
    nodes.forEach((n) => (n.textContent = label));
  };
  tick();
  setInterval(tick, 1000);
}

export function initExtraRevealSync(doc = document) {
  const baseLayer = doc.querySelector(".layer--base");
  const revealLayer = doc.querySelector(".layer--reveal");
  if (!baseLayer || !revealLayer) return () => {};

  const syncSelectors = [
    ".mask-stage",
    ".passing-statement",
    ".flagship-section",
    ".memory-section",
    ".slot-craft",
    ".slot-work",
    ".research-shelf",
    ".slot-telemetry",
    ".notebook-gates",
    ".contact-section",
  ];

  const sync = () => {
    revealLayer.style.height = `${baseLayer.offsetHeight}px`;
    syncSelectors.forEach((sel) => {
      const b = baseLayer.querySelector(sel);
      const r = revealLayer.querySelector(sel);
      if (b && r) {
        r.style.position = "absolute";
        r.style.top = `${b.offsetTop}px`;
        r.style.left = "0";
        r.style.width = "100%";
        r.style.minHeight = `${b.offsetHeight}px`;
      }
    });
    const rSecondary = revealLayer.querySelector(".slot-work > .secondary-work");
    if (rSecondary) {
      rSecondary.style.position = "";
      rSecondary.style.top = "";
      rSecondary.style.left = "";
    }
  };

  sync();
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(sync);
    ro.observe(baseLayer);
  }
  window.addEventListener("resize", sync, { passive: true });
  doc.querySelector("[data-mobile-trigger]")?.addEventListener("pointerdown", sync);
  doc.fonts?.ready.then(sync);
  window.ScrollTrigger?.addEventListener?.("refresh", sync);

  return sync;
}

// Weighted Inertial Smooth Scroll (Locomotive / Lenis style damping on desktop wheel)
// Drives native window.scrollTo so GSAP ScrollTrigger pins, fixed chrome, modals, and scrollbar stay 100% intact.
export function initSmoothScroll(doc = document, options = {}) {
  const view = doc.defaultView ?? window;
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = view.matchMedia("(hover: hover) and (pointer: fine)");

  const lerp = options.lerp ?? 0.088;
  const wheelMultiplier = options.wheelMultiplier ?? 0.92;

  let raf = 0;
  let lastTime = 0;
  let currentY = view.scrollY || 0;
  let targetY = currentY;
  let lastWrittenY = -1;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const maxScroll = () => Math.max(0, doc.documentElement.scrollHeight - view.innerHeight);

  const stop = () => {
    if (raf) {
      view.cancelAnimationFrame(raf);
      raf = 0;
    }
    lastTime = 0;
    lastWrittenY = -1;
    currentY = view.scrollY || 0;
    targetY = currentY;
  };

  const hasScrollableAncestor = (el, deltaY) => {
    let node = el instanceof Element ? el : el?.parentElement;
    while (node && node !== doc.body && node !== doc.documentElement) {
      const style = view.getComputedStyle(node);
      const oy = style.overflowY;
      if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 2) {
        const atTop = node.scrollTop <= 0 && deltaY < 0;
        const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1 && deltaY > 0;
        if (!atTop && !atBottom) return true;
      }
      node = node.parentElement;
    }
    return false;
  };

  const tick = (now) => {
    const dt = lastTime ? Math.max(4, now - lastTime) : 16.67;
    lastTime = now;

    // Frame-rate normalized exponential damping
    const steps = clamp(dt / 16.667, 0.35, 3);
    const factor = 1 - Math.pow(1 - lerp, steps);
    const max = maxScroll();
    targetY = clamp(targetY, 0, max);
    currentY += (targetY - currentY) * factor;

    const done = Math.abs(targetY - currentY) < 0.35;
    const nextY = done ? targetY : currentY;

    lastWrittenY = nextY;
    view.scrollTo({ top: nextY, behavior: "instant" });
    view.ScrollTrigger?.update?.();

    if (done) {
      currentY = targetY;
      raf = 0;
      lastTime = 0;
      lastWrittenY = -1;
    } else {
      raf = view.requestAnimationFrame(tick);
    }
  };

  const onWheel = (e) => {
    if (reduced.matches || !finePointer.matches) return;
    if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    if (doc.body.classList.contains("is-loading")) return;
    if (doc.querySelector("dialog[open]")) return;

    // Normalize wheel delta across line/page/pixel modes
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= view.innerHeight;
    if (!dy || Math.abs(e.deltaX) > Math.abs(dy) * 1.2) return;
    if (hasScrollableAncestor(e.target, dy)) return;

    e.preventDefault();

    if (!raf) {
      currentY = view.scrollY || 0;
      targetY = currentY;
    }

    const scaled = clamp(dy * wheelMultiplier, -280, 280);
    targetY = clamp(targetY + scaled, 0, maxScroll());

    if (!raf) {
      lastTime = 0;
      raf = view.requestAnimationFrame(tick);
    }
  };

  const onNativeScroll = () => {
    if (lastWrittenY >= 0 && Math.abs((view.scrollY || 0) - lastWrittenY) <= 2) return;
    // User dragged scrollbar, pressed keys, or clicked an anchor tween — yield immediately
    stop();
  };

  const onKeyDown = (e) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) {
      stop();
    }
  };

  view.addEventListener("wheel", onWheel, { passive: false });
  view.addEventListener("scroll", onNativeScroll, { passive: true });
  view.addEventListener("pointerdown", stop, { passive: true });
  view.addEventListener("touchstart", stop, { passive: true });
  view.addEventListener("keydown", onKeyDown, { passive: true });
  view.addEventListener("resize", stop, { passive: true });

  return {
    stop,
    destroy() {
      stop();
      view.removeEventListener("wheel", onWheel);
      view.removeEventListener("scroll", onNativeScroll);
      view.removeEventListener("pointerdown", stop);
      view.removeEventListener("touchstart", stop);
      view.removeEventListener("keydown", onKeyDown);
      view.removeEventListener("resize", stop);
    },
  };
}
