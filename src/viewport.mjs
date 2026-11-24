export function isLayoutResize(previous, next, touch) {
  return Math.abs(previous.width - next.width) > 1 || previous.angle !== next.angle ||
    (!touch && previous.height !== next.height);
}

export function statementEnd(textWidth, viewportWidth, inset = 20) {
  return Math.min(inset, viewportWidth - textWidth - inset);
}

export function createStableViewport(root, onResize) {
  const view = root.defaultView;
  const touch = view.matchMedia('(pointer: coarse)');
  const read = () => ({ width: view.innerWidth, height: view.innerHeight, angle: view.screen.orientation?.angle ?? 0 });
  let size = read(), timer = 0;
  const write = () => root.documentElement.style.setProperty('--motion-height', `${size.height}px`);
  write();
  const resize = () => {
    view.clearTimeout(timer);
    timer = view.setTimeout(() => {
      const next = read();
      // Address-bar animation must not change the coordinate system mid-scroll.
      if (!isLayoutResize(size, next, touch.matches)) return;
      size = next;
      write();
      onResize?.();
    }, 180);
  };
  view.addEventListener('resize', resize, { passive: true });
  view.screen.orientation?.addEventListener('change', resize);
  return {
    get height() { return size.height; },
    get width() { return size.width; },
    destroy() {
      view.clearTimeout(timer);
      view.removeEventListener('resize', resize);
      view.screen.orientation?.removeEventListener('change', resize);
      root.documentElement.style.removeProperty('--motion-height');
    },
  };
}
