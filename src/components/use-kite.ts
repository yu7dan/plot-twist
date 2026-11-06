"use client";

import { useCallback, useEffect, useState } from "react";
import type { NetworkId } from "@/lib/chains";

export interface KiteState {
  loading: boolean;
  connected: boolean;
  email?: string;
  total: number;
  balances: Partial<Record<NetworkId, number>>;
  /** The sender's own Kite deposit address on each network (top-ups go here). */
  addresses: Partial<Record<NetworkId, string>>;
}

/** The sender's Kite Passport connection and per-network balances (server session). */
export function useKite() {
  const [state, setState] = useState<KiteState>({ loading: true, connected: false, total: 0, balances: {}, addresses: {} });

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/kite/me", { cache: "no-store" });
      const d = await r.json();
      setState({ loading: false, connected: !!d.connected, email: d.email, total: d.total ?? 0, balances: d.balances ?? {}, addresses: d.addresses ?? {} });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the server session
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export type Kite = ReturnType<typeof useKite>;
