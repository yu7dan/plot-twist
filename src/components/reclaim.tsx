"use client";

import { useState } from "react";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import { validAddress } from "@/lib/signatures";
import { I } from "./ui/icons";
import { Brand, ChainImg, TokenImg, usd } from "./ui/marks";

export interface ReclaimItem { code: string; recipientName: string; amount: string; network: NetworkId; reclaimTo?: string }

type Result = { code: string; ok: boolean; txUrl?: string; error?: string };

/**
 * Take back unclaimed gifts after their window. One gift can go to any wallet;
 * "take back all" sends each to the sender's own Kite wallet on its network.
 */
export function Reclaim({ items, onClose, onDone }: { items: ReclaimItem[]; onClose: () => void; onDone: () => void }) {
  const single = items.length === 1 ? items[0] : null;
  const [dest, setDest] = useState<"kite" | "other">("kite");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const total = items.reduce((a, g) => a + Number(g.amount), 0);
  const otherOk = !single || dest === "kite" || validAddress(NETWORKS[single.network].kind, to.trim());

  async function confirm() {
    setBusy(true);
    const out: Result[] = [];
    for (const g of items) {
      const r = await fetch(`/api/gifts/${g.code}/reclaim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(single && dest === "other" ? { to: to.trim() } : {}),
      });
      const d = await r.json().catch(() => ({}));
      out.push({ code: g.code, ok: r.ok, txUrl: d.txUrl, error: d.error });
      setResults([...out]);
    }
    setBusy(false);
    onDone();
  }

  const done = results && results.length === items.length && !busy;

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal topup">
        <div className="m-h"><span>{single ? "Take back gift" : "Take back unclaimed gifts"}</span><button className="x" onClick={onClose} disabled={busy}>{I.x}</button></div>
        <div className="amt-lg num">{usd(total)}</div>
        <p className="sub">
          {single ? `${single.recipientName} didn’t claim it in time.` : `${items.length} gifts weren’t claimed in time.`} The gift amount comes back; the fee doesn’t.
        </p>

        <div className="m-block rc-list">
          {items.map((g) => {
            const r = results?.find((x) => x.code === g.code);
            const n = NETWORKS[g.network];
            return (
              <div key={g.code} className="asset">
                <TokenImg sym={n.asset.symbol} />
                <div className="meta"><b className="num">{Number(g.amount).toFixed(2)} {n.asset.symbol}</b><span>For {g.recipientName} · on {n.name}</span></div>
                <span className="usd">
                  {r ? (r.ok ? <a href={r.txUrl} target="_blank" rel="noopener" className="rc-ok">Done {I.ext}</a> : <span className="rc-err">{r.error || "Failed"}</span>) : busy ? <span className="spin" /> : <ChainImg id={g.network} className="xs" />}
                </span>
              </div>
            );
          })}
        </div>

        {!done && (
          <>
            <div className="lbl" style={{ marginTop: 16 }}>Send it to</div>
            <div className="rc-dest">
              <button className={dest === "kite" ? "on" : ""} onClick={() => setDest("kite")} disabled={busy}>
                <Brand k="kite" /><span><b>Your Kite wallet</b><small>{single?.reclaimTo ? `${NETWORKS[single.network].name} · ${single.reclaimTo.slice(0, 6)}…${single.reclaimTo.slice(-4)}` : "Same network as each gift"}</small></span>
              </button>
              {single && (
                <button className={dest === "other" ? "on" : ""} onClick={() => setDest("other")} disabled={busy}>
                  <span className="tu-ic">{I.right}</span><span><b>Another wallet</b><small>Any {NETWORKS[single.network].name} address you own</small></span>
                </button>
              )}
            </div>
            {single && dest === "other" && (
              <label className="tu-amt"><input className="tu-addr num" placeholder={NETWORKS[single.network].kind === "solana" ? "Solana address" : "0x… address"} value={to} onChange={(e) => setTo(e.target.value.trim())} spellCheck={false} /></label>
            )}
            <button className="cta" onClick={confirm} disabled={busy || !otherOk}>{busy ? <><span className="spin" />Sending</> : `Take back ${usd(total)}`}</button>
            <p className="fine">Network fees are on Plot Twist.</p>
          </>
        )}
        {done && (results.some((r) => !r.ok)
          ? <button className="cta" onClick={() => setResults(null)}>Try again</button>
          : <button className="cta" onClick={onClose}>Done</button>)}
      </div>
    </div>
  );
}
