export function createNavigation(root = document) {
  const view = root.defaultView;
  const gsap = view.gsap;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = view.matchMedia('(max-width: 900px)');
  const nav = root.querySelector('.site-nav');
  const trigger = root.querySelector('.nav-toggle');
  const dialog = root.querySelector('[data-navigation-dialog]');
  const closeButton = dialog.querySelector('[data-nav-close]');
  const slot = dialog.querySelector('[data-nav-slot]');
  const home = root.createComment('Desktop navigation');
  nav.before(home);
  const listeners = [];
  let menuTween, linkTween, scrollTween, oldOverflow = '', frame = 0, destroyed = false;
  const listen = (el, event, callback, options) => {
    el.addEventListener(event, callback, options);
    listeners.push(() => el.removeEventListener(event, callback, options));
  };
  const interruptScroll = () => { scrollTween?.kill(); scrollTween = null; };
  const focusTarget = (target) => {
    const hadTabIndex = target.hasAttribute('tabindex');
    if (!hadTabIndex) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (!hadTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  };
  const scrollToPosition = (destination, target) => {
    interruptScroll();
    const y = Math.max(0, Math.min(destination, root.documentElement.scrollHeight - view.innerHeight));
    if (reduced.matches || !gsap) {
      view.scrollTo({ top: y, behavior: 'instant' });
      if (target) focusTarget(target);
      return;
    }
    const position = { y: view.scrollY };
    scrollTween = gsap.to(position, {
      y, duration: Math.min(1.15, .55 + Math.abs(y - position.y) / 8000), ease: 'power3.inOut',
      onUpdate: () => view.scrollTo({ top: position.y, behavior: 'instant' }),
      onComplete: () => { scrollTween = null; if (target) focusTarget(target); },
    });
  };
  const scrollToTarget = (target, updateHistory = true) => {
    const destination = target.id === 'top' ? 0 : target.getBoundingClientRect().top + view.scrollY - 32;
    if (updateHistory && view.location.hash !== `#${target.id}`) view.history.pushState(null, '', `#${target.id}`);
    scrollToPosition(destination, target);
  };
  const finishClose = (restore, after) => {
    dialog.close();
    nav.querySelectorAll('a').forEach(link => { link.style.removeProperty('transform'); link.style.removeProperty('opacity'); });
    root.documentElement.style.overflow = oldOverflow;
    root.documentElement.removeAttribute('data-index-open');
    if (restore) trigger.focus({ preventScroll: true });
    after?.();
  };
  const close = ({ immediate = false, restore = true, after } = {}) => {
    if (!dialog.open) { after?.(); return; }
    menuTween?.kill();
    linkTween?.kill();
    trigger.setAttribute('aria-expanded', 'false');
    dialog.dataset.expanded = 'false';
    if (immediate || reduced.matches || !gsap) finishClose(restore, after);
    else menuTween = gsap.to(dialog, { xPercent: 100, duration: .28, ease: 'power3.inOut', onComplete: () => finishClose(restore, after) });
  };
  const open = () => {
    if (dialog.open || !compact.matches) return;
    interruptScroll();
    menuTween?.kill();
    linkTween?.kill();
    oldOverflow = root.documentElement.style.overflow;
    root.documentElement.style.overflow = 'hidden';
    root.documentElement.dataset.indexOpen = 'true';
    dialog.showModal();
    dialog.dataset.expanded = 'true';
    trigger.setAttribute('aria-expanded', 'true');
    closeButton.focus({ preventScroll: true });
    if (gsap && !reduced.matches) {
      menuTween = gsap.fromTo(dialog, { xPercent: 100 }, { xPercent: 0, duration: .4, ease: 'power3.out' });
      linkTween = gsap.fromTo(nav.querySelectorAll('a'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .3, stagger: .045, delay: .08, ease: 'power3.out', clearProps: 'transform,opacity' });
    } else {
      dialog.style.transform = 'none';
      nav.querySelectorAll('a').forEach(link => { link.style.transform = ''; link.style.opacity = ''; });
    }
  };
  const mount = () => {
    close({ immediate: true, restore: false });
    if (compact.matches) slot.append(nav);
    else home.after(nav);
  };
  listen(trigger, 'click', open);
  listen(closeButton, 'click', () => close());
  listen(dialog, 'cancel', event => { event.preventDefault(); close({ immediate: true }); });
  listen(dialog, 'keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]), a[href]')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && root.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && root.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  listen(dialog, 'click', event => {
    if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) close();
  });
  listen(compact, 'change', mount);
  listen(reduced, 'change', () => { interruptScroll(); if (dialog.open) close({ immediate: true }); });
  mount();

  listen(root, 'click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, view.location.href);
    if (url.origin !== view.location.origin || url.pathname !== view.location.pathname || url.search !== view.location.search || !url.hash) return;
    let target;
    try { target = root.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    close({ restore: false, after: () => scrollToTarget(target) });
  });
  ['wheel', 'touchstart', 'pointerdown'].forEach(event => listen(view, event, interruptScroll, { passive: true }));
  listen(view, 'keydown', event => {
    if (!event.defaultPrevented && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) interruptScroll();
  });
  listen(view, 'pagehide', () => { interruptScroll(); close({ immediate: true, restore: false }); });

  const sections = [...nav.querySelectorAll('a[href^="#"]')].map(link => ({ link, section: root.querySelector(link.getAttribute('href')) })).filter(item => item.section);
  const updateCurrent = () => {
    frame = 0;
    if (destroyed) return;
    const current = sections.filter(item => item.section.getBoundingClientRect().top <= 160).at(-1);
    sections.forEach(item => {
      if (item === current) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
    trigger.querySelector('[data-nav-index]').textContent = current?.link.dataset.navNumber ?? '00';
  };
  listen(view, 'scroll', () => { if (!frame) frame = view.requestAnimationFrame(updateCurrent); }, { passive: true });
  updateCurrent();
  return { scrollToTarget, scrollToPosition, destroy() {
    destroyed = true;
    interruptScroll();
    close({ immediate: true, restore: false });
    listeners.forEach(remove => remove());
    view.cancelAnimationFrame(frame);
    home.after(nav);
    home.remove();
  } };
}
