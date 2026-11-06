import type { ExpiryHours } from "@/lib/types";

export const EXPIRY_LABEL: Record<ExpiryHours, { short: string; long: string }> = {
  24: { short: "24h", long: "24 hours" },
  72: { short: "3d", long: "3 days" },
  168: { short: "7d", long: "7 days" },
  720: { short: "30d", long: "30 days" },
};

/** "23h left", "2d left", "40m left" — or null once it's passed. */
export function timeLeft(iso?: string) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = ms / 3_600_000;
  if (h >= 48) return `${Math.floor(h / 24)}d left`;
  if (h >= 1) return `${Math.floor(h)}h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}
