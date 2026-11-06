"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { NETWORKS, NETWORK_ORDER, type NetworkId } from "@/lib/chains";
import { feeFor, totalFor } from "@/lib/pricing";
import { I } from "../ui/icons";
import { Brand, ChainImg, Mascot, TokenImg, usd } from "../ui/marks";
import { EXPIRY_LABEL } from "../ui/time";
import type { KiteState } from "../use-kite";
import { canPay, type Draft } from "./create-card";

export function NetworkMenu({ selected, amount, kite, onPick, onClose }: { selected: NetworkId; amount: number; kite: KiteState; onPick: (id: NetworkId) => void; onClose: () => void }) {
  return (
    <>
      <div className="menu-scrim" onClick={onClose} />
      <div className="netmenu">
        <div className="nm-h">Gift network</div>
        {NETWORK_ORDER.map((id) => {
          const n = NETWORKS[id];
          const low = kite.connected && amount > 0 && !canPay(kite, id, amount);
          const sub = kite.connected ? `${n.asset.symbol} · Balance ${(kite.balances[id] ?? 0).toFixed(2)}` : `${n.asset.symbol}${n.isNew ? " · newer network" : ""}`;
          return (
            <button key={id} className={`${id === selected ? "on" : ""}${low ? " low" : ""}`} disabled={low} onClick={() => onPick(id)}>
              <ChainImg id={id} />
              <span>{n.name}<small><TokenImg sym={n.asset.symbol} className="xs" />{sub}</small></span>
              {id === selected ? <i>{I.checkSm}</i> : low ? <em className="nb">Not enough</em> : null}
            </button>
          );
        })}
        <p className="nm-f">{kite.connected ? "You pay and they receive on the same network. Gas is covered." : "Connect Kite Passport to see your balance on each network."}</p>
      </div>
    </>
  );
}

const Scrim = ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) => (
  <div className="scrim" onClick={(e) => onClose && e.target === e.currentTarget && onClose()}>{children}</div>
);

export function ReviewModal({ draft: g, busy, error, onClose, onApprove }: { draft: Draft; busy: boolean; error: string; onClose: () => void; onApprove: () => void }) {
  const amount = Number(g.amountStr);
  const net = NETWORKS[g.network];
  return (
    <Scrim onClose={busy ? undefined : onClose}>
      <div className="modal">
        <div className="m-h"><span>Review gift</span><button className="x" onClick={onClose} disabled={busy}>{I.x}</button></div>
        <div className="lbl">You send</div>
        <div className="amt-lg num">{usd(totalFor(amount))}</div>
        <div className="sub">{usd(amount)} gift + {usd(feeFor(amount))} fee · {net.asset.symbol} from your Kite wallet</div>
        <div className="m-block">
          <div className="asset"><TokenImg sym={net.asset.symbol} /><div className="meta"><b className="num">{amount.toFixed(2)} {net.asset.symbol}</b><span>{net.asset.name} · on {net.name}</span></div><span className="usd num">{usd(amount)}</span></div>
        </div>
        <div className="kv"><span>To</span><b>{g.recipientName} · {g.occasion}</b></div>
        <div className="kv"><span>Lands on</span><b><ChainImg id={g.network} />{net.name}</b></div>
        <div className="kv"><span>Pay with</span><b><Brand k="kite" />Kite Passport · {net.name}</b></div>
        <div className="kv"><span>Network fees</span><b>Covered</b></div>
        <div className="kv"><span>If unclaimed</span><b>Take it back after {EXPIRY_LABEL[g.expiresIn].long}</b></div>
        <div className="quote">“{g.note}”</div>
        <button className="cta" onClick={onApprove} disabled={busy}>{busy ? <><span className="spin" />Preparing transfer</> : "Approve with passkey"}</button>
        {error && <p className="err-line">{error}</p>}
        <p className="fine">You’ll approve this exact transfer with your passkey in Kite Passport.<br />Nothing moves until you approve.</p>
      </div>
    </Scrim>
  );
}

/** Waiting for the passkey approval, which happens on agentpassport.ai. */
export function ApproveModal({ draft: g, approvalUrl, failed, onClose, onRetry }: { draft: Draft; approvalUrl: string; failed: string; onClose: () => void; onRetry: () => void }) {
  const amount = Number(g.amountStr);
  const net = NETWORKS[g.network];
  return (
    <Scrim>
      <div className="kite">
        <div className="kite-h">
          <span className="kite-id"><Brand k="kite" /><span>Kite Passport<small>agentpassport.ai</small></span></span>
          <button className="x kx" onClick={onClose} aria-label="Close">{I.x}</button>
        </div>
        <h4>Approve transfer</h4>
        <p className="req">Approve it with your passkey on Kite Passport. This page updates by itself.</p>
        <div className="kite-amt num">{totalFor(amount).toFixed(2)}<small>{net.asset.symbol}</small></div>
        <div className="kite-box">
          <div className="kv"><span>Network</span><b><ChainImg id={g.network} />{net.name}</b></div>
          <div className="kv"><span>To</span><b>Plot Twist</b></div>
          <div className="kv"><span>For</span><b>Gift for {g.recipientName}</b></div>
        </div>
        {failed ? (
          <>
            <p className="err-line">{failed}</p>
            <button className="cta" onClick={onRetry}>Try again</button>
          </>
        ) : (
          <>
            <a className="cta" href={approvalUrl} target="kite-approve" rel="noopener">Open Kite Passport{I.ext}</a>
            <div className="kite-wait"><span className="spin" />Waiting for your passkey…</div>
          </>
        )}
        <p className="fine">Kite sends exactly this amount to Plot Twist — nothing else.</p>
      </div>
    </Scrim>
  );
}

export type SealStep = "run" | "ok" | "wait";

export function SealingModal({ draft: g, steps, txHash, code }: { draft: Draft; steps: SealStep[]; txHash?: string; code: string }) {
  const net = NETWORKS[g.network];
  const amount = Number(g.amountStr);
  const short = (h?: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");
  const rows: [string, string][] = [
    ["Transfer approved in Kite Passport", "passkey"],
    [`${totalFor(amount).toFixed(2)} ${net.asset.symbol} received on ${net.name}`, short(txHash)],
    [`${amount.toFixed(2)} ${net.asset.symbol} reserved for ${g.recipientName}`, "Plot Twist"],
    ["Gift sealed · link created", code],
  ];
  return (
    <Scrim>
      <div className="modal">
        <div className="m-h"><span>Sealing your gift</span><span className="sub">~5 sec</span></div>
        <div className="steps">
          {rows.map((r, i) => (
            <div key={i} className={`stp ${steps[i] || "wait"}`}>
              <span className="ic">{I.checkSm}</span><span className="st-t">{r[0]}</span>{steps[i] === "ok" && <small>{r[1]}</small>}
            </div>
          ))}
        </div>
      </div>
    </Scrim>
  );
}

export function ReadyModal({ draft: g, link, onClose, onGifts }: { draft: Draft; link: string; onClose: () => void; onGifts: () => void }) {
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0A0A0B", light: "#FFFFFF" } }).then(setSvg);
  }, [link]);
  const text = `A little plot twist for you, ${g.recipientName} 🎁`;
  const share = {
    tg: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
    x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
    wa: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
  };
  return (
    <Scrim onClose={onClose}>
      <div className="modal done">
        <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="x" onClick={onClose}>{I.x}</button></div>
        <Mascot pose="surprise" className="pop-m" />
        <h3>Gift ready</h3>
        <p>Send this link to {g.recipientName}. It opens sealed.<br /><small className="ready-exp">Not claimed within {EXPIRY_LABEL[g.expiresIn].long}? You can take it back from your Dashboard.</small></p>
        <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="linkbox">
          <span>{link.replace(/^https?:\/\//, "")}</span>
          <button className="copy" onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}>{copied ? "Copied" : "Copy"}</button>
        </div>
        <div className="share">
          <button onClick={() => window.open(share.tg, "_blank", "noopener")}>Telegram</button>
          <button onClick={() => window.open(share.x, "_blank", "noopener")}>X</button>
          <button onClick={() => window.open(share.wa, "_blank", "noopener")}>WhatsApp</button>
        </div>
        <a className="muted-link" onClick={onGifts}>View in Dashboard →</a>
      </div>
    </Scrim>
  );
}
