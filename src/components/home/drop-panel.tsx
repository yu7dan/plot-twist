"use client";

import { useState } from "react";
import { NETWORKS } from "@/lib/chains";
import { I } from "../ui/icons";
import { Brand, ChainImg, TokenImg } from "../ui/marks";
import { flash } from "../ui/screen";
import type { Kite } from "../use-kite";

const EXAMPLE = "Thank our top 5 contributors this month — alice.eth 40, bob 25, chen_dev 25, mira 25, sam.sol 15. Mention what each of them did.";

/** The Drop tab: paste a list or describe it → SERV builds the table → one Kite approval pays everyone. */
export function DropPanel({ kite, onConnect }: { kite: Kite; onConnect: () => void }) {
  const [brief, setBrief] = useState("");
  const net = NETWORKS.base;
  const ready = brief.trim().length >= 8;

  return (
    <div className="v-drop">
      <div className="v-mod">
        <div className="v-lbl"><span>Who’s getting paid?</span><span className="v-serv">{I.spark}SERV builds the table</span></div>
        <textarea className="v-prompt" rows={2} maxLength={4000} placeholder="Paste a list (name, amount) or describe it" value={brief} onChange={(e) => setBrief(e.target.value)} />
        {!brief && <div className="v-chips"><button className="v-chip" onClick={() => setBrief(EXAMPLE)}>{I.spark}Try an example</button><span className="v-chip">CSV: name, amount, contact</span></div>}
      </div>
      <div className="v-link"><span>{I.spark}</span></div>
      <div className="v-mod out">
        <div className="v-lbl"><span>Everyone gets a link and a note</span><span className="v-chip">Up to 200 people</span></div>
        <div className="v-split">
          <div><div className="v-big ph num">$0</div><div className="v-sub">0 people · {net.asset.symbol} on {net.name}</div></div>
          <span className="v-tok"><span className="net"><TokenImg sym={net.asset.symbol} /><ChainImg id="base" /></span>{net.asset.symbol}{I.chev}</span>
        </div>
      </div>
      <div className="v-meta"><span>Fee 1% per person · gas covered</span><span>One Kite approval for the total</span></div>
      {!kite.connected && ready
        ? <button className="v-cta" onClick={onConnect}><Brand k="kite" />Connect Kite to send</button>
        : <button className={`v-cta${ready ? "" : " soft"}`} onClick={() => (ready ? flash("Drop opens in the next update") : setBrief(EXAMPLE))}>{I.spark}{ready ? "Build the Drop" : "Try an example"}</button>}
    </div>
  );
}
