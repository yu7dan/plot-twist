"use client";

import Link from "next/link";
import { V } from "../site/icons";
import { I } from "../ui/icons";
import { flash } from "../ui/screen";

const origin = () => window.location.origin;

const curl = () => `curl -X POST ${origin()}/api/v1/gifts \\
  -H "Authorization: Bearer pt_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"brief": "Birthday gift for my sister Maya, about $50", "network": "base"}'`;

/** The live OpenAI-style tool definitions (works with any function-calling model). */
const schema = async () => JSON.stringify((await fetch("/api/v1/schema").then((r) => r.json())).tools, null, 2);

async function copy(text: string | Promise<string>, what: string) {
  try {
    await navigator.clipboard.writeText(await text);
    flash(`${what} copied`);
  } catch {
    flash("Couldn't copy — check clipboard permissions");
  }
}

/** The Agent API tab: quick ways to plug an agent in. */
export function ApiPanel() {
  return (
    <div className="v-api">
      <div className="v-mod">
        <div className="v-lbl"><span>Connect your agent</span></div>
        <div className="v-conn">
          <div className="v-cb"><span className="lg">{V.term}</span><span><b>REST API</b><small>One call prepares a Gift or a Drop</small></span><button className="act" onClick={() => copy(curl(), "curl")}>{I.copy}Copy curl</button></div>
          <div className="v-cb"><span className="lg">{V.fn}</span><span><b>Function calling</b><small>OpenAI, Gemini, Claude and others</small></span><button className="act" onClick={() => copy(schema(), "Tool schema")}>{I.copy}Copy schema</button></div>
          <div className="v-cb"><span className="lg">{V.plug}</span><span><b>MCP server</b><small>Claude, Cursor and any MCP client</small></span><span className="act soon">Coming soon</span></div>
        </div>
        <p className="v-fine">Your agent prepares Gifts and Drops and sends you an approval link. Every payment still waits for your Kite passkey — the agent never holds your money.</p>
      </div>
      <Link className="v-cta" href="/dashboard?view=developers" style={{ marginTop: 4 }}>Create an API key</Link>
    </div>
  );
}
