"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NETWORK_ORDER } from "@/lib/chains";
import { GiftFlow } from "../create/create-flow";
import { KiteConnect } from "../kite/kite-connect";
import { V } from "../site/icons";
import { PRODUCTS, SiteNav, type Product } from "../site/site-nav";
import { Brand, ChainImg, Logo, Mascot } from "../ui/marks";
import { flash, Screen } from "../ui/screen";
import { useKite } from "../use-kite";
import { ApiPanel } from "./api-panel";
import { DropPanel } from "./drop-panel";

/** The mascot cast floating around the panel; further away = smaller and softer. [pose, left %, top %, width px, depth] */
const CAST: [string, number, number, number, string][] = [
  ["happy", 8, 20, 130, ""], ["wink", 82, 14, 120, ""], ["cute", 20, 60, 84, "mid"], ["sparkle", 74, 56, 96, "mid"],
  ["secret", 4, 84, 70, "far"], ["surprise", 90, 80, 76, "far"], ["claimed", 32, 10, 56, "far"], ["happy", 64, 8, 52, "far"],
];

const isProduct = (v: string | null): v is Product => v === "gift" || v === "drop" || v === "api";

export function Home() {
  const kite = useKite();
  const [tab, setTab] = useState<Product>("gift");
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of ?tab= from the URL
    if (isProduct(t)) setTab(t);
  }, []);

  function pick(t: Product) {
    setTab(t);
    const q = new URLSearchParams(window.location.search);
    if (t === "gift") q.delete("tab"); else q.set("tab", t);
    history.replaceState(null, "", q.size ? `/?${q}` : "/");
  }

  const connect = () => setConnectOpen(true);

  return (
    <Screen glow={false}>
      <SiteNav kite={kite} onConnect={connect} onProduct={pick} />
      <div className="v-home">
        <section className="v-hero">
          <div className="v-cast" aria-hidden="true">
            {CAST.map(([pose, x, y, w, depth], i) => <Mascot key={i} pose={pose} className={depth} style={{ left: `${x}%`, top: `${y}%`, width: w, animationDelay: `${-i * 1.3}s` }} />)}
          </div>
          <h1>Send money<br /><em>like a gift.</em></h1>
          <div className="v-panel">
            <div className="v-tabs" role="tablist">
              {PRODUCTS.map((p) => <button key={p.k} role="tab" aria-selected={tab === p.k} className={tab === p.k ? "on" : ""} onClick={() => pick(p.k)}>{p.name}</button>)}
            </div>
            {/* Kept mounted so a half-designed gift survives a look at the other tabs. */}
            <div hidden={tab !== "gift"}><GiftFlow kite={kite} onConnect={connect} /></div>
            <div hidden={tab !== "drop"}><DropPanel kite={kite} onConnect={connect} /></div>
            <div hidden={tab !== "api"}><ApiPanel /></div>
          </div>
          <p className="v-under">
            USDC on <span className="nets">{NETWORK_ORDER.map((id) => <ChainImg key={id} id={id} />)}</span> 7 networks. Claimed with any wallet<br />
            or exchange address — <a>gas is on us</a>.
          </p>
        </section>

        <section className="v-sec">
          <h2>Built for every way you give.</h2>
          <p className="lead">One person, a whole community, or your AI agent — the same describe, approve, claim flow.</p>
          <div className="v-cards3">
            <button className="v-pcard gift" onClick={() => { pick("gift"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <span className="kick">{V.gift}Gift</span><h3>A gift link for someone you care about.</h3>
              <p>SERV designs it from one sentence and writes the note. It stays sealed until they reveal it.</p>
              <span className="go">Send a gift {V.arrow}</span><Mascot pose="secret" className="art" />
            </button>
            <button className="v-pcard drop" onClick={() => { pick("drop"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <span className="kick">{V.drop}Drop</span><h3>Pay a whole list with one approval.</h3>
              <p>Rewards, bounties, prizes and research incentives. Everyone gets their own link and note.</p>
              <span className="go">Start a Drop {V.arrow}</span><Mascot pose="happy" className="art" />
            </button>
            <button className="v-pcard api" onClick={() => { pick("api"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <span className="kick">{V.api}Agent API</span><h3>Let your agent pay people.</h3>
              <p>REST or function calling. Your agent prepares it; you approve with your Kite passkey.</p>
              <span className="go">Connect an agent {V.arrow}</span><Mascot pose="sparkle" className="art" />
            </button>
          </div>
        </section>

        <section className="v-sec">
          <h2>Describe it. Approve once. They claim.</h2>
          <div className="v-steps">
            <div className="v-step"><div className="n">01</div><b>Describe it</b><p>A sentence, a pasted list or an API call. SERV works out who, how much and the occasion, and writes every note.</p></div>
            <div className="v-step"><div className="n">02</div><b>Approve once on Kite</b><p>Kite Passport shows the exact total. One passkey tap pays for a gift or a whole Drop. We never hold your keys.</p></div>
            <div className="v-step"><div className="n">03</div><b>They claim</b><p>Each person opens their link and claims to a wallet or an exchange address. No sign-up, no gas.</p></div>
          </div>
        </section>

        <section className="v-sec">
          <h2>The AI writes. You approve. The chain proves it.</h2>
          <div className="v-trust">
            <div><b>Passkey on every payment</b><p>Nothing moves until you approve the exact total on Kite.</p></div>
            <div><b>Verified on-chain</b><p>Every payment and claim is a public transaction.</p></div>
            <div><b>Take it back</b><p>Not claimed in the window you chose? It comes back to you.</p></div>
            <div><b>Stable value</b><p>USDC and USDG are dollar stablecoins. $50 stays $50.</p></div>
          </div>
          <div className="v-built">Built with <span className="w"><Brand k="kite" />Kite Passport</span><span className="w os"><Brand k="openserv" /></span></div>
        </section>

        <footer className="v-foot">
          <div className="v-foot-in">
            <div><Logo /><p>Send money like a gift — to one person, a whole list, or through your AI agent.</p></div>
            <div><h5>Products</h5>{PRODUCTS.map((p) => <a key={p.k} onClick={() => { pick(p.k); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{p.name}</a>)}</div>
            <div><h5>Resources</h5><Link href="/docs">Docs</Link><Link href="/dashboard">Dashboard</Link><a href="https://github.com/yu7dan/plot-twist" target="_blank" rel="noopener">GitHub</a></div>
            <div><h5>Built with</h5><a href="https://gokite.ai" target="_blank" rel="noopener">Kite Passport</a><a href="https://www.openserv.ai" target="_blank" rel="noopener">SERV Reasoning</a><span style={{ color: "var(--muted)", fontSize: 15 }}>USDC · USDG</span></div>
          </div>
        </footer>
      </div>
      {connectOpen && <KiteConnect onClose={() => setConnectOpen(false)} onConnected={() => { setConnectOpen(false); kite.refresh(); flash("Kite Passport connected"); }} />}
    </Screen>
  );
}
