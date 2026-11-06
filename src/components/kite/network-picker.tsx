"use client";

import { NETWORKS, NETWORK_ORDER, type NetworkId } from "@/lib/chains";
import { ChainImg } from "../ui/marks";
import type { KiteState } from "../use-kite";

/** Compact network chooser with the Kite balance on each network. */
export function NetworkPicker({ value, kite, onChange }: { value: NetworkId; kite: KiteState; onChange: (id: NetworkId) => void }) {
  return (
    <div className="net-pick">
      {NETWORK_ORDER.map((id) => (
        <button key={id} type="button" className={id === value ? "on" : ""} onClick={() => onChange(id)}>
          <ChainImg id={id} className="xs" />
          <span>{NETWORKS[id].name}<small className="num">{(kite.balances[id] ?? 0).toFixed(2)} {NETWORKS[id].asset.symbol}</small></span>
        </button>
      ))}
    </div>
  );
}
