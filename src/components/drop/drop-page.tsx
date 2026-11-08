"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import type { GiftStatus } from "@/lib/types";
import { KiteConnect } from "../kite/kite-connect";
import { SiteNav } from "../site/site-nav";
import { V } from "../site/icons";
import { I } from "../ui/icons";
import { Brand, ChainImg, Mascot, usd } from "../ui/marks";
import { flash, Screen } from "../ui/screen";
import { timeLeft } from "../ui/time";
import { useKite } from "../use-kite";

interface View {
  id: string; title: string; occasion: string; network: NetworkId; status: "awaiting_payment" | "payment_failed" | "live"; createdAt: string;
  amount: string; fee: string; expiresAt?: string; error?: string; approvalUrl?: string; paymentTxUrl?: string;
  count: number; claimedCount: number; claimedAmount: string; openAmount: string; reclaimable: boolean; reclaimTo?: string; reclaimTxUrl?: string;
  recipients: { code: string; name: string; contact?: string; amount: string; note: string; status: GiftStatus; claimedAt?: string; txUrl?: string }[];
}

const STATUS: Partial<Record<GiftStatus, [string, string]>> = {
  sealed: ["Waiting", "wait"], claiming: ["Claiming", "wait"], claimed: ["Claimed", "ok"], reclaiming: ["Coming back", "back"], reclaimed: ["Taken back", "back"],
  awaiting_payment: ["Not paid yet", "wait"], payment_failed: ["Not paid", "back"],
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** One Drop: every person, their link and whether they've claimed. Only its sender can see it. */
export function DropPage({ id }: { id: string }) {
  const kite = useKite();
  const [view, setView] = useState<View | null>(null);
  const [missing, setMissing] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/drops/${id}`, { cache: "no-store" });
    if (r.status === 404) { setMissing(true); return null; }
    const d = (await r.json().catch(() => null)) as View | null;
    if (d) { setView(d); setMissing(false); }
    return d;
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of ?new=1 after creating the Drop
    setFresh(new URLSearchParams(window.location.search).has("new"));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once the Kite session is known
    if (kite.connected) load();
  }, [kite.connected, load]);

  // Still waiting for the passkey: keep checking the payment.
  useEffect(() => {
    if (view?.status !== "awaiting_payment") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/drops/${id}/payment`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (r && r.status !== "awaiting_payment") load();
    }, 3000);
    return () => clearInterval(t);
  }, [view?.status, id, load]);

  const link = (code: string) => `${window.location.origin}/g/${code}`;
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); flash(`${what} copied`); } catch { flash("Couldn't copy — check clipboard permissions"); }
  };
  function csv() {
    if (!view) return;
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [["name", "contact", "amount", "status", "link", "note"], ...view.recipients.map((r) => [r.name, r.contact ?? "", r.amount, STATUS[r.status]?.[0] ?? r.status, link(r.code), r.note])];
    const blob = new Blob([lines.map((l) => l.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${view.title.replace(/[^\w\- ]+/g, "").trim() || "drop"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function takeBack() {
    if (!view) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/drops/${id}/reclaim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "The transfer didn't go through");
      flash(d.status === "failed" ? "The transfer didn't go through. Try again." : `${usd(d.amount)} is on its way back`);
      await load();
      kite.refresh();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (kite.loading) body = <div className="v-card"><span className="skel" style={{ width: 240, height: 28 }} /></div>;
  else if (!kite.connected) body = (
    <div className="v-card v-empty"><Mascot pose="wink" /><p>Sign in with Kite Passport to see your Drop.</p><button className="v-cta" onClick={() => setConnectOpen(true)}><Brand k="kite" />Connect Kite</button></div>
  );
  else if (missing) body = <div className="v-card v-empty"><Mascot pose="secret" /><p>We couldn’t find this Drop on your account.</p><Link className="v-cta" href="/dashboard">Go to Dashboard</Link></div>;
  else if (!view) body = <div className="v-card"><span className="skel" style={{ width: 240, height: 28 }} /></div>;
  else {
    const net = NETWORKS[view.network];
    const left = timeLeft(view.expiresAt);
    const pct = view.count ? Math.round((view.claimedCount / view.count) * 100) : 0;
    const links = view.recipients.map((r) => `${r.name}${r.contact ? ` (${r.contact})` : ""} — ${link(r.code)}`).join("\n");
    body = (
      <>
        {fresh && view.status === "live" && (
          <div className="v-banner"><Mascot pose="claimed" /><div><b>Your Drop is live</b><p>Send each person their own link — by DM, email or however you reach them. Each link opens their gift and note.</p></div></div>
        )}
        <div className="v-card">
          <div className="v-dh">
            <span className="v-pi drop">{V.drop}</span>
            <div>
              <h1>{view.title}</h1>
              <p><ChainImg id={view.network} />{net.name} · {view.count} people · {view.status === "live" ? (left ? `claim within ${left.replace(" left", "")}` : "claim window ended") : view.status === "awaiting_payment" ? "waiting for your Kite approval" : "not paid"}</p>
            </div>
            <div className="v-dh-r"><b className="num">{usd(view.amount)}</b><small className="num">+ {usd(view.fee)} fee</small></div>
          </div>

          {view.status === "awaiting_payment" && (
            <div className="v-wait"><span className="spin" />Approve the transfer with your passkey on Kite — this page updates by itself.{view.approvalUrl && <a href={view.approvalUrl} target="kite-approve" rel="noopener">Open Kite Passport {I.ext}</a>}</div>
          )}
          {view.status === "payment_failed" && <p className="err-line" style={{ textAlign: "left" }}>The payment didn’t go through{view.error ? ` (${view.error})` : ""}. Nothing was sent; start a new Drop to try again.</p>}

          {view.status === "live" && (
            <>
              <div className="v-stats">
                <div><small>Claimed</small><b className="num">{view.claimedCount} / {view.count}</b><span className="num">{usd(view.claimedAmount)}</span></div>
                <div><small>Waiting</small><b className="num">{usd(view.openAmount)}</b><span>{left ? left : "can be taken back"}</span></div>
                <div><small>Paid with Kite</small><b className="num">{usd(Number(view.amount) + Number(view.fee))}</b>{view.paymentTxUrl ? <a href={view.paymentTxUrl} target="_blank" rel="noopener">View transaction {I.ext}</a> : <span>—</span>}</div>
              </div>
              <div className="v-progress"><i style={{ width: `${pct}%` }} /></div>
              <div className="v-actions">
                <button className="v-btn" onClick={() => copy(links, "All links")}>{I.copy}Copy all links</button>
                <button className="v-btn" onClick={csv}>Download CSV</button>
                {view.reclaimable && (
                  <button className="v-btn warn" disabled={busy} onClick={takeBack}>
                    {busy ? <span className="spin" /> : null}Take back {usd(view.openAmount)}{view.reclaimTo ? ` to ${short(view.reclaimTo)}` : ""}
                  </button>
                )}
                {view.reclaimTxUrl && <a className="v-btn" href={view.reclaimTxUrl} target="_blank" rel="noopener">Take-back transaction {I.ext}</a>}
              </div>
            </>
          )}
        </div>

        <div className="v-card v-list">
          {view.recipients.map((r) => {
            const [label, tone] = STATUS[r.status] ?? [r.status, "wait"];
            return (
              <div className="v-li" key={r.code}>
                <span className="av">{r.name.trim()[0]?.toUpperCase()}</span>
                <div className="v-who"><b>{r.name}</b>{r.contact && <small>{r.contact}</small>}<p>“{r.note}”</p></div>
                <span className="am num">{usd(r.amount)}</span>
                <span className={`v-st ${tone}`}>{label}</span>
                {r.txUrl
                  ? <a className="v-mini" href={r.txUrl} target="_blank" rel="noopener" title="View claim">{I.ext}</a>
                  : <button className="v-mini" title="Copy link" disabled={view.status !== "live"} onClick={() => copy(link(r.code), `${r.name}'s link`)}>{I.copy}</button>}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <Screen glow={false}>
      <SiteNav kite={kite} onConnect={() => setConnectOpen(true)} />
      <main className="v-page">
        <Link className="v-back" href="/dashboard">{I.back}Dashboard</Link>
        {body}
      </main>
      {connectOpen && <KiteConnect onClose={() => setConnectOpen(false)} onConnected={() => { setConnectOpen(false); kite.refresh(); }} />}
    </Screen>
  );
}
