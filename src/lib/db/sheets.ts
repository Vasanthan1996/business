import { google, type sheets_v4 } from "googleapis";
import { TABS, type TabName } from "../schema";
import type { Driver, RawRow, WriteRow } from "./driver";

/**
 * Google Sheets driver.
 *
 * - Authenticates with a Google Cloud service account (share the spreadsheet
 *   with the service-account email as Editor).
 * - Writes with valueInputOption=RAW so text a manager types (e.g. "=SUM(...)")
 *   is stored literally and can never run as a formula.
 * - Keeps a short in-memory cache per tab to stay well inside the Sheets API
 *   quota (60 reads/minute/user). Any write clears the cache for that tab.
 */

const CACHE_TTL_MS = 5_000;

function getClient(): sheets_v4.Sheets {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, or use DB_DRIVER=local for development.",
    );
  }
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function toCell(v: WriteRow[string]): string | number | boolean {
  if (v === null || v === undefined) return "";
  return v;
}

function rowsFromValues(values: unknown[][] | null | undefined): RawRow[] {
  if (!values || values.length === 0) return [];
  const [header, ...rest] = values;
  const keys = header.map((h) => String(h).trim());
  return rest
    .filter((r) => r.some((c) => c !== "" && c !== null && c !== undefined))
    .map((r) => {
      const obj: RawRow = {};
      keys.forEach((k, i) => {
        const c = r[i];
        obj[k] = c === undefined || c === null ? "" : String(c);
      });
      return obj;
    });
}

export class SheetsDriver implements Driver {
  private sheets = getClient();
  private spreadsheetId: string;
  private cache = new Map<TabName, { at: number; rows: RawRow[] }>();
  private headers = new Map<TabName, string[]>();

  constructor() {
    const id = process.env.GOOGLE_SHEET_ID;
    if (!id) throw new Error("GOOGLE_SHEET_ID is not set.");
    this.spreadsheetId = id;
  }

  private async headerFor(tab: TabName): Promise<string[]> {
    const cached = this.headers.get(tab);
    if (cached) return cached;
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!1:1`,
    });
    const header = (res.data.values?.[0] ?? TABS[tab]).map(String);
    this.headers.set(tab, header);
    return header;
  }

  async read(tab: TabName): Promise<RawRow[]> {
    return (await this.readMany([tab]))[tab];
  }

  async readMany<T extends TabName>(tabs: T[]): Promise<Record<T, RawRow[]>> {
    const now = Date.now();
    const out = {} as Record<T, RawRow[]>;
    const missing: T[] = [];
    for (const t of tabs) {
      const c = this.cache.get(t);
      if (c && now - c.at < CACHE_TTL_MS) out[t] = c.rows;
      else missing.push(t);
    }
    if (missing.length) {
      const res = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: missing.map((t) => `${t}!A1:ZZ`),
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      res.data.valueRanges?.forEach((vr, i) => {
        const tab = missing[i];
        const values = vr.values as unknown[][] | undefined;
        if (values?.[0]) this.headers.set(tab, values[0].map(String));
        const rows = rowsFromValues(values);
        this.cache.set(tab, { at: now, rows });
        out[tab] = rows;
      });
    }
    return out;
  }

  async append(tab: TabName, rows: WriteRow[]): Promise<void> {
    if (rows.length === 0) return;
    const header = await this.headerFor(tab);
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows.map((r) => header.map((h) => toCell(r[h]))) },
    });
    this.cache.delete(tab);
  }

  /** 1-based sheet row number of the row with this id (header is row 1). */
  private async rowNumber(tab: TabName, id: string): Promise<number> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!A:A`,
    });
    const col = res.data.values ?? [];
    const idx = col.findIndex((r, i) => i > 0 && String(r[0]) === id);
    if (idx < 0) throw new Error(`${tab} row ${id} not found`);
    return idx + 1;
  }

  async update(tab: TabName, id: string, row: WriteRow): Promise<void> {
    const header = await this.headerFor(tab);
    const n = await this.rowNumber(tab, id);
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!A${n}`,
      valueInputOption: "RAW",
      requestBody: { values: [header.map((h) => toCell(row[h]))] },
    });
    this.cache.delete(tab);
  }

  async remove(tab: TabName, id: string): Promise<void> {
    const n = await this.rowNumber(tab, id);
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties",
    });
    const sheetId = meta.data.sheets?.find((s) => s.properties?.title === tab)
      ?.properties?.sheetId;
    if (sheetId === undefined || sheetId === null) throw new Error(`Tab ${tab} missing`);
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: n - 1, endIndex: n },
            },
          },
        ],
      },
    });
    this.cache.delete(tab);
  }

  async ensureSchema(): Promise<string[]> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties",
    });
    const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title));
    const created: string[] = [];
    const toAdd = (Object.keys(TABS) as TabName[]).filter((t) => !existing.has(t));
    if (toAdd.length) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: toAdd.map((title) => ({
            addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
          })),
        },
      });
      created.push(...toAdd);
    }
    // Write any header row that is empty.
    for (const tab of Object.keys(TABS) as TabName[]) {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${tab}!1:1`,
      });
      if (!res.data.values?.[0]?.length) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${tab}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [[...TABS[tab]]] },
        });
      }
    }
    this.headers.clear();
    this.cache.clear();
    return created;
  }
}
