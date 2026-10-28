import "server-only";
import type { z } from "zod";
import { all, findById, insert, newId, nowIso, replace } from "./db";
import { bookingInput, expenseInput, incomeInput } from "./validation";
import { HttpError } from "./http";
import { diffDays } from "./dates";
import type { Booking, EntryKind, Expense, Income } from "./types";

type Entry = Booking | Income | Expense;

interface KindConfig {
  tab: "Bookings" | "Income" | "Expenses";
  prefix: string;
  entity: string;
  schema: z.ZodTypeAny;
  dateOf: (e: Record<string, unknown>) => string;
  label: (e: Record<string, unknown>) => string;
}

const EXPENSE_LABEL: Record<string, string> = {
  RENT: "rent", SALARY: "staff salary", MAINTENANCE: "maintenance materials", OTHERS: "other expense",
};
const inr = (n: unknown) => `₹${Number(n).toLocaleString("en-IN")}`;

export const KINDS: Record<EntryKind, KindConfig> = {
  bookings: {
    tab: "Bookings",
    prefix: "BK",
    entity: "Booking",
    schema: bookingInput,
    dateOf: (e) => String(e.check_in),
    label: (e) => `${e.guest_name} ${e.check_in}→${e.check_out} ${inr(e.amount)}`,
  },
  income: {
    tab: "Income",
    prefix: "IN",
    entity: "Income",
    schema: incomeInput,
    dateOf: (e) => String(e.date),
    label: (e) => `${e.category} ${e.date} ${inr(e.amount)}`,
  },
  expenses: {
    tab: "Expenses",
    prefix: "EX",
    entity: "Expense",
    schema: expenseInput,
    dateOf: (e) => String(e.date),
    label: (e) => `${EXPENSE_LABEL[String(e.category)] ?? e.category} ${e.date} ${inr(e.amount)}`,
  },
};

export function kindConfig(kind: string): KindConfig {
  const k = KINDS[kind as EntryKind];
  if (!k) throw new HttpError(404, "Unknown entry type");
  return k;
}

export async function listEntries(kind: EntryKind, businessId: string, month?: string) {
  const cfg = KINDS[kind];
  const rows = (await all(cfg.tab)) as Entry[];
  return rows
    .filter((r) => r.business_id === businessId && !r.is_deleted)
    .filter((r) => {
      if (!month) return true;
      if (kind === "bookings") {
        const b = r as Booking;
        // Any stay touching the month, so the room board shows overlaps.
        return b.check_in.slice(0, 7) <= month && b.check_out.slice(0, 7) >= month;
      }
      return cfg.dateOf(r as unknown as Record<string, unknown>).slice(0, 7) === month;
    })
    .sort((a, b) =>
      cfg.dateOf(a as unknown as Record<string, unknown>).localeCompare(
        cfg.dateOf(b as unknown as Record<string, unknown>),
      ),
    );
}

/** Reject a booking that overlaps another stay in the same room. */
export async function assertNoOverlap(b: { business_id: string; unit_id: string; check_in: string; check_out: string }, ignoreId?: string) {
  const rows = (await all("Bookings")).filter(
    (x) => !x.is_deleted && x.unit_id === b.unit_id && x.business_id === b.business_id && x.id !== ignoreId,
  );
  const clash = rows.find((x) => b.check_in < x.check_out && b.check_out > x.check_in);
  if (clash) {
    throw new HttpError(
      409,
      `That room is already booked by ${clash.guest_name} from ${clash.check_in} to ${clash.check_out}. Pick other dates or another room.`,
    );
  }
}

export async function createEntry(kind: EntryKind, data: Record<string, unknown>, userId: string) {
  const cfg = KINDS[kind];
  const row: Record<string, unknown> = {
    id: newId(cfg.prefix),
    ...data,
    is_deleted: false,
    created_by: userId,
    created_at: nowIso(),
    updated_by: "",
    updated_at: "",
  };
  if (kind === "bookings") {
    row.nights = diffDays(String(data.check_in), String(data.check_out));
    if (!row.channel) row.channel = "Direct";
  }
  await insert(cfg.tab, row);
  return row;
}

export async function getEntry(kind: EntryKind, id: string) {
  const row = await findById(KINDS[kind].tab, id);
  if (!row || (row as Entry).is_deleted) throw new HttpError(404, "That entry no longer exists.");
  return row as Entry;
}

export async function updateEntry(kind: EntryKind, before: Entry, data: Record<string, unknown>, userId: string) {
  const cfg = KINDS[kind];
  const after: Record<string, unknown> = {
    ...before,
    ...data,
    id: before.id,
    business_id: before.business_id,
    updated_by: userId,
    updated_at: nowIso(),
  };
  if (kind === "bookings") after.nights = diffDays(String(after.check_in), String(after.check_out));
  await replace(cfg.tab, before.id, after);
  return after;
}

export async function softDeleteEntry(kind: EntryKind, before: Entry, userId: string) {
  const after = { ...before, is_deleted: true, updated_by: userId, updated_at: nowIso() };
  await replace(KINDS[kind].tab, before.id, after);
  return after;
}
