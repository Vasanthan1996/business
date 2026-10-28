import { promises as fs } from "fs";
import path from "path";
import { TABS, type TabName } from "../schema";
import type { Driver, RawRow, WriteRow } from "./driver";

/**
 * Local JSON-file driver for development and demos (DB_DRIVER=local).
 * Mirrors the Sheets driver exactly: same tabs, same text-only rows.
 * Not for Vercel — serverless file systems are read-only.
 */
const FILE = process.env.LOCAL_DB_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "db.json");

type Db = Record<string, RawRow[]>;

function asText(r: WriteRow): RawRow {
  const out: RawRow = {};
  for (const [k, v] of Object.entries(r)) out[k] = v === null || v === undefined ? "" : String(v);
  return out;
}

let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

async function load(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
  } catch {
    return {};
  }
}
async function save(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

export class LocalDriver implements Driver {
  async read(tab: TabName) {
    return (await load())[tab] ?? [];
  }
  async readMany<T extends TabName>(tabs: T[]) {
    const db = await load();
    const out = {} as Record<T, RawRow[]>;
    for (const t of tabs) out[t] = db[t] ?? [];
    return out;
  }
  append(tab: TabName, rows: WriteRow[]) {
    return serial(async () => {
      const db = await load();
      db[tab] = [...(db[tab] ?? []), ...rows.map(asText)];
      await save(db);
    });
  }
  update(tab: TabName, id: string, row: WriteRow) {
    return serial(async () => {
      const db = await load();
      const rows = db[tab] ?? [];
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new Error(`${tab} row ${id} not found`);
      rows[i] = asText(row);
      await save(db);
    });
  }
  remove(tab: TabName, id: string) {
    return serial(async () => {
      const db = await load();
      db[tab] = (db[tab] ?? []).filter((r) => r.id !== id);
      await save(db);
    });
  }
  ensureSchema() {
    return serial(async () => {
      const db = await load();
      const created: string[] = [];
      for (const t of Object.keys(TABS)) {
        if (!db[t]) {
          db[t] = [];
          created.push(t);
        }
      }
      await save(db);
      return created;
    });
  }
}
