import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Upstash Redis, shared by every server instance (Vercel). Configured by
 * UPSTASH_REDIS_REST_URL / _TOKEN (or the KV_REST_API_* names Vercel's integration sets).
 * Without them, local dev falls back to JSON files and in-process locks.
 */
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Raw strings in and out, so compare-and-set compares exactly what was read.
const client = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;

/** The shared Redis, or null in local dev. On Vercel a missing config is an error, never a silent fallback. */
export function redis() {
  if (!client && process.env.VERCEL) throw new Error("Redis is not configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
  return client;
}

export const key = (...parts: string[]) => ["pt", ...parts].join(":");

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
