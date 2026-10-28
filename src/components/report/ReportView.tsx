"use client";
import { useState } from "react";
import { Download, Lock, Printer, Unlock } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api, useApi } from "@/lib/client";
import { CATEGORY_LABEL, CHANNEL_COLOR, inr, inrShort, pct } from "@/lib/format";
import { monthLabel } from "@/lib/dates";
import type { MonthlyReport } from "@/lib/finance";
import { ProfitStack } from "./ProfitStack";
import { Button } from "../ui/Button";
import { ErrorNote, Loading, Warning } from "../ui/Misc";
import { useToast } from "../ui/Toast";

interface ReportResponse {
  report: MonthlyReport;
  locked: boolean;
  lockedBy: string;
  trend: { month: string; revenue: number; expenses: number; net: number }[];
}

export function ReportView({ businessId, month, isAdmin, refreshKey = 0 }: {
  businessId: string; month: string; isAdmin: boolean; refreshKey?: number;
}) {
  const { data, error, loading, reload } = useApi<ReportResponse>(
    `/api/reports?businessId=${businessId}&month=${month}&k=${refreshKey}`,
  );
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (loading && !data) return <Loading label="Building the report" />;
  if (!data) return null;
  const r = data.report;
  const manager = r.payouts.find((p) => p.role === "MANAGER")!;
  const investors = r.payouts.filter((p) => p.role === "INVESTOR");

  async function toggleLock() {
    setBusy(true);
    try {
      await api("POST", `/api/businesses/${businessId}/periods`, { month, status: data!.locked ? "OPEN" : "LOCKED" });
      toast(data!.locked ? `${monthLabel(month)} unlocked` : `${monthLabel(month)} locked`);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't change the lock", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-2">
        {data.locked ? (
          <span className="flex items-center gap-1.5 rounded-full bg-manager/15 px-3 py-1.5 text-sm">
            <Lock className="size-3.5 text-manager" /> Locked{data.lockedBy ? ` by ${data.lockedBy}` : ""}. Managers can&apos;t change this month.
          </span>
        ) : (
          <span className="text-sm text-muted">Open for changes</span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {isAdmin && (
            <Button variant="soft" size="sm" busy={busy} onClick={toggleLock}>
              {data.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
              {data.locked ? "Unlock month" : "Lock month"}
            </Button>
          )}
          <Button variant="soft" size="sm" onClick={() => downloadCsv(r)}><Download className="size-3.5" /> Download CSV</Button>
          <Button variant="soft" size="sm" onClick={() => window.print()}><Printer className="size-3.5" /> Print or save PDF</Button>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-semibold">{r.business_name}</h1>
        <p className="text-sm text-muted">Monthly report, {monthLabel(month)}</p>
      </div>

      {r.warnings.length > 0 && <div className="space-y-2">{r.warnings.map((w) => <Warning key={w}>{w}</Warning>)}</div>}

      <section className="glass rounded-[28px] p-5 sm:p-7">
        <ProfitStack
          revenue={r.revenue.total}
          expenses={r.expenses.total}
          net={r.net_profit}
          managerShare={r.manager_share}
          managerPct={r.manager_share_pct}
          managerName={manager.name}
          investors={investors.map((i) => ({ name: i.name, amount: i.amount }))}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Revenue" value={inr(r.revenue.total)} color="var(--revenue)"
          note={r.revenue.other_income ? `${inrShort(r.revenue.bookings)} stays + ${inrShort(r.revenue.other_income)} other` : `${r.counts.bookings + r.counts.income} entries`} />
        <Kpi label="Expenses" value={inr(r.expenses.total)} color="var(--expense)" note={`${r.counts.expenses} entries`} />
        <Kpi label="Net profit" value={inr(r.net_profit)} color="var(--profit)" note={`${pct(r.margin_pct)} margin`} />
        {r.occupancy ? (
          <Kpi label="Occupancy" value={pct(r.occupancy.pct)} color="var(--investor)"
            note={`${r.occupancy.room_nights_booked} of ${r.occupancy.room_nights_available} room-nights, ${inr(r.occupancy.adr)} per night`} />
        ) : (
          <Kpi label="Investor pool" value={inr(r.investor_pool)} color="var(--investor)" note={`${100 - r.manager_share_pct}% of profit`} />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Panel title="Day by day" className="lg:col-span-3">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={r.daily.map((d) => ({ ...d, day: Number(d.date.slice(8)) }))} margin={{ left: -12, right: 4, top: 8 }} barGap={1} barCategoryGap="12%">
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} interval={2} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v) => inrShort(v)} />
                <Tooltip content={<Tip labelPrefix="Day " />} cursor={{ fill: "var(--line)" }} />
                <Bar dataKey="revenue" name="Revenue" fill="var(--revenue)" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--expense)" radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Last 6 months" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer>
              <ComposedChart data={data.trend.map((t) => ({ ...t, m: monthLabel(t.month).slice(0, 3) }))} margin={{ left: -12, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(v) => inrShort(v)} />
                <Tooltip content={<Tip />} cursor={{ fill: "var(--line)" }} />
                <Bar dataKey="revenue" name="Revenue" fill="var(--revenue)" opacity={0.35} radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Line dataKey="net" name="Net profit" stroke="var(--profit)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--profit)" }} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Expense breakup">
          <Bars
            rows={r.expenses.by_category.map((c) => ({ label: CATEGORY_LABEL[c.category], amount: c.amount, color: "var(--expense)" }))}
            empty="No expenses logged yet."
          />
        </Panel>
        {r.occupancy ? (
          <Panel title="Revenue by floor and channel">
            <Bars rows={r.revenue.by_unit.map((u) => ({ label: `${u.floor_label} (${u.nights} nights)`, amount: u.amount, color: "var(--revenue)" }))} empty="No stays this month." />
            <div className="mt-5 border-t border-line pt-4">
              <Bars rows={r.revenue.by_channel.map((c) => ({ label: `${c.channel} (${c.count})`, amount: c.amount, color: CHANNEL_COLOR[c.channel] ?? "var(--muted)" }))} empty="" />
            </div>
          </Panel>
        ) : (
          <Panel title="Income by category">
            <Bars rows={r.revenue.by_income_category.map((c) => ({ label: c.category, amount: c.amount, color: "var(--revenue)" }))} empty="No income logged yet." />
          </Panel>
        )}
      </section>

      <Panel title="Payout">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="py-2 font-medium">Who</th>
              <th className="py-2 font-medium">Basis</th>
              <th className="py-2 text-right font-medium">Share of profit</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {r.payouts.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: p.role === "MANAGER" ? "var(--manager)" : "var(--investor)" }} />
                    {p.name}
                  </span>
                </td>
                <td className="py-2.5 text-muted">{p.role === "MANAGER" ? "Operating partner" : `${pct(p.pct_of_pool ?? 0)} of investor pool`}</td>
                <td className="num py-2.5 text-right">{pct(p.pct_of_profit)}</td>
                <td className="num py-2.5 text-right font-semibold">{inr(p.amount, true)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 font-medium" colSpan={3}>Net profit distributed</td>
              <td className="num pt-3 text-right font-semibold">{inr(r.payouts.reduce((s, p) => s + p.amount, 0), true)}</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Kpi({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <div className="glass rounded-3xl p-4">
      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="h-3 w-1 rounded-full" style={{ background: color }} />{label}
      </p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-[28px] p-5 ${className}`}>
      <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Bars({ rows, empty }: { rows: { label: string; amount: number; color: string }[]; empty: string }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  if (rows.every((r) => r.amount === 0)) return empty ? <p className="text-sm text-muted">{empty}</p> : null;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-muted">{r.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full" style={{ width: `${(r.amount / max) * 100}%`, background: r.color }} />
          </div>
          <span className="num w-24 text-right font-medium">{inr(r.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function Tip({ active, payload, label, labelPrefix = "" }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string | number; labelPrefix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 font-medium">{labelPrefix}{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="num font-semibold">{inr(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function downloadCsv(r: MonthlyReport) {
  const lines: (string | number)[][] = [
    ["Business", r.business_name], ["Month", r.month], [],
    ["Revenue", r.revenue.total], ["  From stays", r.revenue.bookings], ["  Other income", r.revenue.other_income],
    ["Expenses", r.expenses.total],
    ...r.expenses.by_category.map((c) => [`  ${CATEGORY_LABEL[c.category]}`, c.amount]),
    ["Net profit", r.net_profit], ["Margin %", r.margin_pct], [],
    ["Payout", "Role", "% of profit", "Amount"],
    ...r.payouts.map((p) => [p.name, p.role === "MANAGER" ? "Manager" : "Investor", p.pct_of_profit, p.amount]),
    [], ["Date", "Revenue", "Expenses"],
    ...r.daily.map((d) => [d.date, d.revenue, d.expenses]),
  ];
  const csv = lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.business_name.replace(/[^\w]+/g, "_")}_${r.month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
