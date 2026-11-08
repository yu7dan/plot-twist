"use client";

import { NETWORKS, type NetworkId } from "@/lib/chains";
import { feeFor, GIFT_MAX, GIFT_MIN, totalFor } from "@/lib/pricing";
import { I } from "../ui/icons";
import { Brand, ChainImg, Mascot, TokenImg, usd } from "../ui/marks";
import { EXPIRY_OPTIONS, type ExpiryHours } from "@/lib/types";
import { EXPIRY_LABEL } from "../ui/time";
import type { KiteState } from "../use-kite";

export const EXAMPLE_PROMPT = "Birthday gift for my sister Maya, around $50 — she just moved to Berlin.";

export interface Draft {
  recipientName: string;
  occasion: string;
  amountStr: string;
  network: NetworkId;
  note: string;
  insight: string;
  expiresIn: ExpiryHours;
}

export type Phase = "empty" | "generating" | "filled";
/** The fields SERV fills that the sender can correct inline. */
export type EditField = "recipientName" | "occasion" | "note";
const MAX: Record<EditField, number> = { recipientName: 40, occasion: 40, note: 160 };

interface Props {
  phase: Phase;
  prompt: string;
  draft: Draft;
  animate: boolean;
  kite: KiteState;
  editing: EditField | null;
  noteBusy: boolean;
  error: string;
  onPrompt: (v: string) => void;
  onEditPrompt: () => void;
  onDesign: () => void;
  onDraft: (patch: Partial<Draft>) => void;
  onEdit: (f: EditField | null) => void;
  onRewrite: () => void;
  onMax: () => void;
  onNetwork: () => void;
  onConnect: () => void;
  onTopUp: () => void;
  onCreate: () => void;
}

export const canPay = (kite: KiteState, network: NetworkId, amount: number) => (kite.balances[network] ?? 0) + 1e-9 >= totalFor(amount, network);

export function CreateCard(p: Props) {
  const { phase, draft: g, kite } = p;
  const filled = phase === "filled";
  const gen = phase === "generating";
  const fi = filled && p.animate ? " fill-in" : "";
  const net = NETWORKS[g.network];
  const asset = net.asset;
  const amount = Number(g.amountStr) || 0;
  const skel = (w: number) => <span className="skel" style={{ width: w }} />;
  const ready = p.prompt.trim().length >= 8;

  /** One list row: SERV's value, editable in place once the gift is designed. */
  const row = (field: EditField, label: string, w: number, placeholder: string, show = (v: string) => v) => {
    const v = g[field];
    const done = () => v.trim() && p.onEdit(null);
    return (
      <div className={`li${field === "note" ? " note" : ""}`}>
        <span>{label}</span>
        {filled && p.editing === field ? (
          <input className="note-in" autoFocus maxLength={MAX[field]} value={v} onChange={(e) => p.onDraft({ [field]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && done()} onBlur={done} />
        ) : filled ? <b className={`${fi.trim()} editable`} onClick={() => p.onEdit(field)}>{show(v)}</b> : gen ? <b>{skel(w)}</b> : <b className="ph">{placeholder}</b>}
        {filled ? (
          p.editing === field
            ? <button className="note-ok" onMouseDown={(e) => e.preventDefault()} onClick={done}>{I.checkSm}</button>
            : <button className="note-edit" onClick={() => p.onEdit(field)}>{I.edit}</button>
        ) : field === "note" ? I.edit : null}
      </div>
    );
  };

  let cta;
  if (phase === "empty") cta = ready
    ? <button className="cta" onClick={p.onDesign}>{I.spark}Design gift</button>
    : <button className="cta off" disabled>Describe your gift</button>;
  else if (gen) cta = <button className="cta off" disabled><span className="spin" />Designing your gift</button>;
  else if (amount < GIFT_MIN) cta = <button className="cta off" disabled>Minimum gift is ${GIFT_MIN}</button>;
  else if (amount > GIFT_MAX) cta = <button className="cta off" disabled>Maximum gift is ${GIFT_MAX}</button>;
  else if (!kite.connected) cta = <button className="cta" onClick={p.onConnect}><Brand k="kite" />Connect Kite Passport</button>;
  else if (!canPay(kite, g.network, amount)) {
    const short = Math.ceil((totalFor(amount, g.network) - (kite.balances[g.network] ?? 0)) * 100) / 100;
    cta = <button className="cta warn" onClick={p.onTopUp}>Add {short.toFixed(2)} {asset.symbol} to Kite to continue</button>;
  }
  else cta = <button className="cta" onClick={p.onCreate}>Create gift</button>;

  return (
    <div className="card">
      <div className="mod prompt" onClick={() => filled && p.onEditPrompt()}>
        <div className="mod-h">
          <span className="lbl">{I.spark}Describe the gift</span>
          {filled ? (
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className={`tag${fi}`}>{I.spark}Designed by SERV</span>
              <button className="mini icon" title="Rewrite note" disabled={p.noteBusy} onClick={(e) => { e.stopPropagation(); p.onRewrite(); }}>
                {p.noteBusy ? <span className="spin" style={{ width: 12, height: 12 }} /> : I.refresh}
              </button>
            </span>
          ) : gen ? <span className="lbl" style={{ color: "var(--muted)" }}><Mascot className="bob" />Designing</span> : null}
        </div>
        {phase === "empty" ? (
          <>
            <textarea
              className="prompt-input"
              rows={2}
              autoFocus
              maxLength={400}
              placeholder="Who’s it for, what’s the occasion, how much?"
              value={p.prompt}
              onChange={(e) => p.onPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (ready) p.onDesign(); }
              }}
            />
            {!p.prompt && <button className="ex" onClick={() => p.onPrompt(EXAMPLE_PROMPT)}>{I.spark}Try an example</button>}
          </>
        ) : <p className="prompt-text">{p.prompt}</p>}
      </div>

      <div className="mod">
        <div className="lbl">You send</div>
        <div className="row-amt">
          {filled ? (
            <label className={`amt-wrap${fi}`}>
              <span className="amt num">$</span>
              <input className="amt num amt-in" inputMode="decimal" value={g.amountStr} onChange={(e) => p.onDraft({ amountStr: e.target.value.replace(/[^0-9.]/g, "").slice(0, 7) })} />
            </label>
          ) : gen ? skel(120) : <span className="amt num ph">$0</span>}
          <span className="token"><TokenImg sym={asset.symbol} />{asset.symbol}</span>
        </div>
        <div className="row-sub">
          {kite.connected ? (
            <>
              <span className="num">from Kite · {net.name}</span>
              <span className="num">Balance {(kite.balances[g.network] ?? 0).toFixed(2)}{filled && <b className="max" onClick={p.onMax}>Max</b>}</span>
            </>
          ) : (
            <>
              <span className="num">from Kite Passport</span>
              <b className="max" onClick={p.onConnect}>Connect to see balance</b>
            </>
          )}
        </div>
      </div>

      <div className="swap-arrow"><div>{I.down}</div></div>

      <div className="mod">
        <div className="mod-h"><span className="lbl">{filled ? `${g.recipientName} receives` : "They receive"}</span><span className="tag ghost">Gas covered</span></div>
        <div style={{ marginTop: 8 }}>
          {filled ? (
            <>
              <div className={`rcv${fi}`}>
                <TokenImg sym={asset.symbol} />
                <div className="meta"><b className="num">{amount.toFixed(2)} {asset.symbol}</b><span>{asset.name} · 1 {asset.symbol} ≈ $1</span></div>
                <button className="chain-sel" onClick={p.onNetwork}><ChainImg id={g.network} /><span>{net.name}</span>{I.chev}</button>
              </div>
              {net.isNew && <div className="hint-line">{I.lock}{net.name} is a newer network — {g.recipientName}’s wallet may ask to add it once.</div>}
              {g.insight && <div className={`insight${fi}`}>{I.spark}<span>{g.insight}</span></div>}
            </>
          ) : (
            <div className="rcv">
              <TokenImg sym={asset.symbol} />
              <div className="meta">{gen ? skel(140) : <b className="num" style={{ color: "var(--dim)" }}>0.00 {asset.symbol}</b>}</div>
              <span className="chain-sel ro"><ChainImg id={g.network} /><span>{net.name}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="mod list">
        {row("recipientName", "To", 60, "—")}
        {row("occasion", "Occasion", 80, "—")}
        {row("note", "Note", 200, "Written by AI, or type your own", (v) => `“${v}”`)}
        <div className="li exp">
          <span>Claim within</span>
          <span className="exp-opts">
            {EXPIRY_OPTIONS.map((h) => (
              <button key={h} className={g.expiresIn === h ? "on" : ""} onClick={() => p.onDraft({ expiresIn: h })}>{EXPIRY_LABEL[h].short}</button>
            ))}
          </span>
        </div>
      </div>

      <div className="details">
        <span>Total <b className="num">{filled ? usd(totalFor(amount, g.network)) : "—"}</b></span>
        <span className="r">Fee {filled ? usd(feeFor(amount, g.network)) : "1.5%"} · paid with Kite</span>
      </div>
      {cta}
      {p.error && <p className="err-line">{p.error}</p>}
    </div>
  );
}
