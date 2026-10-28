import type { TabName } from "../schema";

/** A row as read from the sheet: every cell comes back as text. */
export type RawRow = Record<string, string>;
/** A row as written: numbers and booleans keep their type in the sheet. */
export type WriteRow = Record<string, string | number | boolean | null | undefined>;

export interface Driver {
  /** Read every data row of a tab (header row excluded). */
  read(tab: TabName): Promise<RawRow[]>;
  /** Read several tabs in one round trip. */
  readMany<T extends TabName>(tabs: T[]): Promise<Record<T, RawRow[]>>;
  /** Append one or more rows. */
  append(tab: TabName, rows: WriteRow[]): Promise<void>;
  /** Replace the row whose `id` matches. Throws if not found. */
  update(tab: TabName, id: string, row: WriteRow): Promise<void>;
  /** Hard-delete a row (used only for config tables such as Assignments). */
  remove(tab: TabName, id: string): Promise<void>;
  /** Create missing tabs and write header rows. Safe to run repeatedly. */
  ensureSchema(): Promise<string[]>;
}
