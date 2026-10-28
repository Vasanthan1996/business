/**
 * Financial report & share calculator engine. Pure functions — no I/O — so
 * the same code runs on the server for reports and in tests.
 *
 * Rules (match the current Aura sheet):
 *  - A booking's full amount is revenue on its CHECK-IN date.
 *  - Revenue = bookings checked in this month + other income dated this month.
 *  - Net profit = revenue − expenses (Rent, Staff salary, Maintenance, Others).
 *  - If net profit > 0: manager gets manager_share_pct %, the rest is the
 *    investor pool, split by each investor's share_pct (must total 100).
 *  - If net profit ≤ 0: nobody is paid; the loss is reported, not distributed.
 */
import { addDays, daysInMonth, diffDays, inMonth } from "./dates";
import type {
  Booking, Business, Expense, ExpenseCategory, Income, Shareholder, Unit,
} from "./types";

export interface PayoutLine {
  id: string;
  name: string;
  role: "MANAGER" | "INVESTOR";
  pct_of_profit: number;
  pct_of_pool?: number;
  amount: number;
}

export interface MonthlyReport {
  business_id: string;
  business_name: string;
  month: string;
  revenue: {
    total: number;
    bookings: number;
    other_income: number;
    by_channel: { channel: string; amount: number; count: number }[];
    by_unit: { unit_id: string; unit: string; floor_label: string; amount: number; nights: number }[];
    by_income_category: { category: string; amount: number }[];
  };
  expenses: {
    total: number;
    by_category: { category: ExpenseCategory; amount: number }[];
  };
  net_profit: number;
  margin_pct: number;
  manager_share_pct: number;
  manager_share: number;
  investor_pool: number;
  payouts: PayoutLine[];
  warnings: string[];
  occupancy?: {
    room_nights_booked: number;
    room_nights_available: number;
    pct: number;
    adr: number; // average daily rate
  };
  daily: { date: string; revenue: number; expenses: number }[];
  counts: { bookings: number; income: number; expenses: number };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Nights of a stay that fall inside the month (checkout day exclusive). */
export function nightsInMonth(b: Pick<Booking, "check_in" | "check_out">, month: string): number {
  const start = `${month}-01`;
  const end = addDays(`${month}-${String(daysInMonth(month)).padStart(2, "0")}`, 1);
  const from = b.check_in > start ? b.check_in : start;
  const to = b.check_out < end ? b.check_out : end;
  return Math.max(0, diffDays(from, to));
}

export function computeMonthlyReport(input: {
  business: Business;
  month: string;
  units: Unit[];
  bookings: Booking[];
  income: Income[];
  expenses: Expense[];
  shareholders: Shareholder[];
  managerName?: string;
}): MonthlyReport {
  const { business, month } = input;
  const warnings: string[] = [];

  const bookings = input.bookings.filter(
    (b) => !b.is_deleted && b.business_id === business.id && inMonth(b.check_in, month),
  );
  const income = input.income.filter(
    (i) => !i.is_deleted && i.business_id === business.id && inMonth(i.date, month),
  );
  const expenses = input.expenses.filter(
    (e) => !e.is_deleted && e.business_id === business.id && inMonth(e.date, month),
  );
  const units = input.units.filter((u) => u.business_id === business.id && u.status !== "INACTIVE");

  const bookingRevenue = bookings.reduce((s, b) => s + b.amount, 0);
  const otherIncome = income.reduce((s, i) => s + i.amount, 0);
  const revenue = bookingRevenue + otherIncome;

  const byChannel = new Map<string, { amount: number; count: number }>();
  for (const b of bookings) {
    const k = b.channel || "Direct";
    const c = byChannel.get(k) ?? { amount: 0, count: 0 };
    c.amount += b.amount;
    c.count += 1;
    byChannel.set(k, c);
  }

  const byIncomeCat = new Map<string, number>();
  for (const i of income) byIncomeCat.set(i.category || "Other", (byIncomeCat.get(i.category || "Other") ?? 0) + i.amount);

  const cats: ExpenseCategory[] = ["RENT", "SALARY", "MAINTENANCE", "OTHERS"];
  const byCat = cats.map((category) => ({
    category,
    amount: expenses.filter((e) => e.category === category).reduce((s, e) => s + e.amount, 0),
  }));
  const expenseTotal = byCat.reduce((s, c) => s + c.amount, 0);

  const net = revenue - expenseTotal;
  const mgrPct = business.manager_share_pct;
  const managerShare = net > 0 ? round2((net * mgrPct) / 100) : 0;
  const pool = net > 0 ? round2(net - managerShare) : 0;

  const investors = input.shareholders.filter(
    (s) => s.business_id === business.id && s.status !== "INACTIVE",
  );
  const poolPctTotal = investors.reduce((s, i) => s + i.share_pct, 0);
  if (investors.length === 0) warnings.push("No investors are set up, so the investor pool isn't assigned to anyone.");
  else if (Math.abs(poolPctTotal - 100) > 0.01)
    warnings.push(`Investor shares add up to ${poolPctTotal}% instead of 100%. Fix them in Businesses → Shares.`);
  if (expenses.length === 0 && revenue > 0)
    warnings.push("No expenses are logged for this month yet, so net profit equals revenue.");
  if (net <= 0 && (revenue > 0 || expenseTotal > 0))
    warnings.push("This month made a loss, so no profit share is paid out.");

  const payouts: PayoutLine[] = [
    {
      id: "manager",
      name: input.managerName || "Operating partner",
      role: "MANAGER",
      pct_of_profit: mgrPct,
      amount: managerShare,
    },
    ...investors.map((i) => ({
      id: i.id,
      name: i.name,
      role: "INVESTOR" as const,
      pct_of_pool: i.share_pct,
      pct_of_profit: round2(((100 - mgrPct) * i.share_pct) / 100),
      amount: round2((pool * i.share_pct) / 100),
    })),
  ];

  // Occupancy (resorts only).
  let occupancy: MonthlyReport["occupancy"];
  const byUnit = units.map((u) => ({
    unit_id: u.id,
    unit: u.name,
    floor_label: u.floor_label,
    amount: 0,
    nights: 0,
  }));
  if (business.type === "RESORT") {
    const stays = input.bookings.filter((b) => !b.is_deleted && b.business_id === business.id);
    let booked = 0;
    for (const b of stays) {
      const n = nightsInMonth(b, month);
      booked += n;
      const row = byUnit.find((r) => r.unit_id === b.unit_id);
      if (row) row.nights += n;
    }
    for (const b of bookings) {
      const row = byUnit.find((r) => r.unit_id === b.unit_id);
      if (row) row.amount += b.amount;
    }
    const available = units.length * daysInMonth(month);
    const nightsSold = bookings.reduce((s, b) => s + b.nights, 0);
    occupancy = {
      room_nights_booked: booked,
      room_nights_available: available,
      pct: available ? round2((booked / available) * 100) : 0,
      adr: nightsSold ? round2(bookingRevenue / nightsSold) : 0,
    };
  }

  // Daily series.
  const days = daysInMonth(month);
  const daily = Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    return {
      date,
      revenue:
        bookings.filter((b) => b.check_in === date).reduce((s, b) => s + b.amount, 0) +
        income.filter((x) => x.date === date).reduce((s, x) => s + x.amount, 0),
      expenses: expenses.filter((e) => e.date === date).reduce((s, e) => s + e.amount, 0),
    };
  });

  return {
    business_id: business.id,
    business_name: business.name,
    month,
    revenue: {
      total: round2(revenue),
      bookings: round2(bookingRevenue),
      other_income: round2(otherIncome),
      by_channel: [...byChannel].map(([channel, v]) => ({ channel, ...v })).sort((a, b) => b.amount - a.amount),
      by_unit: byUnit,
      by_income_category: [...byIncomeCat].map(([category, amount]) => ({ category, amount })),
    },
    expenses: { total: round2(expenseTotal), by_category: byCat },
    net_profit: round2(net),
    margin_pct: revenue ? round2((net / revenue) * 100) : 0,
    manager_share_pct: mgrPct,
    manager_share: managerShare,
    investor_pool: pool,
    payouts,
    warnings,
    occupancy,
    daily,
    counts: { bookings: bookings.length, income: income.length, expenses: expenses.length },
  };
}
