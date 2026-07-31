"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Starts null so the server-rendered markup and first client render match
  // (avoids a hydration mismatch) — fills in immediately on mount.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setTheme(stored === "light" || stored === "dark" ? stored : getSystemTheme());

    // The toggle renders in both the desktop sidebar and the mobile header;
    // only one is visible at a time (CSS), but both stay mounted. This keeps
    // the hidden one's label in sync so it isn't stale if the viewport
    // crosses the responsive breakpoint without a reload.
    function onThemeChange(e: Event) {
      setTheme((e as CustomEvent<Theme>).detail);
    }
    window.addEventListener("theme-change", onThemeChange);
    return () => window.removeEventListener("theme-change", onThemeChange);
  }, []);

  function toggle() {
    const next: Theme = (theme ?? getSystemTheme()) === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new CustomEvent<Theme>("theme-change", { detail: next }));
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle color mode"}
      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-page hover:text-text-primary ${className}`}
    >
      {isDark ? (
        <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
          <path d="M10 15a5 5 0 100-10 5 5 0 000 10zM10 0a1 1 0 011 1v1a1 1 0 11-2 0V1a1 1 0 011-1zM10 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM20 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM3 10a1 1 0 01-1 1H1a1 1 0 010-2h1a1 1 0 011 1zM16.657 3.343a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM5.464 14.536a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM16.657 16.657a1 1 0 01-1.414 0l-.707-.707a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414zM5.464 5.464a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" />
        </svg>
      )}
      <span>{theme ? (isDark ? "Dark" : "Light") : "Theme"}</span>
    </button>
  );
}
