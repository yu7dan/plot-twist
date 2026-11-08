"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { isAddress } from "viem";
import { NETWORKS } from "@/lib/chains";
import { claimMessage, type PublicGift } from "@/lib/types";
import { CHAIN_UI, WALLETS, type WalletKey } from "@/lib/ui-assets";
import { I } from "../ui/icons";
import { ChainImg, Logo, Mascot, TokenImg, usd } from "../ui/marks";
import { Screen, useMobile } from "../ui/screen";
import { timeLeft } from "../ui/time";
import { connectWallet, NoWallet, showInWallet, type Connected } from "./wallets";

type Phase = "sealed" | "revealed" | "connected" | "claiming" | "claimed" | "expired";
const TAKEN_BACK = ["reclaiming", "reclaimed"];
const short = (a: string) => `${a.slice(0, 5)}…${a.slice(-4)}`;
const spark = <svg className="s" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" /></svg>;
const looksValid = (kind: "evm" | "solana", a: string) => (kind === "evm" ? isAddress(a) : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a));
const QUESTIONS = (sym: string) => [["why", `What is ${sym}?`], ["what", "What can I do with it?"]] as const;

export function ClaimExperience({ gift: initial }: { gift: PublicGift }) {
  const m = useMobile();
  const [gift, setGift] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initial.status === "claimed" ? "claimed" : TAKEN_BACK.includes(initial.status) ? "expired" : "sealed");
  const [display, setDisplay] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [sheet, setSheet] = useState(false);
  const [connecting, setConnecting] = useState<WalletKey | null>(null);
  const [wallet, setWallet] = useState<Connected | null>(null);
  // Claiming to a pasted address (e.g. an exchange deposit address) instead of a connected wallet.
  const [paste, setPaste] = useState<string | null>(null);
  const [pasted, setPasted] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [txUrl, setTxUrl] = useState<string>();
  const amountRef = useRef<HTMLDivElement>(null);

  const net = NETWORKS[gift.network];
  const ui = CHAIN_UI[gift.network];
  const a = net.asset;
  const amount = Number(gift.amount);
  const claimedAddress = wallet?.address || pasted || gift.claim?.address || "";
  const left = timeLeft(gift.expiresAt);
  const windowOver = !!gift.expiresAt && !left;

  async function reveal() {
    setPhase("revealed"); setBurst(true); setDisplay("0.00");
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
        setDisplay((amount * e).toFixed(2));
        if (k < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    setDisplay(null);
    setTimeout(() => setBurst(false), 600);
  }

  async function ask(id: string, question: string) {
    if (answers[id] !== undefined) return;
    setAnswers((s) => ({ ...s, [id]: null }));
    const r = await fetch(`/api/gifts/${gift.code}/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    const d = await r.json().catch(() => ({}));
    setAnswers((s) => ({ ...s, [id]: d.answer || d.error || "SERV couldn't answer right now." }));
  }

  async function pick(key: WalletKey) {
    setConnecting(key); setError("");
    try {
      const w = await connectWallet(key, gift.network);
      setWallet(w); setPasted(null); setSheet(false); setPhase("connected");
    } catch (e) {
      if (e instanceof NoWallet && e.link && m) { window.location.assign(e.link); return; }
      setError(e instanceof NoWallet ? `${WALLETS[key].name} isn't installed in this browser.` : "The wallet didn't connect. Try again.");
    } finally {
      setConnecting(null);
    }
  }

  function usePasted() {
    const a = (paste ?? "").trim();
    if (!looksValid(net.kind, a)) { setError(`That doesn't look like a valid ${net.kind === "solana" ? "Solana" : "0x…"} address. Copy it again from your wallet or exchange.`); return; }
    setWallet(null); setPasted(a); setSheet(false); setError(""); setPhase("connected");
  }

  async function claim() {
    const address = wallet?.address ?? pasted;
    if (!address || !gift.claimNonce) return;
    setError("");
    try {
      const signature = wallet ? await wallet.sign(claimMessage(gift.code, wallet.address, gift.claimNonce)) : undefined;
      setPhase("claiming");
      const r = await fetch(`/api/gifts/${gift.code}/claim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, signature }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "The claim didn't go through");
      setTxUrl(d.txUrl);
      setGift((g) => ({ ...g, status: "claimed", claim: { address, txHash: d.txHash } }));
      setPhase("claimed");
    } catch (e) {
      setPhase("connected");
      setError(e instanceof Error && !/reject|denied|cancel/i.test(e.message) ? e.message : "Signature cancelled.");
    }
  }

  const head = (
    <div className="claim-h">
      <span className="from"><span className="ini">{gift.senderName[0]?.toUpperCase()}</span><span><b>{gift.senderName}</b> sent you a gift</span></span>
      <span className="tag">{gift.occasion}</span>
    </div>
  );

  let card;
  if (phase === "sealed") {
    card = (
      <div className="card claim">{head}
        <div className="seal" onClick={reveal}>
          <Mascot pose="secret" className="seal-m" />
          <div className="amt-xl num blur">{usd(amount)}</div>
          <div className="tok-line num blur">{amount.toFixed(2)} {a.symbol}</div>
        </div>
        <button className="cta" onClick={reveal}>{I.spark}Reveal gift</button>
        <p className="foot">Digital dollars on <ChainImg id={gift.network} className="xs" />{net.name} · Sent with Kite Passport{left && <> · Claim within {left.replace(" left", "")}</>}{windowOver && <> · {gift.senderName} can take it back now</>}</p>
      </div>
    );
  } else if (phase === "expired") {
    card = (
      <div className="card claim">{head}
        <div className="claimed">
          <Mascot pose="wink" className="claimed-m" />
          <h3>This gift was taken back</h3>
          <p>It wasn’t claimed in time, so {gift.senderName} took it back. Ask them to send it again.</p>
        </div>
        <Link className="cta" href="/">Send your own</Link>
      </div>
    );
  } else if (phase === "claimed") {
    const hash = gift.claim?.txHash;
    card = (
      <div className="card claim">{head}
        <div className="claimed">
          <Mascot pose="claimed" className="claimed-m" />
          <h3 className="num">{usd(amount)} claimed</h3>
          <p>{amount.toFixed(2)} {a.symbol} sent to {claimedAddress ? short(claimedAddress) : "your wallet"} on {net.name}</p>
        </div>
        {hash && (
          <div className="txs">
            <a className="tx" href={txUrl || net.txUrl(hash)} target="_blank" rel="noopener"><TokenImg sym={a.symbol} /><b className="num">{amount.toFixed(2)} {a.symbol}</b><span>{ui.explorer} {I.ext}</span></a>
          </div>
        )}
        {wallet && net.kind === "evm" && <button className="cta white" onClick={() => showInWallet(wallet.key, gift.network)}>Show it in {WALLETS[wallet.key].name}</button>}
        <Link className="cta" href="/" style={{ marginTop: 10 }}>Send one back</Link>
        <p className="foot">It may take a few seconds to show in your wallet · <Link href="/dashboard" style={{ color: "var(--accent)" }}>Keep it in your Dashboard →</Link></p>
      </div>
    );
  } else {
    const cta = phase === "revealed"
      ? <button className="cta" onClick={() => { setError(""); setPaste(null); setSheet(true); }}>Claim {usd(amount)}</button>
      : phase === "connected"
        ? <button className="cta" onClick={claim}>Claim {usd(amount)} to {short(claimedAddress)}</button>
        : <button className="cta off" disabled><span className="spin" />Claiming on {net.name}</button>;
    card = (
      <div className="card claim">{head}
        <div className="opened">
          {burst && <Mascot pose="surprise" className="burst-m" />}
          <div className="amt-xl num" ref={amountRef}>{display != null ? `$${display}` : usd(amount)}</div>
          <div className="tok-line">for {gift.recipientName} · {amount.toFixed(2)} {a.symbol} on <ChainImg id={gift.network} className="xs" />{net.name}</div>
        </div>
        <div className="m-block" style={{ marginTop: 16 }}>
          <div className="asset"><TokenImg sym={a.symbol} /><div className="meta"><b className="num">{amount.toFixed(2)} {a.symbol}</b><span>{a.name} · on {net.name}</span></div><span className="usd num">{usd(amount)}</span></div>
        </div>
        <div className="quote">“{gift.note}”</div>
        {cta}
        {phase === "connected" && pasted && (
          <p className="foot paste-check">To <b className="num">{pasted}</b> on <ChainImg id={gift.network} className="xs" />{net.name} · <button className="link" onClick={() => { setPaste(pasted); setSheet(true); }}>Change</button></p>
        )}
        {!sheet && error && <p className="err-line">{error}</p>}
        {phase === "revealed" && (left || windowOver) && (
          <p className="foot" style={{ marginTop: 10 }}>
            {left ? <>Claim within {left.replace(" left", "")} — after that {gift.senderName} can take it back.</> : <>The claim window has ended and {gift.senderName} can take it back anytime. Claim it while it’s here.</>}
          </p>
        )}
        <div className="ask" onClick={() => setAskOpen((v) => !v)}>
          <span>{spark}Ask about this gift</span>
          <span style={askOpen ? { transform: "rotate(180deg)", display: "flex" } : { display: "flex" }}>{I.chev}</span>
        </div>
        {askOpen && (
          <div className="ask-open">
            <div className="chips">
              {QUESTIONS(a.symbol).map(([id, q]) => (
                <button key={id} className={`chip ${answers[id] !== undefined ? "on" : ""}`} onClick={() => ask(id, q)}>{q}</button>
              ))}
            </div>
            {QUESTIONS(a.symbol).map(([id]) => answers[id] !== undefined && (
              <div key={id} className="qa fill-in"><small>{I.spark}SERV</small>{answers[id] ?? <span className="skel" style={{ width: 220 }} />}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const right = wallet
    ? <span className="pill"><span className="avatar b" />{!m && short(wallet.address)}</span>
    : <Link className="btn sm sec" href="/">Send your own</Link>;

  return (
    <Screen>
      {m ? <div className="ph-nav"><Logo />{right}</div> : <header className="nav"><Logo /><div className="nav-r">{right}</div></header>}
      <div className="claim-wrap" style={m ? undefined : { paddingBottom: 60 }}>
        <div className="col">{card}</div>
      </div>

      {sheet && (
        <>
          <div className="sheet-scrim" onClick={() => setSheet(false)} />
          <div className="sheet">
            <div className="grab" />
            {paste === null ? (<>
            <div className="m-h" style={{ marginBottom: 2 }}><span>Where should it go?</span><button className="x" onClick={() => setSheet(false)}>{I.x}</button></div>
            <p className="sub">Your gift lands on <ChainImg id={gift.network} className="xs" />{net.name}. No sign-up, no gas.</p>
            <div className="wallets">
              {ui.wallets.map((k, i) => (
                <button key={k} className={`wl ${connecting === k ? "on" : ""}`} onClick={() => pick(k)} disabled={!!connecting}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className={`brand ${"pad" in WALLETS[k] ? "pad" : ""}`}><img src={WALLETS[k].icon} alt="" /></span>
                  {WALLETS[k].name}
                  <small>{connecting === k ? "Connecting…" : i === 0 ? "Popular" : ""}</small>
                </button>
              ))}
            </div>
            <div className="or-line"><span>or</span></div>
            <button className="wl paste-wl" onClick={() => { setError(""); setPaste(""); }}>
              <span className="brand paste-ic">{I.copy}</span>
              Paste an address
              <small>Exchange or any wallet</small>
            </button>
            {error && <p className="err-line">{error}</p>}
            {net.isNew && <p className="fine" style={{ textAlign: "left", marginTop: 12 }}>{net.name} is a newer network. After claiming, your wallet can add it in one tap.</p>}
            </>) : (<>
            <div className="m-h" style={{ marginBottom: 2 }}><button className="x back" onClick={() => { setPaste(null); setError(""); }}>{I.chev}</button><span>Paste an address</span><button className="x" onClick={() => setSheet(false)}>{I.x}</button></div>
            <p className="sub">A {net.kind === "solana" ? "Solana" : "0x…"} address that can receive <b>{a.symbol} on <ChainImg id={gift.network} className="xs" />{net.name}</b>.</p>
            <label className="tu-amt">
              <input className="tu-addr num" autoFocus placeholder={net.kind === "solana" ? "Solana address" : "0x… address"} value={paste} onChange={(e) => { setPaste(e.target.value.trim()); setError(""); }} spellCheck={false} />
            </label>
            <div className="paste-warn">{I.lock}<span>From an exchange? Use its <b>{a.symbol} deposit address on {net.name}</b>. If the exchange doesn’t support {net.name}, the gift can’t be recovered.</span></div>
            <button className="cta" disabled={!paste} onClick={usePasted}>Continue</button>
            {error && <p className="err-line">{error}</p>}
            </>)}
          </div>
        </>
      )}
    </Screen>
  );
}
