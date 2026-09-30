"use client";

// Light/dark switch.
//
// The theme lives on <html data-theme>. The inline script in the root layout
// sets it before first paint, so this component never has to guess during
// hydration: which glyph is visible is decided by CSS
// (html[data-theme="light"] …), and the click handler reads the current value
// straight off the element. No state, therefore no hydration mismatch and no
// icon flash.

const STORAGE_KEY = "gc-theme";

export type ThemeName = "dark" | "light";

/** Runs before first paint (see src/app/layout.tsx). */
export const THEME_BOOTSTRAP = `(function(){try{var k='${STORAGE_KEY}';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';localStorage.setItem(k,t);}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function currentTheme(): ThemeName {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(next: ThemeName) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode / storage disabled — the session still switches, it just
    // will not be remembered.
  }
}

export default function ThemeToggle() {
  return (
    <button
      type="button"
      className="iconBtn themeToggle"
      onClick={() => applyTheme(currentTheme() === "light" ? "dark" : "light")}
      title="切换明亮 / 深色背景"
      aria-label="切换明亮 / 深色背景"
    >
      <svg className="themeIcon themeIconMoon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="themeIcon themeIconSun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
        </g>
      </svg>
    </button>
  );
}
