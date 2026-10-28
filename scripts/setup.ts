/**
 * One-time setup:  npm run setup
 *
 * 1. Creates every tab with its header row (safe to re-run).
 * 2. Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
 *    if no admin exists yet.
 * 3. Seeds the three businesses, Aura's rooms, the admin as Aura's 100%
 *    investor, and the October 2026 bookings — only into empty tabs.
 *
 * Works with whichever driver your env selects (Google Sheets or local file).
 */
import bcrypt from "bcryptjs";
import { LocalDriver } from "../src/lib/db/local";
import type { Driver, RawRow } from "../src/lib/db/driver";
import {
  OCT_2026_EXPECTED_TOTAL, SEED_BOOKINGS, SEED_BUSINESSES, SEED_UNITS,
} from "./seed-data";

async function getDriver(): Promise<Driver> {
  const kind = process.env.DB_DRIVER ?? (process.env.GOOGLE_SHEET_ID ? "sheets" : "local");
  if (kind === "sheets") {
    const { SheetsDriver } = await import("../src/lib/db/sheets");
    return new SheetsDriver();
  }
  return new LocalDriver();
}

const now = new Date().toISOString();
const empty = (rows: RawRow[]) => rows.length === 0;

async function main() {
  const db = await getDriver();
  console.log(`Using ${db.constructor.name}`);

  const created = await db.ensureSchema();
  console.log(created.length ? `Created tabs: ${created.join(", ")}` : "All tabs already exist.");

  // Admin account
  const users = await db.read("Users");
  let admin = users.find((u) => u.role === "ADMIN");
  if (!admin) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 8) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) to create the admin account.");
    }
    admin = {
      id: "USR-ADMIN",
      name: process.env.ADMIN_NAME || "Admin",
      email,
      password_hash: await bcrypt.hash(password, 10),
      role: "ADMIN",
      status: "ACTIVE",
      phone: "",
      created_at: now,
      updated_at: now,
      last_login_at: "",
    };
    await db.append("Users", [admin]);
    console.log(`Admin created: ${email}`);
  } else {
    console.log(`Admin already exists: ${admin.email}`);
  }

  if (empty(await db.read("Businesses"))) {
    await db.append("Businesses", SEED_BUSINESSES.map((b) => ({ ...b, created_at: now, updated_at: now })));
    console.log(`Seeded ${SEED_BUSINESSES.length} businesses`);
  }
  if (empty(await db.read("Units"))) {
    await db.append("Units", SEED_UNITS.map((u) => ({ ...u, created_at: now })));
    console.log(`Seeded ${SEED_UNITS.length} rooms`);
  }
  if (empty(await db.read("Shareholders"))) {
    await db.append("Shareholders", [
      {
        id: "SH-AURA-ADMIN",
        business_id: "BIZ-AURA",
        user_id: admin.id,
        name: admin.name,
        share_pct: 100,
        status: "ACTIVE",
        created_at: now,
        updated_at: now,
      },
    ]);
    console.log("Seeded Aura investor: admin holds 100% of the investor pool");
  }
  if (empty(await db.read("Bookings"))) {
    await db.append(
      "Bookings",
      SEED_BOOKINGS.map((b) => ({
        ...b,
        created_by: admin!.id,
        created_at: now,
        updated_by: "",
        updated_at: "",
      })),
    );
    const total = SEED_BOOKINGS.reduce((s, b) => s + b.amount, 0);
    console.log(`Seeded ${SEED_BOOKINGS.length} October bookings, total ₹${total.toLocaleString("en-IN")}`);
    if (total !== OCT_2026_EXPECTED_TOTAL) throw new Error(`Migration total ${total} ≠ sheet total ${OCT_2026_EXPECTED_TOTAL}`);
  }
  console.log("Setup complete.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
