const THEME_KEY = "mayank-portfolio-theme";
const THEMES = new Set(["dark", "light"]);

export function resolveInitialTheme(storedTheme, prefersDark) {
  if (THEMES.has(storedTheme)) return storedTheme;
  return prefersDark ? "dark" : "light";
}

export function getNextTheme(theme) {
  return theme === "dark" ? "light" : "dark";
}

export function getStoredTheme(storage) {
  try {
    return storage?.getItem?.(THEME_KEY) ?? null;
  } catch {
    return null;
  }
}

export function storeTheme(storage, theme) {
  try {
    storage?.setItem?.(THEME_KEY, theme);
  } catch {
    // Ignore private context storage errors
  }
}

export function applyTheme(documentRef, theme, suppressTransitions = false) {
  const normalizedTheme = THEMES.has(theme) ? theme : "dark";
  const root = documentRef.documentElement;
  const toggle = documentRef.querySelector("[data-theme-toggle]");
  const nextTheme = getNextTheme(normalizedTheme);

  if (suppressTransitions) {
    root.classList.add("theme-switching");
  }

  root.dataset.theme = normalizedTheme;
  root.style.colorScheme = normalizedTheme;
  documentRef
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", normalizedTheme === "dark" ? "#0d1016" : "#fcfdff");

  if (toggle) {
    toggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    toggle.setAttribute("aria-pressed", normalizedTheme === "dark" ? "true" : "false");
    toggle.dataset.themeState = normalizedTheme;
  }

  if (suppressTransitions) {
    const view = documentRef.defaultView ?? window;
    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => {
        root.classList.remove("theme-switching");
      });
    });
  }
}

export function initThemeToggle(documentRef = document) {
  const view = documentRef.defaultView;
  const storage = view?.localStorage;
  const prefersDark = view?.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  const initialTheme = resolveInitialTheme(getStoredTheme(storage), prefersDark);
  const toggle = documentRef.querySelector("[data-theme-toggle]");

  applyTheme(documentRef, initialTheme, false);

  const handleToggle = () => {
    const nextTheme = getNextTheme(documentRef.documentElement.dataset.theme);
    applyTheme(documentRef, nextTheme, true);
    storeTheme(storage, nextTheme);
  };

  toggle?.addEventListener("click", handleToggle);

  return {
    destroy() {
      toggle?.removeEventListener("click", handleToggle);
    },
  };
}
