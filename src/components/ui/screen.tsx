"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const QUERY = "(max-width: 640px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True on phone-sized screens. The design system switches to its mobile layout under a `.m` root. */
export const useMobile = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

const noop = () => () => {};
/** False during server render and hydration, true after: lets phones skip the desktop markup flash. */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

export function Screen({ children, glow = true, className = "" }: { children: ReactNode; glow?: boolean; className?: string }) {
  const m = useMobile();
  const ready = useHydrated();
  return <div className={`screen desk app${glow ? " glow" : ""}${m ? " m" : ""} ${className}`} data-pending={ready ? undefined : ""}>{children}</div>;
}

export function flash(msg: string) {
  const f = document.createElement("div");
  f.className = "flash";
  f.textContent = msg;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1800);
}
