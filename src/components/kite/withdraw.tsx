"use client";

import { useEffect, useState } from "react";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import { CHAIN_UI, WALLETS, type WalletKey } from "@/lib/ui-assets";
import { connectWallet, NoWallet } from "../claim/wallets";
import { I } from "../ui/icons";
import { Brand, TokenImg } from "../ui/marks";
import { flash, useMobile } from "../ui/screen";
import type { Kite } from "../use-kite";
import { NetworkPicker } from "./network-picker";

type Phase = "form" | "approve" | "done";

/** Send money from Kite Passport back to one of the user's wallets (passkey-approved on Kite). */
export function Withdraw({ kite, onClose }: { kite: Kite; onClose: () => void }) {
  const m = useMobile();
  const [network, setNetwork] = useState<NetworkId>(() => {
    const funded = (Object.entries(kite.balances) as [NetworkId, number][]).sort((a, b) => b[1] - a[1])[0];
    return funded && funded[1] > 0 ? funded[0] : "base";
  });
  const net = NETWORKS[network];
  const sym = net.asset.symbol;
  const have = kite.balances[network] ?? 0;
  // On Arc, USDC also pays gas, so Kite keeps a little back.
  const max = Math.max(0, Math.floor((have - (network === "arc" ? 0.02 : 0)) * 100) / 100);
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [connecting, setConnecting] = useState<WalletKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [req, setReq] = useState<{ requestId: string; approvalUrl: string } | null>(null);
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState("");

  async function pickWallet(key: WalletKey) {
    setConnecting(key); setError("");
    try {
      setTo((await connectWallet(key, network)).address);
    } catch (e) {
      if (e instanceof NoWallet) {
        if (e.link && m) { window.location.assign(e.link); return; }
        setError(`${WALLETS[key].name} isn't installed in this browser.`);
      } else setError("The wallet didn't connect.");
    } finally {
      setConnecting(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Open the Kite tab inside the click so pop-up blockers allow it.
    const tab = window.open("", "kite-approve");
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/kite/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ network, to: to.trim(), amount }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't start the transfer");
      setReq(d);
      if (tab) tab.location.href = d.approvalUrl;
      setPhase("approve");
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : "Couldn't start the transfer");
    } finally {
      setBusy(false);
    }
  }

  // Wait for the passkey approval and the transfer.
  useEffect(() => {
    if (phase !== "approve" || !req) return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/kite/withdraw?requestId=${encodeURIComponent(req.requestId)}`).then((r) => r.json()).catch(() => null);
      if (d?.state === "completed") { setTxHash(d.txHash); setPhase("done"); kite.refresh(); }
      if (d?.state === "failed" || d?.state === "expired") { setError(d.error ? `Kite: ${d.error}` : "The transfer didn't go through."); setPhase("form"); }
    }, 2500);
    return () => clearInterval(t);
  }, [phase, req, kite]);

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && phase !== "approve" && onClose()}>
      <div className="modal topup">
        <div className="m-h"><span>Withdraw from Kite</span><button className="x" onClick={onClose}>{I.x}</button></div>
        {phase === "done" ? (
          <div className="tu-wait">
            <span className="done-ic">{I.check}</span>
            <b className="num">{Number(amount).toFixed(2)} {sym} sent</b>
            <small className="num">to {to.slice(0, 6)}…{to.slice(-4)} on {net.name}</small>
            {txHash && <a href={net.txUrl(txHash)} target="_blank" rel="noopener">View transaction {I.ext}</a>}
            <button className="cta" style={{ marginTop: 8 }} onClick={onClose}>Done</button>
          </div>
        ) : phase === "approve" && req ? (
          <div className="tu-wait">
            <span className="spin" />
            <b>Approve it with your passkey on Kite Passport</b>
            <small className="num">{Number(amount).toFixed(2)} {sym} on {net.name} → {to.slice(0, 6)}…{to.slice(-4)}</small>
            <a href={req.approvalUrl} target="kite-approve" rel="noopener">Open Kite Passport {I.ext}</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="sub">Send {sym} from your Kite Passport to any wallet you own.</p>
            <NetworkPicker value={network} kite={kite} onChange={(id) => { setNetwork(id); setTo(""); setError(""); }} />
            <div className="lbl" style={{ marginTop: 16 }}>Amount</div>
            <label className="tu-amt">
              <TokenImg sym={sym} />
              <input className="num" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 9))} />
              <span>of {have.toFixed(2)} <b className="max" onClick={() => setAmount(max.toFixed(2))}>Max</b></span>
            </label>
            <div className="lbl">To</div>
            <label className="tu-amt">
              <input className="tu-addr num" placeholder={net.kind === "solana" ? "Solana address" : "0x… address"} value={to} onChange={(e) => setTo(e.target.value.trim())} spellCheck={false} />
            </label>
            <div className="wd-wallets">
              {CHAIN_UI[network].wallets.map((k) => (
                <button key={k} type="button" className="chip" disabled={!!connecting} onClick={() => pickWallet(k)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={WALLETS[k].icon} alt="" />{connecting === k ? "Connecting…" : `Use ${WALLETS[k].name}`}
                </button>
              ))}
            </div>
            <button className="cta" type="submit" disabled={busy || !(Number(amount) > 0) || Number(amount) > max + 1e-9 || !to}>
              {busy ? <><span className="spin" />Preparing</> : <><Brand k="kite" />Approve with passkey</>}
            </button>
            <p className="fine">Kite sends exactly this amount to this address. Gas is covered{network === "arc" ? " (on Arc, a few cents of USDC pay it)" : ""}.</p>
          </form>
        )}
        {error && <p className="err-line">{error}</p>}
      </div>
    </div>
  );
}
