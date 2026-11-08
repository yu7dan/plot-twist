import "server-only";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { key, redis, sleep } from "./redis";

/**
 * Collections of JSON records. In production each collection is one Redis hash (id → JSON),
 * shared by every instance; updates are compare-and-set, so concurrent read-modify-writes never
 * lose each other. Local dev without Redis uses one JSON file per collection behind a write queue.
 */

/* ---------- local fallback: JSON files, one process ---------- */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

const g = globalThis as unknown as { __ptWriteQueue?: Promise<unknown> };

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = (g.__ptWriteQueue ?? Promise.resolve()).then(fn);
  g.__ptWriteQueue = next.catch(() => undefined);
  return next;
}

async function readAll<T>(name: string): Promise<Record<string, T>> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(DATA_DIR, `${name}.json`), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e; // never treat a failed read as "empty" — the next write would wipe the collection
  }
  return JSON.parse(raw) as Record<string, T>;
}

async function writeAll<T>(name: string, all: Record<string, T>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, `${name}.json`);
  await fs.writeFile(`${file}.tmp`, JSON.stringify(all, null, 2), "utf8");
  await fs.rename(`${file}.tmp`, file);
}

function fileCollection<T extends object>(name: string) {
  return {
    get: async (id: string): Promise<T | null> => {
      const all = await readAll<T>(name);
      return Object.hasOwn(all, id) ? all[id] : null;
    },
    all: async (): Promise<T[]> => Object.values(await readAll<T>(name)),
    put: (id: string, value: T) =>
      enqueue(async () => {
        const all = await readAll<T>(name);
        all[id] = value;
        await writeAll(name, all);
        return value;
      }),
    putMany: (entries: Record<string, T>) =>
      enqueue(async () => {
        const all = await readAll<T>(name);
        Object.assign(all, entries);
        await writeAll(name, all);
      }),
    update: (id: string, fn: (cur: T) => T | null) =>
      enqueue(async () => {
        const all = await readAll<T>(name);
        if (!Object.hasOwn(all, id)) return null;
        const next = fn(all[id]);
        if (!next) return null;
        all[id] = next;
        await writeAll(name, all);
        return next;
      }),
    remove: (id: string) =>
      enqueue(async () => {
        const all = await readAll<T>(name);
        delete all[id];
        await writeAll(name, all);
      }),
  };
}

/* ---------- production: Redis hashes ---------- */

// Writes the new value only if the field still holds exactly what we read.
const CAS = `if redis.call('HGET', KEYS[1], ARGV[1]) == ARGV[2] then redis.call('HSET', KEYS[1], ARGV[1], ARGV[3]) return 1 end return 0`;

function redisCollection<T extends object>(name: string) {
  const k = key(name);
  const db = () => redis()!;
  return {
    get: async (id: string): Promise<T | null> => {
      const raw = await db().hget<string>(k, id);
      return raw == null ? null : (JSON.parse(raw) as T);
    },
    all: async (): Promise<T[]> => ((await db().hvals(k)) as string[]).map((raw) => JSON.parse(raw) as T),
    put: async (id: string, value: T) => {
      await db().hset(k, { [id]: JSON.stringify(value) });
      return value;
    },
    putMany: async (entries: Record<string, T>) => {
      if (Object.keys(entries).length) await db().hset(k, Object.fromEntries(Object.entries(entries).map(([id, v]) => [id, JSON.stringify(v)])));
    },
    update: async (id: string, fn: (cur: T) => T | null): Promise<T | null> => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const raw = await db().hget<string>(k, id);
        if (raw == null) return null;
        const next = fn(JSON.parse(raw) as T);
        if (!next) return null;
        if (Number(await db().eval(CAS, [k], [id, raw, JSON.stringify(next)])) === 1) return next;
        // Someone else wrote in between: back off a little, re-read and re-apply.
        await sleep(Math.random() * 40 * Math.min(attempt + 1, 8));
      }
      throw new Error(`update conflict on ${name}/${id}`);
    },
    remove: async (id: string) => {
      await db().hdel(k, id);
    },
  };
}

/** `update` applies `fn` atomically (it may run more than once, so keep it pure); return null from `fn` to leave the record unchanged. */
export function collection<T extends object>(name: string) {
  const local = fileCollection<T>(name);
  const shared = redisCollection<T>(name);
  return {
    get: (id: string) => (redis() ? shared : local).get(id),
    all: () => (redis() ? shared : local).all(),
    put: (id: string, value: T) => (redis() ? shared : local).put(id, value),
    /** Writes many new records in one go (no compare-and-set: only for records nobody else can touch yet). */
    putMany: (entries: Record<string, T>) => (redis() ? shared : local).putMany(entries),
    update: (id: string, fn: (cur: T) => T | null) => (redis() ? shared : local).update(id, fn),
    remove: (id: string) => (redis() ? shared : local).remove(id),
  };
}

export const newId = (bytes = 4) => crypto.randomBytes(bytes).toString("hex");
