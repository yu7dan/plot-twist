"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isNetworkId, NETWORKS, type NetworkId } from "@/lib/chains";
import { DROP_EACH_MAX, DROP_EACH_MIN, DROP_MAX_TOTAL, dropTotals } from "@/lib/pricing";
import { EXPIRY_OPTIONS, type ExpiryHours } from "@/lib/types";
import { NetworkMenu } from "../create/overlays";
import { AddFunds } from "../kite/add-funds";
import { I } from "../ui/icons";
import { Brand, ChainImg, Mascot, TokenImg, usd } from "../ui/marks";
import { EXPIRY_LABEL } from "../ui/time";
import type { Kite } from "../use-kite";

const EXAMPLE = "Thank our top 5 contributors this month — alice.eth 40 (rewrote the docs), bob 25 (three bug fixes), chen_dev 25 (first PR), mira 25 (helped newcomers), sam.sol 15 (the thread that brought 200 members).";
const SHOWN = 4;

interface Row { name: string; contact: string; amountStr: string; note: string }
interface Design { title: string; occasion: string; network: NetworkId; recipients: Row[] }
type Phase = "empty" | "building" | "filled";

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d as T;
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const atScreen = (node: ReactNode) => createPortal(node, document.querySelector(".screen.app") ?? document.body);

/** The Drop tab: paste a list or describe it → SERV builds the table → one Kite approval pays everyone. */
export function DropPanel({ kite, onConnect }: { kite: Kite; onConnect: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("empty");
  const [brief, setBrief] = useState("");
  const [d, setD] = useState<Design>({ title: "", occasion: "", network: "base", recipients: [] });
  const [expiresIn, setExpiresIn] = useState<ExpiryHours>(168);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  const [noteAt, setNoteAt] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [topUp, setTopUp] = useState(false);
  const [modal, setModal] = useState<null | "review" | "approve">(null);
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [created, setCreated] = useState<{ id: string; approvalUrl: string } | null>(null);
  const [failed, setFailed] = useState("");

  const net = NETWORKS[d.network];
  const sym = net.asset.symbol;
  const amounts = d.recipients.map((r) => Number(r.amountStr) || 0);
  const t = dropTotals(amounts, d.network);
  const filled = phase === "filled";
  const ready = brief.trim().length >= 8;

  async function build() {
    setPhase("building"); setError(""); setAll(false); setNoteAt(null);
    try {
      const r = await post<{ title: string; occasion: string; network: string; recipients: { name: string; contact: string; amount: string; note: string }[] }>("/api/drops/design", { brief });
      setD({
        title: r.title, occasion: r.occasion, network: isNetworkId(r.network) ? r.network : "base",
        recipients: r.recipients.map((x) => ({ name: x.name, contact: x.contact, amountStr: String(Number(x.amount)), note: x.note })),
      });
      setPhase("filled");
    } catch (e) {
      setPhase("empty");
      setError(e instanceof Error ? e.message : "SERV couldn't build this one");
    }
  }

  const patch = (i: number, p: Partial<Row>) => setD((x) => ({ ...x, recipients: x.recipients.map((r, j) => (j === i ? { ...r, ...p } : r)) }));
  const remove = (i: number) => setD((x) => ({ ...x, recipients: x.recipients.filter((_, j) => j !== i) }));

  const bad = d.recipients.find((r) => !r.name.trim() || !(Number(r.amountStr) >= DROP_EACH_MIN && Number(r.amountStr) <= DROP_EACH_MAX) || !r.note.trim());
  const balance = kite.balances[d.network] ?? 0;

  let cta;
  if (phase === "empty") cta = ready
    ? <button className="v-cta" onClick={build}>{I.spark}Build the Drop</button>
    : <button className="v-cta soft" onClick={() => setBrief(EXAMPLE)}>{I.spark}Try an example</button>;
  else if (phase === "building") cta = <button className="v-cta off" disabled><span className="spin" />SERV is writing everyone’s note</button>;
  else if (!d.recipients.length) cta = <button className="v-cta off" disabled>Add at least one person</button>;
  else if (bad) cta = <button className="v-cta off" disabled>Each person needs {usd(DROP_EACH_MIN)}–{usd(DROP_EACH_MAX)} and a note</button>;
  else if (t.sum > DROP_MAX_TOTAL) cta = <button className="v-cta off" disabled>A Drop can send up to {usd(DROP_MAX_TOTAL)}</button>;
  else if (!kite.connected) cta = <button className="v-cta" onClick={onConnect}><Brand k="kite" />Connect Kite to send</button>;
  else if (balance + 1e-9 < t.total) cta = <button className="v-cta warn" onClick={() => setTopUp(true)}>Add {(Math.ceil((t.total - balance) * 100) / 100).toFixed(2)} {sym} to Kite to continue</button>;
  else cta = <button className="v-cta" onClick={() => { setReviewError(""); setModal("review"); }}><Brand k="kite" />Approve {usd(t.total)} with Kite</button>;

  async function approve() {
    const tab = window.open("", "kite-approve");
    setBusy(true); setReviewError("");
    try {
      const r = await post<{ id: string; approvalUrl: string }>("/api/drops", {
        prompt: brief, title: d.title, occasion: d.occasion, network: d.network, expiresInHours: expiresIn,
        recipients: d.recipients.map((x) => ({ name: x.name, contact: x.contact || undefined, amount: Number(x.amountStr), note: x.note })),
      });
      setCreated(r); setFailed("");
      if (tab) tab.location.href = r.approvalUrl;
      setModal("approve");
    } catch (e) {
      tab?.close();
      setReviewError(e instanceof Error ? e.message : "Couldn't start the transfer");
    } finally {
      setBusy(false);
    }
  }

  // Poll the payment while the sender approves on Kite; once it lands, open the Drop's page.
  useEffect(() => {
    if (modal !== "approve" || !created || failed) return;
    let stop = false;
    (async () => {
      while (!stop) {
        await wait(2500);
        if (stop) return;
        const r = await fetch(`/api/drops/${created.id}/payment`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
        if (stop || !r) continue;
        if (r.status === "payment_failed") { setFailed(r.error ? `Kite: ${r.error}` : "The transfer didn't go through."); return; }
        if (r.status === "live") { kite.refresh(); router.push(`/drops/${created.id}?new=1`); return; }
      }
    })();
    return () => { stop = true; };
  }, [modal, created, failed, kite, router]);

  const rows = all ? d.recipients : d.recipients.slice(0, SHOWN);

  return (
    <div className="v-drop">
      <div className="v-mod" onClick={() => filled && noteAt === null && setPhase("empty")}>
        <div className="v-lbl">
          <span>Who’s getting paid?</span>
          {filled ? <span className="v-serv">{I.spark}Table by SERV</span> : phase === "building" ? <span className="v-serv muted"><Mascot />Building</span> : <span className="v-serv">{I.spark}SERV builds the table</span>}
        </div>
        {phase === "empty" ? (
          <>
            <textarea className="v-prompt" rows={2} maxLength={8000} placeholder="Paste a list (name, amount) or describe it" value={brief} onChange={(e) => setBrief(e.target.value)} />
            {!brief && <div className="v-chips"><button className="v-chip" onClick={() => setBrief(EXAMPLE)}>{I.spark}Try an example</button><span className="v-chip">CSV: name, amount, contact</span></div>}
          </>
        ) : <p className="v-prompt-text v-clamp" title="Edit the list">{brief}</p>}
      </div>

      <div className={`v-link${phase === "building" ? " busy" : ""}`}><span>{I.spark}</span></div>

      <div className="v-mod out">
        <div className="v-lbl">
          <span>{filled ? <><input className="v-title-in" value={d.title} maxLength={60} onChange={(e) => setD((x) => ({ ...x, title: e.target.value }))} /> · {d.recipients.length} {d.recipients.length === 1 ? "person" : "people"}</> : "Everyone gets a link and a note"}</span>
          {!filled && <span className="v-chip">Up to 200 people</span>}
        </div>
        <div className="v-split">
          <div>
            {filled ? <div className="v-big num">{usd(t.sum)}</div> : phase === "building" ? <div className="v-big"><span className="skel" style={{ width: 150, height: 34 }} /></div> : <div className="v-big ph num">$0</div>}
            <div className="v-sub num">{kite.connected ? <>Kite balance {balance.toFixed(2)} {sym}</> : <>{sym} on {net.name}</>}</div>
          </div>
          <button className="v-tok" onClick={() => setMenu(true)} title="Change network"><span className="net"><TokenImg sym={sym} /><ChainImg id={d.network} /></span>{sym}{I.chev}</button>
        </div>
        {filled && (
          <div className="v-rows">
            {rows.map((r, i) => (
              <div className="v-rw" key={i}>
                <span className="av">{r.name.trim()[0]?.toUpperCase() ?? "?"}</span>
                <span className="v-who">
                  <span><span className="nm">{r.name}</span>{r.contact && <span className="ct"> {r.contact}</span>}</span>
                  {noteAt === i
                    ? <textarea autoFocus rows={2} maxLength={160} value={r.note} onChange={(e) => patch(i, { note: e.target.value })} onBlur={() => setNoteAt(null)} />
                    : <span className="nt" title="Edit the note" onClick={() => setNoteAt(i)}>“{r.note}”</span>}
                </span>
                <label className="am num">$<input inputMode="decimal" value={r.amountStr} onChange={(e) => patch(i, { amountStr: e.target.value.replace(/[^0-9.]/g, "").slice(0, 6) })} /></label>
                <button className="rm" title="Remove" onClick={() => remove(i)}>{I.x}</button>
              </div>
            ))}
            {d.recipients.length > SHOWN && <button className="v-rw more" onClick={() => setAll((v) => !v)}>{all ? "Show less" : `+ ${d.recipients.length - SHOWN} more · review every note`}</button>}
          </div>
        )}
        {phase === "building" && <div className="v-rows">{[0, 1, 2].map((i) => <div className="v-rw" key={i}><span className="av" /><span className="skel" style={{ width: 220 }} /></div>)}</div>}
      </div>

      <div className="v-meta">
        <span className="num">{filled ? <>You pay <b>{usd(t.total)}</b> · fee {usd(t.fee)}</> : <>Fee 1% per person · gas covered</>}</span>
        <span className="v-exp"><span>Claim within</span>{EXPIRY_OPTIONS.map((h) => <button key={h} className={expiresIn === h ? "on" : ""} onClick={() => setExpiresIn(h)}>{EXPIRY_LABEL[h].short}</button>)}</span>
      </div>
      {cta}
      {error && <p className="err-line">{error}</p>}

      {menu && atScreen(<NetworkMenu centered selected={d.network} amount={0} kite={kite} onPick={(id) => { setD((x) => ({ ...x, network: id })); setMenu(false); }} onClose={() => setMenu(false)} />)}
      {topUp && atScreen(<AddFunds kite={kite} gift={{ network: d.network, amount: t.total }} onClose={() => setTopUp(false)} onFunded={() => setTopUp(false)} />)}
      {modal === "review" && atScreen(
        <div className="scrim" onClick={(e) => !busy && e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="m-h"><span>Review Drop</span><button className="x" onClick={() => setModal(null)} disabled={busy}>{I.x}</button></div>
            <div className="lbl">You send</div>
            <div className="amt-lg num">{usd(t.total)}</div>
            <div className="sub">{usd(t.sum)} to {d.recipients.length} people + {usd(t.fee)} fee · {sym} from your Kite wallet</div>
            <div className="kv"><span>Drop</span><b>{d.title}</b></div>
            <div className="kv"><span>Lands on</span><b><ChainImg id={d.network} />{net.name}</b></div>
            <div className="kv"><span>Pay with</span><b><Brand k="kite" />Kite Passport · one approval</b></div>
            <div className="kv"><span>Network fees</span><b>Covered</b></div>
            <div className="kv"><span>If unclaimed</span><b>Take it back after {EXPIRY_LABEL[expiresIn].long}</b></div>
            <button className="cta" onClick={approve} disabled={busy}>{busy ? <><span className="spin" />Preparing transfer</> : "Approve with passkey"}</button>
            {reviewError && <p className="err-line">{reviewError}</p>}
            <p className="fine">One passkey approval pays for every link. Each person gets their own link and note.</p>
          </div>
        </div>,
      )}
      {modal === "approve" && created && atScreen(
        <div className="scrim">
          <div className="kite">
            <div className="kite-h">
              <span className="kite-id"><Brand k="kite" /><span>Kite Passport<small>agentpassport.ai</small></span></span>
              <button className="x kx" onClick={() => setModal(null)} aria-label="Close">{I.x}</button>
            </div>
            <h4>Approve transfer</h4>
            <p className="req">Approve it with your passkey on Kite Passport. This page updates by itself.</p>
            <div className="kite-amt num">{t.total.toFixed(2)}<small>{sym}</small></div>
            <div className="kite-box">
              <div className="kv"><span>Network</span><b><ChainImg id={d.network} />{net.name}</b></div>
              <div className="kv"><span>To</span><b>Plot Twist</b></div>
              <div className="kv"><span>For</span><b>{d.title} · {d.recipients.length} people</b></div>
            </div>
            {failed ? (
              <><p className="err-line">{failed}</p><button className="cta" onClick={() => { setCreated(null); setFailed(""); setModal("review"); }}>Try again</button></>
            ) : (
              <><a className="cta" href={created.approvalUrl} target="kite-approve" rel="noopener">Open Kite Passport{I.ext}</a><div className="kite-wait"><span className="spin" />Waiting for your passkey…</div></>
            )}
            <p className="fine">Kite sends exactly this amount to Plot Twist — nothing else.</p>
          </div>
        </div>,
      )}
    </div>
  );
}
