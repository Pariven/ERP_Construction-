"use client";

import { useEffect, useState } from "react";

// Recharts writes SVG `fill`/`stroke` as plain presentation attributes, so we
// read the resolved token values from CSS rather than relying on var()
// support inside those attributes. Falls back to the light-mode hex values
// for the first paint, then syncs to the real tokens (and OS theme changes)
// once mounted.
const VARS = {
  cat1: "--cat-1",
  cat2: "--cat-2",
  gridline: "--gridline",
  muted: "--text-muted",
  secondary: "--text-secondary",
  surface: "--surface-1",
  statusGood: "--status-good",
  statusCritical: "--status-critical",
} as const;

const FALLBACK: Record<keyof typeof VARS, string> = {
  cat1: "#2a78d6",
  cat2: "#eb6834",
  gridline: "#e1e0d9",
  muted: "#898781",
  secondary: "#52514e",
  surface: "#fcfcfb",
  statusGood: "#0ca30c",
  statusCritical: "#d03b3b",
};

export function useChartColors() {
  const [colors, setColors] = useState(FALLBACK);

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      const next = { ...FALLBACK };
      for (const key of Object.keys(VARS) as (keyof typeof VARS)[]) {
        const value = style.getPropertyValue(VARS[key]).trim();
        if (value) next[key] = value;
      }
      setColors(next);
    };
    read();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);
    return () => media.removeEventListener("change", read);
  }, []);

  return colors;
}
