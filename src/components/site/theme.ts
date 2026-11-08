"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

/** Follows `data-theme` on <html> (set before paint by the layout's script). */
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"), () => "dark") as Theme;
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("pt-theme", next); } catch {}
  };
  return { theme, toggle };
}
