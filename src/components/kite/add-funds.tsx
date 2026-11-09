"use client";

import { useEffect, useState } from "react";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import { shortfall, totalFor } from "@/lib/pricing";
import { CHAIN_UI, WALLETS, type WalletKey } from "@/lib/ui-assets";
import { connectWallet, NoWallet } from "../claim/wallets";
import { I } from "../ui/icons";
import { Brand, ChainImg, TokenImg } from "../ui/marks";
import { flash, useMobile } from "../ui/screen";
import type { Kite } from "../use-kite";
import { NetworkPicker } from "./network-picker";

interface Props {
  kite: Kite;
  onClose: () => void;
  onFunded?: () => void;
  /** Set when opened from a gift that doesn't fit the balance: the network is fixed and the difference is pre-filled. */
  gift?: { network: NetworkId; amount: number };
}

/**
 * Add funds to the user's own Kite Passport: from their wallet, with a card on Kite, or from an exchange.
 * The money always lands in Kite first — gifts are then paid through Kite with a passkey.
 */
export function AddFunds({ kite, onClose, onFunded, gift }: Props) {
  const m = useMobile();
  const [network, setNetwork] = useState<NetworkId>(gift?.network ?? "base");
  const net = NETWORKS[network];
  const sym = net.asset.symbol;
  const have = kite.balances[network] ?? 0;
  const need = gift ? totalFor(gift.amount, gift.network) : 0;
  const [value, setValue] = useState(gift ? Math.max(0.01, shortfall(need, have)).toFixed(2) : "");
  const [busy, setBusy] = useState<WalletKey | null>(null);
  const [sent, setSent] = useState<{ hash: string; before: number; amount: number } | null>(null);
  const [error, setError] = useState("");
  const kiteAddress = kite.addresses[network];

  // After the transfer, wait until Kite sees the new balance.
  useEffect(() => {
    if (!sent) return;
    if (have + 0.005 >= sent.before + sent.amount) {
      flash(`${sent.amount.toFixed(2)} ${sym} added to Kite`);
      (onFunded ?? onClose)();
      return;
    }
    const t = setTimeout(() => kite.refresh(), 4000);
    return () => clearTimeout(t);
  }, [sent, have, sym, kite, onFunded, onClose]);

  async function fromWallet(key: WalletKey) {
    if (!kiteAddress) return;
    setBusy(key); setError("");
    try {
      const w = await connectWallet(key, network);
      const hash = await w.sendStable(kiteAddress, value);
      setSent({ hash, before: have, amount: Number(value) });
    } catch (e) {
      if (e instanceof NoWallet) {
        if (e.link && m) { window.location.assign(e.link); return; }
        setError(`${WALLETS[key].name} isn't installed in this browser.`);
      } else setError(e instanceof Error && !/reject|denied|cancel/i.test(e.message) ? e.message : "Transfer cancelled.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal topup">
        <div className="m-h"><span>Add funds to Kite</span><button className="x" onClick={onClose}>{I.x}</button></div>
        {gift ? (
          <p className="sub">Your Kite wallet has <b className="num">{have.toFixed(2)} {sym}</b> on <ChainImg id={network} className="xs" />{net.name}. This gift needs <b className="num">{need.toFixed(2)}</b>.</p>
        ) : (
          <>
            <p className="sub">Top up your Kite Passport ahead of time, on the network you like to gift on.</p>
            <NetworkPicker value={network} kite={kite} onChange={(id) => { setNetwork(id); setError(""); }} />
          </>
        )}

        {sent ? (
          <div className="tu-wait">
            <span className="spin" />
            <b>Sent — waiting for Kite to see it</b>
            <small>Usually under a minute. This closes by itself.</small>
            <a href={net.txUrl(sent.hash)} target="_blank" rel="noopener">View transaction {I.ext}</a>
          </div>
        ) : (
          <>
            <div className="lbl" style={{ marginTop: 16 }}>From your wallet</div>
            <label className="tu-amt">
              <TokenImg sym={sym} />
              <input className="num" inputMode="decimal" placeholder="0.00" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, "").slice(0, 9))} />
              <span>{sym} on {net.name}</span>
            </label>
            <div className="wallets">
              {CHAIN_UI[network].wallets.map((k) => (
                <button key={k} className={`wl ${busy === k ? "on" : ""}`} disabled={!!busy || !kiteAddress || !(Number(value) > 0)} onClick={() => fromWallet(k)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className={`brand ${"pad" in WALLETS[k] ? "pad" : ""}`}><img src={WALLETS[k].icon} alt="" /></span>
                  {WALLETS[k].name}
                  <small>{busy === k ? "Confirm in your wallet…" : ""}</small>
                </button>
              ))}
            </div>
            <p className="fine" style={{ textAlign: "left" }}>It goes to your own Kite Passport{gift ? ", then you approve the gift with your passkey as usual" : ""}. Your wallet pays the small network fee.</p>

            <div className="tu-alt">
              <a className="tu-row" href="https://agentpassport.ai/overview" target="_blank" rel="noopener">
                <Brand k="kite" /><span><b>Buy with a card</b><small>On Kite Passport · arrives as USDC on Base</small></span>{I.ext}
              </a>
              {kiteAddress && (
                <button className="tu-row" onClick={() => navigator.clipboard.writeText(kiteAddress).then(() => flash(`Your Kite ${net.name} address is copied`))}>
                  <ChainImg id={network} /><span><b>Send from an exchange</b><small className="num">{sym} on {net.name} · {kiteAddress.slice(0, 6)}…{kiteAddress.slice(-4)}</small></span>{I.copy}
                </button>
              )}
              <button className="tu-row" onClick={() => kite.refresh().then(onFunded ?? onClose)}>
                <span className="tu-ic">{I.refresh}</span><span><b>I’ve added funds</b><small>Refresh my Kite balance</small></span>
              </button>
            </div>
          </>
        )}
        {error && <p className="err-line">{error}</p>}
      </div>
    </div>
  );
}
