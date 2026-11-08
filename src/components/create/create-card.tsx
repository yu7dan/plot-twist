"use client";

import { NETWORKS, type NetworkId } from "@/lib/chains";
import { feeFor, GIFT_MAX, GIFT_MIN, totalFor } from "@/lib/pricing";
import { I } from "../ui/icons";
import { Brand, ChainImg, Mascot, TokenImg, usd } from "../ui/marks";
import { EXPIRY_OPTIONS, type ExpiryHours } from "@/lib/types";
import { EXPIRY_LABEL } from "../ui/time";
import type { KiteState } from "../use-kite";

export const EXAMPLE_PROMPT = "Birthday gift for my sister Maya, around $50 — she just moved to Berlin.";
const QUICK = [["Birthday", "Birthday gift for my sister Maya, around $50 — she just moved to Berlin."], ["Red packet 红包", "Lunar New Year red packet for my nephew Leo, $28 for luck."], ["Thank you", "Thank-you gift for my mentor Sam, $40 — he helped me land my first job."]] as const;

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

/** The Gift panel: describe it → SERV designs it → what they receive → send with Kite. */
export function CreateCard(p: Props) {
  const { phase, draft: g, kite } = p;
  const filled = phase === "filled";
  const gen = phase === "generating";
  const fi = filled && p.animate ? " fill-in" : "";
  const net = NETWORKS[g.network];
  const asset = net.asset;
  const amount = Number(g.amountStr) || 0;
  const skel = (w: number, h?: number) => <span className="skel" style={{ width: w, height: h }} />;
  const ready = p.prompt.trim().length >= 8;

  /** A value SERV filled in, editable in place. */
  const editable = (field: EditField, className: string, show = (v: string) => v) => {
    const v = g[field];
    const done = () => v.trim() && p.onEdit(null);
    if (p.editing === field)
      return field === "note"
        ? <textarea autoFocus rows={2} maxLength={MAX.note} value={v} onChange={(e) => p.onDraft({ note: e.target.value })} onBlur={done} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), done())} />
        : <span className={className}><input autoFocus maxLength={MAX[field]} value={v} onChange={(e) => p.onDraft({ [field]: e.target.value })} onBlur={done} onKeyDown={(e) => e.key === "Enter" && done()} /></span>;
    return field === "note"
      ? <p className={fi.trim()} onClick={() => p.onEdit(field)}>{show(v)}</p>
      : <span className={`${className}${fi}`} title="Edit" onClick={() => p.onEdit(field)}>{show(v)}</span>;
  };

  let cta;
  if (phase === "empty") cta = ready
    ? <button className="v-cta" onClick={p.onDesign}>{I.spark}Design gift</button>
    : <button className="v-cta soft" onClick={() => p.onPrompt(EXAMPLE_PROMPT)}>{I.spark}Try an example</button>;
  else if (gen) cta = <button className="v-cta off" disabled><span className="spin" />SERV is designing your gift</button>;
  else if (amount < GIFT_MIN) cta = <button className="v-cta off" disabled>Minimum gift is ${GIFT_MIN}</button>;
  else if (amount > GIFT_MAX) cta = <button className="v-cta off" disabled>Maximum gift is ${GIFT_MAX}</button>;
  else if (!kite.connected) cta = <button className="v-cta" onClick={p.onConnect}><Brand k="kite" />Connect Kite to send</button>;
  else if (!canPay(kite, g.network, amount)) {
    const short = Math.ceil((totalFor(amount, g.network) - (kite.balances[g.network] ?? 0)) * 100) / 100;
    cta = <button className="v-cta warn" onClick={p.onTopUp}>Add {short.toFixed(2)} {asset.symbol} to Kite to continue</button>;
  }
  else cta = <button className="v-cta" onClick={p.onCreate}><Brand k="kite" />Send with Kite</button>;

  return (
    <div className="v-gift">
      <div className="v-mod" onClick={() => filled && !p.editing && p.onEditPrompt()}>
        <div className="v-lbl">
          <span>Describe the gift</span>
          {filled ? (
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`v-serv${fi}`}>{I.spark}Designed by SERV</span>
              <button className="v-mini" title="Rewrite the note" disabled={p.noteBusy} onClick={(e) => { e.stopPropagation(); p.onRewrite(); }}>
                {p.noteBusy ? <span className="spin" style={{ width: 12, height: 12 }} /> : I.refresh}
              </button>
            </span>
          ) : gen ? <span className="v-serv muted"><Mascot />Designing</span> : null}
        </div>
        {phase === "empty" ? (
          <>
            <textarea
              className="v-prompt"
              rows={2}
              maxLength={400}
              placeholder="Who’s it for, what’s the occasion, how much?"
              value={p.prompt}
              onChange={(e) => p.onPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (ready) p.onDesign(); }
              }}
            />
            {!p.prompt && <div className="v-chips">{QUICK.map(([l, t]) => <button key={l} className="v-chip" onClick={() => p.onPrompt(t)}>{l}</button>)}</div>}
          </>
        ) : <p className="v-prompt-text" title="Edit the description">{p.prompt}</p>}
      </div>

      <div className={`v-link${gen ? " busy" : ""}`}><span>{I.spark}</span></div>

      <div className="v-mod out">
        <div className="v-lbl">
          <span>{filled ? <>{editable("recipientName", "v-name")} receives</> : "They receive"}</span>
          {filled ? editable("occasion", "v-chip") : gen ? skel(70, 20) : <span className="v-chip">Gas covered</span>}
        </div>
        <div className="v-split">
          <div style={{ minWidth: 0 }}>
            {filled ? (
              <label className={`v-amt num${fi}`}>$<input inputMode="decimal" value={g.amountStr} onChange={(e) => p.onDraft({ amountStr: e.target.value.replace(/[^0-9.]/g, "").slice(0, 7) })} /></label>
            ) : gen ? <div className="v-big">{skel(140, 34)}</div> : <div className="v-big ph num">$0</div>}
            <div className="v-sub num">
              {kite.connected
                ? <>Kite balance {(kite.balances[g.network] ?? 0).toFixed(2)} {asset.symbol}{filled && <b onClick={p.onMax}>Max</b>}</>
                : <>{filled ? `${amount.toFixed(2)} ${asset.symbol} on ${net.name}` : `${asset.symbol} on ${net.name}`}</>}
            </div>
          </div>
          <button className="v-tok" onClick={p.onNetwork} title="Change network">
            <span className="net"><TokenImg sym={asset.symbol} /><ChainImg id={g.network} /></span>{asset.symbol}{I.chev}
          </button>
        </div>
        {filled && (
          <div className="v-note">
            {editable("note", "", (v) => `“${v}”`)}
            {p.editing !== "note" && <button className="v-mini" title="Edit the note" onClick={() => p.onEdit("note")}>{I.edit}</button>}
          </div>
        )}
        {gen && <div className="v-note">{skel(300)}</div>}
        {filled && net.isNew && <div className="v-hint">{I.lock}<span>{net.name} is a newer network — {g.recipientName}’s wallet may ask to add it once.</span></div>}
        {filled && g.insight && <div className={`v-hint${fi}`}>{I.spark}<span>{g.insight}</span></div>}
      </div>

      <div className="v-meta">
        <span className="num">{filled ? <>You pay <b>{usd(totalFor(amount, g.network))}</b> · fee {usd(feeFor(amount, g.network))}</> : <>Fee 1.5% · gas covered</>}</span>
        <span className="v-exp">
          <span>Claim within</span>
          {EXPIRY_OPTIONS.map((h) => <button key={h} className={g.expiresIn === h ? "on" : ""} onClick={() => p.onDraft({ expiresIn: h })}>{EXPIRY_LABEL[h].short}</button>)}
        </span>
      </div>
      {cta}
      {p.error && <p className="err-line">{p.error}</p>}
    </div>
  );
}
