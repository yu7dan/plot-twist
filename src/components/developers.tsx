"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "./ui/icons";
import { usd } from "./ui/marks";
import { flash } from "./ui/screen";

interface Stats {
  days: string[];
  totals: { requests: number; change: number | null; prepared: number; gifts: number; drops: number; approved: number; approvalRate: number | null; volume: string; fees: string };
  chart: { day: string; requests: number; prepared: number }[];
  keys: { id: string; name: string; prefix: string; createdAt: string; lastUsedAt?: string; requests: number; prepared: number; volume: string; daily: number[] }[];
  recent: { id: string; kind: "gift" | "drop"; createdAt: string; keyName: string; summary: string; amount: string; status: string; dropId?: string; giftCode?: string }[];
}

const RANGES = [7, 30, 90] as const;
const STATUS: Record<string, [string, string]> = {
  pending_approval: ["Waiting for you", "pend"], awaiting_payment: ["Waiting for passkey", "wait"], payment_failed: ["Not paid", "back"],
  live: ["Paid · live", "ok"], claiming: ["Claiming", "wait"], claimed: ["Claimed", "ok"], reclaiming: ["Coming back", "back"], reclaimed: ["Taken back", "back"],
};
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
function ago(iso?: string) {
  if (!iso) return "Never";
  const m = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (m < 2) return "Just now";
  if (m < 60) return `${Math.floor(m)} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 2880) return "Yesterday";
  return date(iso);
}

/** Dashboard → Developers: Agent API usage, keys and what agents prepared. The API is free; fees apply on payment. */
export function Developers({ createOpen, onCreateClose }: { createOpen: boolean; onCreateClose: () => void }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [s, setS] = useState<Stats | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const load = useCallback(async () => {
    const d = await fetch(`/api/account/developers?days=${days}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (d?.totals) setS(d);
  }, [days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when the range changes
    load();
  }, [load]);

  async function revoke(id: string, name: string) {
    if (!confirm(`Revoke "${name}"? Agents using it will stop working right away.`)) return;
    await fetch(`/api/account/keys?id=${id}`, { method: "DELETE" });
    flash("Key revoked");
    load();
  }

  if (!s) return <div className="v-card" style={{ marginTop: 18 }}><span className="skel" style={{ width: 260, height: 24 }} /></div>;
  const t = s.totals;
  const max = Math.max(1, ...s.chart.map((c) => c.requests));
  const ticks = [0, Math.floor(s.days.length / 4), Math.floor(s.days.length / 2), Math.floor((3 * s.days.length) / 4), s.days.length - 1];

  return (
    <>
      <div className="d-dev-h">
        <p>Agents use these keys to prepare Gifts and Drops for you. Every payment still waits for your passkey. <Link href="/docs">Read the docs →</Link></p>
        <span className="d-range">{RANGES.map((r) => <button key={r} className={days === r ? "on" : ""} onClick={() => setDays(r)}>{r}d</button>)}</span>
      </div>

      <div className="d-kpis">
        <div><small>API requests</small><b className="num">{t.requests.toLocaleString("en-US")}</b><span className={t.change != null && t.change >= 0 ? "up" : ""}>{t.change == null ? `last ${days} days` : `${t.change >= 0 ? "+" : ""}${t.change}% vs previous ${days}d`}</span></div>
        <div><small>Prepared by agents</small><b className="num">{t.prepared}</b><span>{t.gifts} Gifts · {t.drops} Drops</span></div>
        <div><small>Approved by you</small><b className="num">{t.approved}</b><span>{t.approvalRate == null ? "—" : `${t.approvalRate}% approval rate`}</span></div>
        <div><small>Paid via API</small><b className="num">{usd(t.volume)}</b><span>{usd(t.fees)} in fees</span></div>
      </div>

      <div className="v-card">
        <div className="d-chart-h"><span>Requests per day</span><span className="d-legend"><span><i className="a" />Gifts &amp; Drops prepared</span><span><i className="b" />Other calls</span></span></div>
        <div className="d-chart" onMouseLeave={() => setHover(null)}>
          {s.chart.map((c, i) => (
            <div key={c.day} className={`d-col${hover === i ? " hl" : ""}`} onMouseEnter={() => setHover(i)}>
              <i className="b" style={{ height: `${((c.requests - c.prepared) / max) * 100}%` }} />
              <i className="a" style={{ height: `${(c.prepared / max) * 100}%` }} />
            </div>
          ))}
          {hover != null && (
            <div className="tip" style={{ left: `min(calc(${(hover / s.chart.length) * 100}% ), calc(100% - 170px))` }}>
              <b>{date(s.chart[hover].day)}</b><br />{s.chart[hover].requests} requests · {s.chart[hover].prepared} prepared
            </div>
          )}
          {t.requests === 0 && <div className="d-chart-empty">No API calls yet — create a key and point your agent at the docs.</div>}
        </div>
        <div className="d-xaxis">{ticks.map((i) => <span key={i}>{date(s.days[i])}</span>)}</div>
      </div>

      <div className="v-card">
        <div className="d-sec-h">API keys <small>{s.keys.length} of 10</small></div>
        {s.keys.length === 0 ? <p className="d-empty">No keys yet. Create one and give it to your agent.</p> : (
          <div className="d-tbl-wrap">
            <table className="d-tbl">
              <thead><tr><th>Name</th><th>Key</th><th>Last {days} days</th><th className="num">Requests</th><th className="num">Prepared</th><th className="num">Paid</th><th>Last used</th><th /></tr></thead>
              <tbody>
                {s.keys.map((k) => {
                  const top = Math.max(1, ...k.daily);
                  return (
                    <tr key={k.id}>
                      <td><b>{k.name}</b><small>Created {date(k.createdAt)}</small></td>
                      <td><code>{k.prefix}…</code></td>
                      <td><span className="d-spark">{k.daily.slice(-14).map((v, i) => <i key={i} style={{ height: `${3 + (v / top) * 17}px` }} />)}</span></td>
                      <td className="num">{k.requests.toLocaleString("en-US")}</td>
                      <td className="num">{k.prepared}</td>
                      <td className="num">{usd(k.volume)}</td>
                      <td>{ago(k.lastUsedAt)}</td>
                      <td><button className="v-btn warn d-sm" onClick={() => revoke(k.id, k.name)}>Revoke</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="d-note">The API is free. Plot Twist only earns its usual fee — 1.5% per Gift, 1% per Drop recipient — when you approve and pay.</p>
      </div>

      <div className="v-card">
        <div className="d-sec-h">Recent requests</div>
        {s.recent.length === 0 ? <p className="d-empty">Nothing prepared yet.</p> : s.recent.map((r) => {
          const [label, tone] = STATUS[r.status] ?? [r.status, "wait"];
          const href = r.status === "pending_approval" || r.status === "awaiting_payment" ? `/approve/${r.id}` : r.dropId ? `/drops/${r.dropId}` : r.giftCode ? `/g/${r.giftCode}` : `/approve/${r.id}`;
          return (
            <div className="v-li" key={r.id} style={{ alignItems: "center" }}>
              <span className="av">{r.kind === "gift" ? "G" : "D"}</span>
              <div className="v-who"><b>{r.summary} · {usd(r.amount)}</b><p>{r.keyName} · {ago(r.createdAt)}</p></div>
              <span className={`v-st ${tone}`}>{label}</span>
              <Link className="v-btn d-sm" href={href}>{r.status === "pending_approval" ? "Review" : "Open"}</Link>
            </div>
          );
        })}
      </div>

      {createOpen && <CreateKey onClose={(made) => { onCreateClose(); if (made) load(); }} />}
    </>
  );
}

/** Two steps: name it, then show the key exactly once. It can't be closed by accident before it's copied. */
function CreateKey({ onClose }: { onClose: (made: boolean) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/account/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't create a key");
      setKey(d.key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create a key");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(key!); setCopied(true); } catch { flash("Couldn't copy — select the key and copy it"); }
  }

  return createPortal(
    <div className="scrim" onClick={(e) => !key && e.target === e.currentTarget && onClose(false)}>
      <div className="modal d-keymodal">
        {!key ? (
          <>
            <div className="m-h"><span>Create API key</span><button className="x" onClick={() => onClose(false)}>{I.x}</button></div>
            <p className="d-p">Give each agent its own key, so you can see its usage and revoke it on its own.</p>
            <label className="d-label">Name<input autoFocus maxLength={40} placeholder="e.g. Birthday agent" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && create()} /></label>
            <div className="d-perm">
              <div>{I.checkSm}<span>Can prepare Gifts and Drops and check their status</span></div>
              <div className="no">{I.lock}<span>Can’t move money — you approve every payment with your Kite passkey</span></div>
            </div>
            <button className="cta" disabled={busy} onClick={create}>{busy ? <span className="spin" /> : null}Create key</button>
            {error && <p className="err-line">{error}</p>}
          </>
        ) : (
          <>
            <div className="m-h"><span>Your new API key</span></div>
            <p className="d-p">Copy it into your agent now.</p>
            <div className="d-keybox">
              <code>{key}</code>
              <button className={`d-copy${copied ? " done" : ""}`} onClick={copy}>{copied ? <>{I.checkSm}Copied</> : <>{I.copy}Copy key</>}</button>
            </div>
            <p className="d-warn">This is the only time you’ll see it. We keep only a fingerprint, so a lost key can’t be recovered — create a new one instead.</p>
            <button className="cta" disabled={!copied} onClick={() => onClose(true)}>I’ve saved my key</button>
            <p className="fine">{copied ? "Closing hides the key for good." : "Copy the key first."}</p>
          </>
        )}
      </div>
    </div>,
    document.querySelector(".screen.app") ?? document.body,
  );
}
