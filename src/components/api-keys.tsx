"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { V } from "./site/icons";
import { I } from "./ui/icons";
import { flash } from "./ui/screen";

interface Key { id: string; name: string; prefix: string; createdAt: string; lastUsedAt?: string }

const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "never");

/** Dashboard tab: keys an agent uses to prepare Gifts and Drops for this account. */
export function ApiKeys() {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch("/api/account/keys", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    setKeys(d.keys ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
  }, [load]);

  async function create() {
    setBusy(true);
    try {
      const r = await fetch("/api/account/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't create a key");
      setFresh(d.key); setName("");
      load();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't create a key");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(k: Key) {
    if (!confirm(`Revoke "${k.name}"? Agents using it will stop working.`)) return;
    await fetch(`/api/account/keys?id=${k.id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <div className="v-card">
        <div className="v-dh">
          <span className="v-pi api">{V.api}</span>
          <div><h1 style={{ fontSize: 20 }}>Agent API keys</h1><p>An agent with a key can prepare Gifts and Drops for you. You still approve every payment with your Kite passkey.</p></div>
        </div>
        {fresh && (
          <div className="v-newkey">
            <small>Your new key — copy it now, you won’t see it again.</small>
            <div><code>{fresh}</code><button className="v-btn" onClick={() => navigator.clipboard.writeText(fresh).then(() => flash("Key copied"))}>{I.copy}Copy</button></div>
          </div>
        )}
        <div className="v-keyform">
          <input placeholder="Name it, e.g. Birthday agent" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && create()} />
          <button className="v-btn acc" disabled={busy} onClick={create}>{busy ? <span className="spin" /> : null}Create key</button>
        </div>
      </div>
      <div className="v-card v-list">
        {keys === null ? <div className="v-li"><span className="skel" style={{ width: 200 }} /></div>
          : keys.length === 0 ? <div className="v-li" style={{ color: "var(--muted)", fontSize: 14 }}>No keys yet.</div>
          : keys.map((k) => (
            <div className="v-li" key={k.id} style={{ alignItems: "center" }}>
              <span className="av">{V.api}</span>
              <div className="v-who"><b>{k.name}</b><p><code>{k.prefix}…</code> · created {when(k.createdAt)} · last used {when(k.lastUsedAt)}</p></div>
              <button className="v-btn warn" onClick={() => revoke(k)}>Revoke</button>
            </div>
          ))}
      </div>
      <p className="v-fine" style={{ marginTop: 12 }}>How to call it, with examples: <Link href="/docs" style={{ color: "var(--accent-text)" }}>Agent API docs →</Link></p>
    </>
  );
}
