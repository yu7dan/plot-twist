"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import { dropTotals, feeFor, totalFor } from "@/lib/pricing";
import { KiteConnect } from "../kite/kite-connect";
import { V } from "../site/icons";
import { SiteNav } from "../site/site-nav";
import { I } from "../ui/icons";
import { Brand, ChainImg, Mascot, usd } from "../ui/marks";
import { flash, Screen } from "../ui/screen";
import { EXPIRY_LABEL } from "../ui/time";
import { useKite } from "../use-kite";
import type { ExpiryHours } from "@/lib/types";

interface Req {
  id: string; kind: "gift" | "drop"; status: string; createdAt: string; expiresInHours: ExpiryHours; approvalUrl?: string;
  gift?: { recipientName: string; occasion: string; amount: string; network: NetworkId; note: string };
  link?: string;
  drop?: { title: string; network: NetworkId; count: number; amount: string; recipients: { name: string; contact?: string; amount: number; note: string }[] };
  dropId?: string;
}

/** An agent prepared this; its owner reviews it and approves the payment with their Kite passkey. */
export function ApprovePage({ id }: { id: string }) {
  const kite = useKite();
  const [req, setReq] = useState<Req | null>(null);
  const [error, setError] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/approve/${id}`, { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Request not found"); return; }
    setReq(d); setError("");
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once the Kite session is known
    if (kite.connected) load();
  }, [kite.connected, load]);

  // While the payment waits for the passkey, keep checking.
  useEffect(() => {
    if (req?.status !== "awaiting_payment") return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [req?.status, load]);

  async function approve() {
    const tab = window.open("", "kite-approve");
    setBusy(true);
    try {
      const r = await fetch(`/api/approve/${id}`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't start the payment");
      if (tab) tab.location.href = d.approvalUrl;
      await load();
    } catch (e) {
      tab?.close();
      flash(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (kite.loading) body = <div className="v-card"><span className="skel" style={{ width: 240, height: 28 }} /></div>;
  else if (!kite.connected) body = <div className="v-card v-empty"><Mascot pose="wink" /><p>Your agent prepared a payment. Sign in with Kite Passport to review it.</p><button className="v-cta" onClick={() => setConnectOpen(true)}><Brand k="kite" />Connect Kite</button></div>;
  else if (error) body = <div className="v-card v-empty"><Mascot pose="secret" /><p>{error}</p><Link className="v-cta" href="/dashboard">Go to Dashboard</Link></div>;
  else if (!req) body = <div className="v-card"><span className="skel" style={{ width: 240, height: 28 }} /></div>;
  else {
    const network = (req.gift?.network ?? req.drop?.network)!;
    const net = NETWORKS[network];
    const total = req.gift ? totalFor(Number(req.gift.amount), network) : dropTotals(req.drop!.recipients.map((r) => r.amount), network).total;
    const fee = req.gift ? feeFor(Number(req.gift.amount), network) : dropTotals(req.drop!.recipients.map((r) => r.amount), network).fee;
    const pending = req.status === "pending_approval";
    const live = req.status === "live" || req.status === "claimed" || req.status === "claiming";

    body = (
      <>
        <div className="v-banner"><Mascot pose={live ? "claimed" : "sparkle"} /><div><b>{live ? "Approved and paid" : pending ? "Your agent prepared this" : req.status === "awaiting_payment" ? "Waiting for your passkey" : "This one didn’t go through"}</b><p>{live ? "The link is ready — your agent can pick it up from the API too." : pending ? "Nothing has been paid. Review it, then approve the exact total with your Kite passkey." : req.status === "awaiting_payment" ? "Approve the transfer on Kite Passport. This page updates by itself." : "Nothing was sent. Ask your agent to prepare it again."}</p></div></div>
        <div className="v-card">
          <div className="v-dh">
            <span className={`v-pi ${req.kind === "gift" ? "gift" : "drop"}`}>{req.kind === "gift" ? V.gift : V.drop}</span>
            <div>
              <h1>{req.gift ? `Gift for ${req.gift.recipientName}` : req.drop!.title}</h1>
              <p><ChainImg id={network} />{net.name} · {req.gift ? req.gift.occasion : `${req.drop!.count} people`} · claim within {EXPIRY_LABEL[req.expiresInHours].long}</p>
            </div>
            <div className="v-dh-r"><b className="num">{usd(total)}</b><small className="num">incl. {usd(fee)} fee</small></div>
          </div>
          {req.gift && <div className="v-note" style={{ cursor: "default" }}><p>“{req.gift.note}”</p></div>}
          {req.drop && (
            <div className="v-rows" style={{ marginTop: 14 }}>
              {req.drop.recipients.map((r, i) => (
                <div className="v-rw" key={i}>
                  <span className="av">{r.name[0]?.toUpperCase()}</span>
                  <span className="v-who"><span><span className="nm">{r.name}</span>{r.contact && <span className="ct"> {r.contact}</span>}</span><span className="nt">“{r.note}”</span></span>
                  <span className="am num">{usd(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            {pending && <button className="v-cta" disabled={busy} onClick={approve}>{busy ? <span className="spin" /> : <Brand k="kite" />}Approve {usd(total)} with Kite</button>}
            {req.status === "awaiting_payment" && (
              <div className="v-wait"><span className="spin" />Waiting for your passkey on Kite…{req.approvalUrl && <a href={req.approvalUrl} target="kite-approve" rel="noopener">Open Kite Passport {I.ext}</a>}</div>
            )}
            {live && req.link && (
              <div className="v-actions" style={{ marginTop: 0 }}>
                <button className="v-btn" onClick={() => navigator.clipboard.writeText(req.link!).then(() => flash("Link copied"))}>{I.copy}Copy the link</button>
                <a className="v-btn" href={req.link} target="_blank" rel="noopener">Open the gift {I.ext}</a>
              </div>
            )}
            {live && req.dropId && <Link className="v-cta" href={`/drops/${req.dropId}?new=1`}>Open the Drop</Link>}
          </div>
          <p className="v-fine" style={{ textAlign: "center" }}>Prepared by your agent with an API key {new Date(req.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Keys can prepare payments, never send them.</p>
        </div>
      </>
    );
  }

  return (
    <Screen glow={false}>
      <SiteNav kite={kite} onConnect={() => setConnectOpen(true)} />
      <main className="v-page">{body}</main>
      {connectOpen && <KiteConnect onClose={() => setConnectOpen(false)} onConnected={() => { setConnectOpen(false); kite.refresh(); }} />}
    </Screen>
  );
}
