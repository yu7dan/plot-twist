"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { KiteConnect } from "../kite/kite-connect";
import { V } from "../site/icons";
import { SiteNav } from "../site/site-nav";
import { I } from "../ui/icons";
import { flash, Screen } from "../ui/screen";
import { useKite } from "../use-kite";

function Code({ children }: { children: string }) {
  return (
    <div className="v-code">
      <button className="v-mini" title="Copy" onClick={() => navigator.clipboard.writeText(children).then(() => flash("Copied"))}>{I.copy}</button>
      <pre>{children}</pre>
    </div>
  );
}

const Field = ({ name, type, children }: { name: string; type: string; children: ReactNode }) => (
  <div className="v-field"><code>{name}</code><small>{type}</small><span>{children}</span></div>
);

/** Agent API reference. */
export function DocsPage() {
  const kite = useKite();
  const [connectOpen, setConnectOpen] = useState(false);
  const [origin, setOrigin] = useState("https://plot-twist-zeta.vercel.app");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- examples use this deployment's own URL
    setOrigin(window.location.origin);
  }, []);

  return (
    <Screen glow={false}>
      <SiteNav active="docs" kite={kite} onConnect={() => setConnectOpen(true)} />
      <main className="v-page v-docs">
        <div className="v-dh" style={{ marginBottom: 8 }}><span className="v-pi api">{V.api}</span><div><h1>Agent API</h1><p>Let your AI agent prepare Gifts and Drops. You approve every payment with your Kite passkey.</p></div></div>

        <section>
          <h2>How it works</h2>
          <ol>
            <li><b>Your agent calls Plot Twist</b> with an API key — a one-line brief is enough; SERV designs the rest.</li>
            <li><b>You get an approval link.</b> Your agent passes on the <code>approveUrl</code>; you review it, then approve the exact total on Kite Passport.</li>
            <li><b>The links go out.</b> Your agent polls the status and delivers each claim link. Recipients claim with any wallet or exchange address — no gas, no sign-up.</li>
          </ol>
          <p className="v-note-box">An API key can only <b>prepare</b> payments. Nothing moves without your passkey, and you can revoke a key at any time.</p>
        </section>

        <section>
          <h2>Authentication</h2>
          <p>Create a key in <Link href="/dashboard?tab=keys">Dashboard → API keys</Link> and send it as a bearer token. Each key allows 60 requests per 10 minutes.</p>
          <Code>{`Authorization: Bearer pt_live_…`}</Code>
        </section>

        <section>
          <h2><span className="m post">POST</span> /api/v1/gifts</h2>
          <p>Prepare a gift for one person. Send a <code>brief</code>, or the fields yourself — anything you send overrides SERV.</p>
          <div className="v-fields">
            <Field name="brief" type="string">Who it’s for, the occasion and roughly how much, in one sentence.</Field>
            <Field name="recipientName" type="string">Optional with a brief.</Field>
            <Field name="amount" type="number">US dollars, 5–500.</Field>
            <Field name="note" type="string">Card message, up to 160 characters.</Field>
            <Field name="occasion" type="string">e.g. Birthday, Thank You.</Field>
            <Field name="network" type="string">base · solana · polygon · avalanche · arc · tempo · robinhood. Default base.</Field>
            <Field name="expiresInHours" type="number">24 · 72 · 168 · 720 — after this the sender can take it back. Default 24.</Field>
          </div>
          <Code>{`curl -X POST ${origin}/api/v1/gifts \\
  -H "Authorization: Bearer pt_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"brief": "Birthday gift for my sister Maya, about $50 — she just moved to Berlin"}'`}</Code>
          <Code>{`{
  "id": "4f1c…",
  "kind": "gift",
  "status": "pending_approval",
  "approveUrl": "${origin}/approve/4f1c…",
  "gift": { "recipientName": "Maya", "occasion": "Birthday", "amount": "50.00", "network": "base", "note": "New city, same you…" }
}`}</Code>
        </section>

        <section>
          <h2><span className="m post">POST</span> /api/v1/drops</h2>
          <p>Prepare a Drop: one approval pays a whole list, each person with their own link and note. Send a <code>brief</code>, <code>recipients</code>, or both — SERV writes any missing notes and the title.</p>
          <div className="v-fields">
            <Field name="brief" type="string">What it’s for, and anything to mention about each person.</Field>
            <Field name="recipients" type="array">Up to 200 × <code>{`{ name, amount, contact?, note? }`}</code>; amounts 1–500 US dollars.</Field>
            <Field name="title" type="string">Optional; SERV names it otherwise.</Field>
            <Field name="network" type="string">As above. Default base.</Field>
            <Field name="expiresInHours" type="number">As above. Default 168 (7 days).</Field>
          </div>
          <Code>{`curl -X POST ${origin}/api/v1/drops \\
  -H "Authorization: Bearer pt_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"brief": "Thank our top contributors this month",
       "recipients": [{"name": "alice.eth", "amount": 40, "contact": "@alice"},
                      {"name": "bob", "amount": 25}]}'`}</Code>
        </section>

        <section>
          <h2><span className="m get">GET</span> /api/v1/gifts/{"{id}"} · /api/v1/drops/{"{id}"}</h2>
          <p>Poll until it’s live. Gifts return <code>link</code>; Drops return <code>links</code> — one per person, with their status.</p>
          <div className="v-fields">
            <Field name="pending_approval" type="status">Waiting for you to open <code>approveUrl</code>.</Field>
            <Field name="awaiting_payment" type="status">Approved; waiting for your passkey on Kite.</Field>
            <Field name="live" type="status">Paid and verified on-chain — the link(s) can be delivered.</Field>
            <Field name="claimed" type="status">The recipient claimed it (gifts).</Field>
            <Field name="payment_failed" type="status">The Kite transfer didn’t go through; nothing was sent.</Field>
          </div>
        </section>

        <section>
          <h2>Function calling</h2>
          <p>OpenAI-style tool definitions for these endpoints — they work with OpenAI, Gemini, Claude and most agent frameworks:</p>
          <Code>{`GET ${origin}/api/v1/schema`}</Code>
        </section>

        <section>
          <h2>MCP server <span className="soon">Coming soon</span></h2>
          <p>A hosted MCP server for Claude, Cursor and other MCP clients, with the same three tools.</p>
        </section>
      </main>
      {connectOpen && <KiteConnect onClose={() => setConnectOpen(false)} onConnected={() => { setConnectOpen(false); kite.refresh(); }} />}
    </Screen>
  );
}
