"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { NETWORKS, NETWORK_ORDER, type NetworkId } from "@/lib/chains";
import type { GiftStatus } from "@/lib/types";
import { WALLETS, type WalletKey } from "@/lib/ui-assets";
import { connectWallet, NoWallet } from "./claim/wallets";
import { AddFunds } from "./kite/add-funds";
import { KiteConnect } from "./kite/kite-connect";
import { Withdraw } from "./kite/withdraw";
import { ApiKeys } from "./api-keys";
import { V } from "./site/icons";
import { SiteNav } from "./site/site-nav";
import { Reclaim, type ReclaimItem } from "./reclaim";
import { I } from "./ui/icons";
import { Brand, ChainImg, Mascot, TokenImg, usd } from "./ui/marks";
import { flash, Screen, useMobile } from "./ui/screen";
import { timeLeft } from "./ui/time";
import { useKite } from "./use-kite";

interface SentRow { code: string; createdAt: string; recipientName: string; occasion: string; amount: string; network: NetworkId; status: GiftStatus; claimedAt?: string; expiresAt?: string; reclaimable?: boolean; reclaimTo?: string; reclaimTxUrl?: string }
interface ReceivedRow { code: string; senderName: string; occasion: string; amount: string; network: NetworkId; note: string; claimedAt?: string; address?: string; txUrl?: string }
interface Wallet { address: string; kind: "evm" | "solana"; linkedAt: string }
interface DropRow { id: string; title: string; createdAt: string; network: NetworkId; status: "awaiting_payment" | "payment_failed" | "live"; amount: string; expiresAt?: string; count: number; claimedCount: number; openAmount: string; reclaimable: boolean }
interface Account { sent: SentRow[]; drops: DropRow[]; received: ReceivedRow[]; wallets: Wallet[] }

const PILL: Record<GiftStatus, [string, string]> = {
  claimed: ["done", "Claimed"],
  sealed: ["wait", "Waiting"],
  claiming: ["wait", "Waiting"],
  awaiting_payment: ["unpaid", "Awaiting payment"],
  payment_failed: ["unpaid", "Payment failed"],
  reclaiming: ["wait", "Taking back"],
  reclaimed: ["done", "Taken back"],
};
const PAID: GiftStatus[] = ["sealed", "claiming", "claimed"];
const LINKABLE: { key: WalletKey; network: NetworkId }[] = [
  { key: "metamask", network: "base" },
  { key: "coinbase", network: "base" },
  { key: "trust", network: "base" },
  { key: "phantom", network: "solana" },
  { key: "solflare", network: "solana" },
];

const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—");
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const open = (code: string) => window.open(`/g/${code}`, "_blank", "noopener");

/** Past its window an unclaimed gift shows a "Take back" button instead of a status. */
function Status({ g, onReclaim }: { g: SentRow; onReclaim: (g: SentRow) => void }) {
  if (g.reclaimable) {
    return <button className="btn sm acc rc-btn" onClick={(e) => { e.stopPropagation(); onReclaim(g); }}>Take back</button>;
  }
  const [cls, label] = PILL[g.status];
  const left = g.status === "sealed" ? timeLeft(g.expiresAt) : null;
  return <span className={`status ${cls}`}><span className="d" />{label}{left && <small className="left"> · {left}</small>}</span>;
}

function copyLink(e: MouseEvent, code: string) {
  e.stopPropagation();
  navigator.clipboard?.writeText(`${location.origin}/g/${code}`).catch(() => {});
  flash("Link copied");
}

const AssetCell = ({ network }: { network: NetworkId }) => {
  const sym = NETWORKS[network].asset.symbol;
  return <span className="as-cell"><TokenImg sym={sym} /><span>{sym}</span><span className="on-chain"><ChainImg id={network} className="xs" />{NETWORKS[network].name}</span></span>;
};

export function Dashboard() {
  const m = useMobile();
  const kite = useKite();
  const [connectOpen, setConnectOpen] = useState(false);
  const [tab, setTab] = useState<"sent" | "drops" | "received" | "keys">("sent");
  const [data, setData] = useState<Account | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linking, setLinking] = useState<WalletKey | null>(null);
  const [linkError, setLinkError] = useState("");
  const [funds, setFunds] = useState<null | "add" | "withdraw">(null);
  const [reclaim, setReclaim] = useState<ReclaimItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetch("/api/account", { cache: "no-store" }).then((r) => r.json());
      setData(d.connected ? { sent: d.sent ?? [], drops: d.drops ?? [], received: d.received ?? [], wallets: d.wallets ?? [] } : null);
    } catch {
      setData({ sent: [], drops: [], received: [], wallets: [] });
    }
  }, []);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of ?tab= from the URL
    if (t === "drops" || t === "received" || t === "keys") setTab(t);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the account once Kite is connected
    if (kite.connected) load();
  }, [kite.connected, load]);

  async function link(key: WalletKey, network: NetworkId) {
    setLinking(key); setLinkError("");
    try {
      const w = await connectWallet(key, network);
      const kind = NETWORKS[network].kind;
      const { message, error } = await fetch(`/api/account/wallets?address=${encodeURIComponent(w.address)}&kind=${kind}`).then((r) => r.json());
      if (!message) throw new Error(error || "Couldn't link this wallet");
      const signature = await w.sign(message);
      const r = await fetch("/api/account/wallets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: w.address, kind, signature }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't link this wallet");
      setLinkOpen(false);
      flash("Wallet linked");
      load();
    } catch (e) {
      if (e instanceof NoWallet) {
        if (e.link && m) { window.location.assign(e.link); return; }
        setLinkError(`${WALLETS[key].name} isn't installed in this browser.`);
      } else setLinkError(e instanceof Error && !/reject|denied|cancel/i.test(e.message) ? e.message : "Signature cancelled.");
    } finally {
      setLinking(null);
    }
  }

  async function unlink(address: string) {
    await fetch(`/api/account/wallets?address=${encodeURIComponent(address)}`, { method: "DELETE" });
    load();
  }

  const onConnected = () => { setConnectOpen(false); kite.refresh(); load(); };

  /* ---------- account card ---------- */
  const account = kite.connected && (
    <div className="acct">
      <div className="acct-h">
        <span className="acct-id"><Brand k="kite" /><span><b>{kite.email}</b><small>Kite Passport</small></span></span>
        <span className="acct-r">
          <span className="acct-total"><small>Balance</small><b className="num">{usd(kite.total)}</b></span>
          <span className="acct-btns">
            <button className="btn sm acc" onClick={() => setFunds("add")}>Add funds</button>
            <button className="btn sm sec" onClick={() => setFunds("withdraw")}>Withdraw</button>
          </span>
        </span>
      </div>
      <div className="bal-chips">
        {NETWORK_ORDER.map((id) => (
          <span key={id} className={`bal-chip${(kite.balances[id] ?? 0) > 0 ? "" : " zero"}`}>
            <ChainImg id={id} className="xs" />{NETWORKS[id].name}<b className="num">{(kite.balances[id] ?? 0).toFixed(2)}</b>
          </span>
        ))}
      </div>
    </div>
  );

  /* ---------- sent ---------- */
  const sent = data?.sent ?? [];
  const paid = sent.filter((g) => PAID.includes(g.status));
  const expired = sent.filter((g) => g.reclaimable);
  const reclaimBar = expired.length > 0 && (
    <div className="rc-bar">
      <span><b className="num">{usd(expired.reduce((a, g) => a + Number(g.amount), 0))}</b> unclaimed in {expired.length} expired {expired.length === 1 ? "gift" : "gifts"} — you can take it back.</span>
      <button className="btn sm acc" onClick={() => setReclaim(expired)}>{expired.length === 1 ? "Take back" : "Take back all"}</button>
    </div>
  );
  const sentBody = sent.length === 0 ? (
    <div className="g-empty"><Mascot pose="wink" className="g-empty-m" /><p>No gifts sent yet.</p><Link className="cta" href="/">New gift</Link></div>
  ) : (
    <>
      {reclaimBar}
      <div className="stats">
        <div className="stat"><span>Total sent</span><b className="num">{usd(paid.reduce((a, g) => a + Number(g.amount), 0))}</b></div>
        <div className="stat"><span>Gifts</span><b className="num">{sent.length}</b></div>
        <div className="stat"><span>Claimed</span><b className="num">{sent.filter((g) => g.status === "claimed").length} <small>of {sent.length}</small></b></div>
      </div>
      {m ? sent.map((g) => (
        <div key={g.code} className="gcard" onClick={() => open(g.code)}>
          <span className="ini">{g.recipientName[0]}</span>
          <div className="gc-m"><b>{g.recipientName}</b><small>{g.occasion} · {shortDate(g.createdAt)}</small><span className="gc-t"><TokenImg sym={NETWORKS[g.network].asset.symbol} /><ChainImg id={g.network} className="xs" /><small>{NETWORKS[g.network].name}</small></span></div>
          <div className="gc-r"><b className="num">{usd(g.amount)}</b><Status g={g} onReclaim={(x) => setReclaim([x])} /></div>
        </div>
      )) : (
        <div className="table">
          <div className="tr head"><span>Recipient</span><span>Amount</span><span>Asset · network</span><span>Status</span><span>Sent</span><span /></div>
          {sent.map((g) => (
            <div key={g.code} className="tr" onClick={() => open(g.code)}>
              <div className="who"><span className="ini">{g.recipientName[0]}</span><div><b>{g.recipientName}</b><small>{g.occasion}</small></div></div>
              <span className="num">{usd(g.amount)}</span>
              <div className="mix"><AssetCell network={g.network} /></div>
              <Status g={g} onReclaim={(x) => setReclaim([x])} />
              <span className="date">{shortDate(g.createdAt)}</span>
              <button type="button" className="icon-btn" title="Copy link" onClick={(e) => copyLink(e, g.code)}>{I.copy}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  /* ---------- drops ---------- */
  const drops = data?.drops ?? [];
  const dropsBody = drops.length === 0 ? (
    <div className="g-empty"><Mascot pose="happy" className="g-empty-m" /><p>No Drops yet. Pay a whole list with one Kite approval.</p><Link className="cta" href="/?tab=drop">New Drop</Link></div>
  ) : (
    <div className="v-card v-list">
      {drops.map((d) => {
        const left = d.status === "live" ? timeLeft(d.expiresAt) : null;
        const sub = d.status === "awaiting_payment" ? "Waiting for your Kite approval" : d.status === "payment_failed" ? "Payment didn't go through" : left ? `${d.claimedCount} of ${d.count} claimed · ${left}` : `${d.claimedCount} of ${d.count} claimed · window ended`;
        return (
          <Link key={d.id} className="v-li v-drow" href={`/drops/${d.id}`}>
            <span className="v-pi drop">{V.drop}</span>
            <div className="v-who">
              <b>{d.title}</b>
              <p><ChainImg id={d.network} className="xs" /> {NETWORKS[d.network].name} · {shortDate(d.createdAt)} · {sub}</p>
              {d.status === "live" && <div className="v-progress"><i style={{ width: `${d.count ? Math.round((d.claimedCount / d.count) * 100) : 0}%` }} /></div>}
            </div>
            <span className="am num">{usd(d.amount)}</span>
            {d.reclaimable ? <span className="v-st back">Take back {usd(d.openAmount)}</span> : <span className={`v-st ${d.status === "live" && d.claimedCount === d.count ? "ok" : "wait"}`}>{d.status === "live" ? (d.claimedCount === d.count ? "All claimed" : "Live") : d.status === "awaiting_payment" ? "Not paid yet" : "Not paid"}</span>}
          </Link>
        );
      })}
    </div>
  );

  /* ---------- received ---------- */
  const received = data?.received ?? [];
  const wallets = (
    <div className="wallet-row">
      <span className="lbl">Your wallets</span>
      {(data?.wallets ?? []).map((w) => (
        <span key={w.address} className="wchip num">{w.kind === "solana" ? <ChainImg id="solana" className="xs" /> : <ChainImg id="base" className="xs" />}{short(w.address)}<button title="Unlink" onClick={() => unlink(w.address)}>{I.x}</button></span>
      ))}
      <button className="btn sm sec" onClick={() => { setLinkError(""); setLinkOpen(true); }}>Link a wallet</button>
    </div>
  );
  const receivedBody = (
    <>
      {wallets}
      {received.length === 0 ? (
        <div className="g-empty">
          <Mascot pose="secret" className="g-empty-m" />
          <p>Gifts you claim while signed in, or on a linked wallet, show up here.</p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><span>Total received</span><b className="num">{usd(received.reduce((a, g) => a + Number(g.amount), 0))}</b></div>
            <div className="stat"><span>Gifts</span><b className="num">{received.length}</b></div>
            <div className="stat"><span>From</span><b className="num">{new Set(received.map((g) => g.senderName)).size} <small>people</small></b></div>
          </div>
          {m ? received.map((g) => (
            <div key={g.code} className="gcard" onClick={() => open(g.code)}>
              <span className="ini">{g.senderName[0]}</span>
              <div className="gc-m"><b>From {g.senderName}</b><small>{g.occasion} · {shortDate(g.claimedAt)}</small><span className="gc-t"><TokenImg sym={NETWORKS[g.network].asset.symbol} /><ChainImg id={g.network} className="xs" /><small>{NETWORKS[g.network].name}</small></span></div>
              <div className="gc-r"><b className="num">{usd(g.amount)}</b><span className="status done"><span className="d" />Claimed</span></div>
            </div>
          )) : (
            <div className="table recv">
              <div className="tr head"><span>From</span><span>Amount</span><span>Asset · network</span><span>Note</span><span>Claimed</span><span /></div>
              {received.map((g) => (
                <div key={g.code} className="tr" onClick={() => open(g.code)}>
                  <div className="who"><span className="ini">{g.senderName[0]}</span><div><b>{g.senderName}</b><small>{g.occasion}</small></div></div>
                  <span className="num">{usd(g.amount)}</span>
                  <div className="mix"><AssetCell network={g.network} /></div>
                  <span className="note-cell">“{g.note}”</span>
                  <span className="date">{shortDate(g.claimedAt)}</span>
                  {g.txUrl ? <a className="icon-btn" title="View transaction" href={g.txUrl} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{I.ext}</a> : <span />}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  let body: ReactNode = null;
  if (!kite.loading && !kite.connected) {
    body = (
      <div className="g-empty">
        <Mascot pose="wink" className="g-empty-m" />
        <p>Sign in with Kite Passport to see the gifts you’ve sent and received.</p>
        <button type="button" className="cta" onClick={() => setConnectOpen(true)}>Sign in with Kite Passport</button>
      </div>
    );
  } else if (kite.connected && data) {
    body = (
      <>
        {account}
        <div className="seg">
          <button className={tab === "sent" ? "on" : ""} onClick={() => setTab("sent")}>Gifts <small>{sent.length}</small></button>
          <button className={tab === "drops" ? "on" : ""} onClick={() => setTab("drops")}>Drops <small>{drops.length}</small></button>
          <button className={tab === "received" ? "on" : ""} onClick={() => setTab("received")}>Received <small>{received.length}</small></button>
          <button className={tab === "keys" ? "on" : ""} onClick={() => setTab("keys")}>API keys</button>
        </div>
        {tab === "sent" ? sentBody : tab === "drops" ? dropsBody : tab === "keys" ? <ApiKeys /> : receivedBody}
      </>
    );
  }

  return (
    <Screen glow={false}>
      <SiteNav active="dashboard" kite={kite} onConnect={() => setConnectOpen(true)} />
      {m ? (
        <div className="ph-body"><div className="wrap m-wrap">{body}</div></div>
      ) : (
        <main className="wrap">
          <div className="page-h"><h2>Dashboard</h2><span style={{ display: "flex", gap: 8 }}><Link className="btn sm sec" href="/?tab=drop">New Drop</Link><Link className="btn sm acc" href="/">New Gift</Link></span></div>
          {body}
        </main>
      )}
      {connectOpen && <KiteConnect onClose={() => setConnectOpen(false)} onConnected={onConnected} />}
      {funds === "add" && <AddFunds kite={kite} onClose={() => setFunds(null)} />}
      {reclaim && <Reclaim items={reclaim} onClose={() => setReclaim(null)} onDone={() => { load(); kite.refresh(); }} />}
      {funds === "withdraw" && <Withdraw kite={kite} onClose={() => setFunds(null)} />}
      {linkOpen && (
        <>
          <div className="sheet-scrim" onClick={() => setLinkOpen(false)} />
          <div className="sheet">
            <div className="grab" />
            <div className="m-h" style={{ marginBottom: 2 }}><span>Link a wallet</span><button className="x" onClick={() => setLinkOpen(false)}>{I.x}</button></div>
            <p className="sub">Sign a message to prove it’s yours. Gifts claimed to it will show up here.</p>
            <div className="wallets">
              {LINKABLE.map(({ key, network }) => (
                <button key={key} className={`wl ${linking === key ? "on" : ""}`} onClick={() => link(key, network)} disabled={!!linking}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className={`brand ${"pad" in WALLETS[key] ? "pad" : ""}`}><img src={WALLETS[key].icon} alt="" /></span>
                  {WALLETS[key].name}
                  <small>{linking === key ? "Check your wallet…" : network === "solana" ? "Solana" : "EVM networks"}</small>
                </button>
              ))}
            </div>
            {linkError && <p className="err-line">{linkError}</p>}
          </div>
        </>
      )}
    </Screen>
  );
}
