import "server-only";
import { many } from "./db";
import { computeMonthlyReport, type MonthlyReport } from "./finance";
import { shiftMonth } from "./dates";
import type { Business } from "./types";

async function loadAll() {
  return many([
    "Businesses", "Units", "Bookings", "Income", "Expenses", "Shareholders",
    "Assignments", "Users", "Periods",
  ]);
}
type All = Awaited<ReturnType<typeof loadAll>>;

function managerName(all: All, businessId: string): string {
  const a = all.Assignments.find((x) => x.business_id === businessId && x.access === "MANAGE");
  return all.Users.find((u) => u.id === a?.user_id)?.name || "Operating partner";
}

function reportFrom(all: All, business: Business, month: string): MonthlyReport {
  return computeMonthlyReport({
    business,
    month,
    units: all.Units,
    bookings: all.Bookings,
    income: all.Income,
    expenses: all.Expenses,
    shareholders: all.Shareholders,
    managerName: managerName(all, business.id),
  });
}

export async function buildReport(businessId: string, month: string) {
  const all = await loadAll();
  const business = all.Businesses.find((b) => b.id === businessId);
  if (!business) return null;
  const report = reportFrom(all, business, month);
  const period = all.Periods.find((p) => p.business_id === businessId && p.month === month);
  const trend = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(month, i - 5);
    const r = reportFrom(all, business, m);
    return { month: m, revenue: r.revenue.total, expenses: r.expenses.total, net: r.net_profit };
  });
  return { report, locked: period?.status === "LOCKED", lockedBy: period?.locked_by ?? "", trend };
}

/** Summary across every business the viewer can see, for the dashboard. */
export async function buildPortfolio(businessIds: Set<string>, month: string, viewerId: string) {
  const all = await loadAll();
  const businesses = all.Businesses.filter((b) => businessIds.has(b.id) && b.status !== "ARCHIVED");
  const rows = businesses.map((b) => {
    const r = reportFrom(all, b, month);
    const prev = reportFrom(all, b, shiftMonth(month, -1));
    const spark = Array.from({ length: 6 }, (_, i) => reportFrom(all, b, shiftMonth(month, i - 5)).net_profit);
    const myLine = r.payouts.find((p) => {
      if (p.role !== "INVESTOR") return false;
      return all.Shareholders.find((s) => s.id === p.id)?.user_id === viewerId;
    });
    return {
      business: b,
      revenue: r.revenue.total,
      expenses: r.expenses.total,
      net: r.net_profit,
      prev_net: prev.net_profit,
      manager_share: r.manager_share,
      investor_pool: r.investor_pool,
      my_payout: myLine?.amount ?? 0,
      occupancy: r.occupancy?.pct ?? null,
      warnings: r.warnings,
      spark,
      unit_count: all.Units.filter((u) => u.business_id === b.id && u.status !== "INACTIVE").length,
    };
  });
  const totals = rows.reduce(
    (t, r) => ({
      revenue: t.revenue + r.revenue,
      expenses: t.expenses + r.expenses,
      net: t.net + r.net,
      prev_net: t.prev_net + r.prev_net,
      my_payout: t.my_payout + r.my_payout,
      investor_pool: t.investor_pool + r.investor_pool,
      manager_share: t.manager_share + r.manager_share,
    }),
    { revenue: 0, expenses: 0, net: 0, prev_net: 0, my_payout: 0, investor_pool: 0, manager_share: 0 },
  );
  return { month, rows, totals };
}
