"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KitePill } from "../nav";
import { I } from "../ui/icons";
import { Logo } from "../ui/marks";
import { useMobile } from "../ui/screen";
import type { Kite } from "../use-kite";
import { ProductIcon, V } from "./icons";
import { useTheme } from "./theme";

export type Product = "gift" | "drop" | "api";

export const PRODUCTS: { k: Product; name: string; desc: string }[] = [
  { k: "gift", name: "Gift", desc: "One person, one gift link" },
  { k: "drop", name: "Drop", desc: "Pay a whole list in one approval" },
  { k: "api", name: "Agent API", desc: "Let your AI agent send for you" },
];

interface Props {
  kite: Kite;
  onConnect: () => void;
  active?: "dashboard" | "docs";
  /** On the home page, products switch the panel in place instead of navigating. */
  onProduct?: (p: Product) => void;
}

const href = (p: Product) => (p === "gift" ? "/" : `/?tab=${p}`);

/** Transparent at the top, frosted glass once the page scrolls. */
export function SiteNav({ kite, onConnect, active, onProduct }: Props) {
  const m = useMobile();
  const { theme, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const [glass, setGlass] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Close the menu on any click outside the nav (a scrim inside the blurred nav couldn't cover the page).
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [menu]);

  useEffect(() => {
    const on = () => setGlass(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const product = ({ k, name, desc }: (typeof PRODUCTS)[number]) => {
    const body = <><ProductIcon k={k} /><span><b>{name}</b><span className="d">{desc}</span></span></>;
    return onProduct
      ? <a key={k} onClick={() => { setMenu(false); onProduct(k); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{body}</a>
      : <Link key={k} href={href(k)} onClick={() => setMenu(false)}>{body}</Link>;
  };

  return (
    <header ref={ref} className={`v-nav${glass ? " glass" : ""}`}>
      <div className="v-nav-l">
        <Logo />
        <div className={`v-mi${menu && !m ? " open" : ""}`}>
          <button onClick={() => setMenu((v) => !v)}>Products {I.chev}</button>
          {menu && !m && <div className="v-dd">{PRODUCTS.map(product)}</div>}
        </div>
        <div className="v-mi"><Link className={active === "dashboard" ? "on" : ""} href="/dashboard">Dashboard</Link></div>
        <div className="v-mi"><Link className={active === "docs" ? "on" : ""} href="/docs">Docs</Link></div>
      </div>
      <div className="v-nav-r">
        <button className="v-icon" title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={toggle}>{theme === "dark" ? V.sun : V.moon}</button>
        <KitePill kite={kite} onConnect={onConnect} m={m} />
        <button className="v-icon v-burger" aria-label="Menu" onClick={() => setMenu((v) => !v)}>{V.burger}</button>
      </div>
      {menu && m && (
        <div className="v-mobile-menu">
          {PRODUCTS.map(product)}
          <Link href="/dashboard" onClick={() => setMenu(false)}>Dashboard</Link>
          <Link href="/docs" onClick={() => setMenu(false)}>Docs</Link>
        </div>
      )}
    </header>
  );
}
