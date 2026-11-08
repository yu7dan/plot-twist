"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import { AddFunds } from "./kite/add-funds";
import { Withdraw } from "./kite/withdraw";
import { I } from "./ui/icons";
import { Brand, ChainImg, Logo, usd } from "./ui/marks";
import { flash, useMobile } from "./ui/screen";
import type { Kite } from "./use-kite";

interface Props {
  tab: "create" | "dashboard";
  kite: Kite;
  onConnect: () => void;
  /** Gift network pill (create page only). */
  network?: NetworkId;
  onNetwork?: () => void;
}

/** Modals render at the screen root: the sticky nav's backdrop blur would otherwise trap fixed overlays. */
const atScreen = (node: ReactNode) => createPortal(node, document.querySelector(".screen.app") ?? document.body);

/** Kite balance pill; once connected it opens a menu to add funds, withdraw or sign out from any page. */
export function KitePill({ kite, onConnect, m }: { kite: Kite; onConnect: () => void; m: boolean }) {
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<null | "add" | "withdraw">(null);

  if (kite.loading) return <span className="pill kite-pill"><Brand k="kite" /></span>;
  if (!kite.connected)
    return (
      <button className="pill kite-pill off" onClick={onConnect}>
        <Brand k="kite" />{m ? "Connect" : "Connect Kite"}
      </button>
    );

  async function signOut() {
    setMenu(false);
    await fetch("/api/kite/logout", { method: "POST" });
    await kite.refresh();
    flash("Signed out of Kite Passport");
  }

  return (
    <span className="kite-menu-wrap">
      <button className="pill kite-pill" title={kite.email} onClick={() => setMenu((v) => !v)}>
        <Brand k="kite" />
        {!m && <>Kite · <span className="num">{usd(kite.total)}</span></>}
        {I.chev}
      </button>
      {menu && (
        <>
          {atScreen(<div className="menu-scrim km-scrim" onClick={() => setMenu(false)} />)}
          <div className="kite-menu">
            <div className="km-h"><b className="num">{usd(kite.total)}</b><small>{kite.email}</small></div>
            <button onClick={() => { setMenu(false); setModal("add"); }}>{I.down}Add funds</button>
            <button onClick={() => { setMenu(false); setModal("withdraw"); }}><span className="km-up">{I.down}</span>Withdraw</button>
            <Link href="/dashboard" onClick={() => setMenu(false)}>{I.right}Dashboard</Link>
            <button onClick={signOut}>{I.x}Sign out</button>
          </div>
        </>
      )}
      {modal === "add" && atScreen(<AddFunds kite={kite} onClose={() => setModal(null)} />)}
      {modal === "withdraw" && atScreen(<Withdraw kite={kite} onClose={() => setModal(null)} />)}
    </span>
  );
}

export function Nav({ tab, kite, onConnect, network, onNetwork }: Props) {
  const m = useMobile();
  const chainPill = network && (
    <button className="pill chain-pill" onClick={onNetwork}>
      <ChainImg id={network} />{!m && NETWORKS[network].name}{I.chev}
    </button>
  );
  if (m) {
    return (
      <>
        <header className="ph-nav">
          <Logo />
          <div className="nav-r">{chainPill}<KitePill kite={kite} onConnect={onConnect} m /></div>
        </header>
        <div className="tabs-m">
          <Link className={tab === "create" ? "on" : ""} href="/create">Create</Link>
          <Link className={tab === "dashboard" ? "on" : ""} href="/dashboard">Dashboard</Link>
        </div>
      </>
    );
  }
  return (
    <header className="nav">
      <div className="nav-l">
        <Logo />
        <nav className="tabs">
          <Link className={tab === "create" ? "on" : ""} href="/create">Create</Link>
          <Link className={tab === "dashboard" ? "on" : ""} href="/dashboard">Dashboard</Link>
        </nav>
      </div>
      <div className="nav-r">{chainPill}<KitePill kite={kite} onConnect={onConnect} m={false} /></div>
    </header>
  );
}
