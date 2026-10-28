# Partner Ledger

Monthly business monitoring and profit-share reports for the businesses we
invest in. Operating partners record bookings, daily income and expenses;
investors see revenue, net profit and their payout as soon as it's entered.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Framer Motion ·
Lucide · Recharts · Google Sheets API (database) · Vercel

## What's in it

- **Three account types** — Admin (investor), Property manager (enters data for
  assigned businesses), Shareholder (read-only). Enforced on every API call.
- **Room board for guest stays** — the building drawn floor by floor; click an
  empty night to add a booking, click a stay to edit it. Overlaps are blocked.
- **Daily income and categorised expenses** — Rent, Staff salary, Maintenance
  materials, Others.
- **Monthly report** — revenue, expense breakup, net profit, occupancy, the
  manager/investor split, 6-month trend; print to PDF or download CSV.
- **Change log** — every add, change and removal with before/after values.
- **Month lock** — freeze a month after payout so it can't be edited.
- **Multi-business** — add new businesses, rooms and investors from the admin screens.
- Light and dark mode, works on phones.

Starting data: THE AURA COMFORT STAY (3 floors, 1 room each) with all 16
October 2026 stays migrated from `AURA VASANTH OCT 26.xlsx` (₹99,937), plus
Generic Adhaar (pharmacy) and ARIVU Institute of AI & Analytics, both in Villupuram.

## Quick start

```bash
npm install
cp .env.example .env.local     # set AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run setup                  # local JSON database with starting data
npm run dev
```

Full Google Sheets + GitHub + Vercel walkthrough: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**
Sheet schema, access rules and calculation rules: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

## Scripts

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run setup` | Create sheet tabs, first admin, starting data (safe to re-run) |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` / `npm run lint` | Checks |

## Next steps worth considering

- **Loss carry-forward**: today a loss month pays nothing and the next month
  starts fresh. If your agreement carries losses forward, add that rule in
  `src/lib/finance.ts`.
- **Receipts**: attach bill photos to expenses (Google Drive upload via the same service account).
- **Payout tracking**: mark each month's payouts as paid, with date and reference.
- **Pharmacy and institute specifics**: stock purchase vs sales for the
  pharmacy; batches and student fee instalments for the institute.
