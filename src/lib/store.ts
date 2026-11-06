import "server-only";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * Tiny JSON-file store (one file per collection). Good enough for the hackathon;
 * every write goes through a single queue so read-modify-write stays atomic.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

// Shared across hot reloads; still one process only — run a single instance (or move to a database).
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

export function collection<T extends object>(name: string) {
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
    /** Applies `fn` to the current value atomically; return null from `fn` to leave it unchanged. */
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

export const newId = (bytes = 4) => crypto.randomBytes(bytes).toString("hex");
