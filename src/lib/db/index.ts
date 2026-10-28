import "server-only";
import type { Driver, RawRow, WriteRow } from "./driver";
import type { TabName } from "../schema";
import type {
  AuditEntry, Assignment, Booking, Business, Expense, Income, Period,
  Shareholder, Unit, User,
} from "../types";

let driver: Driver | null = null;

export async function getDriver(): Promise<Driver> {
  if (driver) return driver;
  const kind = process.env.DB_DRIVER ?? (process.env.GOOGLE_SHEET_ID ? "sheets" : "local");
  if (kind === "sheets") {
    const { SheetsDriver } = await import("./sheets");
    driver = new SheetsDriver();
  } else {
    const { LocalDriver } = await import("./local");
    driver = new LocalDriver();
  }
  return driver;
}

/* ---------- text <-> typed conversion ---------- */

const num = (v: string) => (v === "" || v === undefined ? 0 : Number(v));
const bool = (v: string) => v === "TRUE" || v === "true" || v === "1";

/** Sheets returns date cells as serial numbers if someone types a date by hand. */
function date(v: string): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const n = Number(v);
  if (!Number.isNaN(n) && n > 20000 && n < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return v;
}

export const parse = {
  Users: (r: RawRow): User => ({ ...(r as unknown as User) }),
  Businesses: (r: RawRow): Business => ({
    ...(r as unknown as Business),
    manager_share_pct: num(r.manager_share_pct),
    currency: r.currency || "INR",
  }),
  Units: (r: RawRow): Unit => ({
    ...(r as unknown as Unit),
    floor: num(r.floor),
    base_rate: num(r.base_rate),
    sort: num(r.sort),
  }),
  Assignments: (r: RawRow): Assignment => ({ ...(r as unknown as Assignment) }),
  Shareholders: (r: RawRow): Shareholder => ({
    ...(r as unknown as Shareholder),
    share_pct: num(r.share_pct),
  }),
  Bookings: (r: RawRow): Booking => ({
    ...(r as unknown as Booking),
    check_in: date(r.check_in),
    check_out: date(r.check_out),
    nights: num(r.nights),
    amount: num(r.amount),
    is_deleted: bool(r.is_deleted),
  }),
  Income: (r: RawRow): Income => ({
    ...(r as unknown as Income),
    date: date(r.date),
    amount: num(r.amount),
    is_deleted: bool(r.is_deleted),
  }),
  Expenses: (r: RawRow): Expense => ({
    ...(r as unknown as Expense),
    date: date(r.date),
    amount: num(r.amount),
    is_deleted: bool(r.is_deleted),
  }),
  Periods: (r: RawRow): Period => ({ ...(r as unknown as Period) }),
  AuditLog: (r: RawRow): AuditEntry => ({ ...(r as unknown as AuditEntry) }),
} satisfies Record<TabName, (r: RawRow) => unknown>;

export type Parsed<T extends TabName> = ReturnType<(typeof parse)[T]>;

export async function all<T extends TabName>(tab: T): Promise<Parsed<T>[]> {
  const d = await getDriver();
  const rows = await d.read(tab);
  return rows.map((r) => parse[tab](r) as Parsed<T>);
}

export async function many<T extends TabName>(tabs: T[]): Promise<{ [K in T]: Parsed<K>[] }> {
  const d = await getDriver();
  const raw = await d.readMany(tabs);
  const out = {} as { [K in T]: Parsed<K>[] };
  for (const t of tabs) {
    (out as Record<string, unknown>)[t] = raw[t].map((r) => parse[t](r));
  }
  return out;
}

export async function findById<T extends TabName>(tab: T, id: string): Promise<Parsed<T> | null> {
  return ((await all(tab)) as Array<Parsed<T> & { id: string }>).find((r) => r.id === id) ?? null;
}

export async function insert(tab: TabName, row: object): Promise<void> {
  await (await getDriver()).append(tab, [row as WriteRow]);
}
export async function insertMany(tab: TabName, rows: object[]): Promise<void> {
  await (await getDriver()).append(tab, rows as WriteRow[]);
}
export async function replace(tab: TabName, id: string, row: object): Promise<void> {
  await (await getDriver()).update(tab, id, row as WriteRow);
}
export async function hardDelete(tab: TabName, id: string): Promise<void> {
  await (await getDriver()).remove(tab, id);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}
export const nowIso = () => new Date().toISOString();
