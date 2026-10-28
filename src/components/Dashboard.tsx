"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/client";
import { BUSINESS_TYPE_LABEL, inr, inrShort, pct } from "@/lib/format";
import { monthLabel } from "@/lib/dates";
import { MonthPicker } from "./ui/MonthPicker";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { Empty, ErrorNote, Loading, Sparkline } from "./ui/Misc";
import { ProfitStack } from "./report/ProfitStack";
import { TYPE_ICON } from "./shell/AppShell";
import type { Business, SessionUser } from "@/lib/types";

interface Row {
  business: Business; revenue: number; expenses: number; net: number; prev_net: number;
  manager_share: number; investor_pool: number; my_payout: number; occupancy: number | null;
  warnings: string[]; spark: number[]; unit_count: number;
}
interface Portfolio {
  month: string; rows: Row[];
  totals: { revenue: number; expenses: number; net: number; prev_net: number; my_payout: number; investor_pool: number; manager_share: number };
}

export function Dashboard({ user, initialMonth }: { user: SessionUser; initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const { data, error, loading } = useApi<Portfolio>(`/api/portfolio?month=${month}`);
  const first = user.name.split(" ").filter((w) => w.length > 2)[0] ?? user.name;

  const t = data?.totals;
  const delta = t ? t.net - t.prev_net : 0;
  const isManager = user.role === "PROPERTY";
  const yourShare = isManager ? t?.manager_share ?? 0 : t?.my_payout ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Hello {first}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{monthLabel(month)}</h1>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data && <Loading label="Adding up the month" />}

      {data && data.rows.length === 0 && (
        <Empty title="No businesses to show yet">
          {user.role === "ADMIN" ? "Add a business from Businesses & shares to start tracking it." : "Your admin hasn't given your account access to a business yet."}
        </Empty>
      )}

      {data && t && data.rows.length > 0 && (
        <>
          <section className="glass rounded-[32px] p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-sm text-muted">
                  Net profit across {data.rows.length} {data.rows.length === 1 ? "business" : "businesses"}
                </p>
                <AnimatedNumber value={t.net} className={`mt-1 block text-5xl font-semibold tracking-tight sm:text-6xl ${t.net < 0 ? "text-expense" : ""}`} />
                {t.prev_net === 0 ? (
                  <p className="mt-2 text-sm text-muted">Nothing was recorded last month to compare with.</p>
                ) : (
                  <p className="mt-2 flex items-center gap-1 text-sm text-muted">
                    {delta >= 0 ? <ArrowUpRight className="size-4 text-profit" /> : <ArrowDownRight className="size-4 text-expense" />}
                    <span className="num">{inr(Math.abs(delta))}</span> {delta >= 0 ? "more" : "less"} than last month
                  </p>
                )}
              </div>
              {(isManager || t.my_payout > 0 || user.role !== "ADMIN") && (
                <div className="rounded-3xl bg-glass-strong px-5 py-4 text-right">
                  <p className="text-sm text-muted">{isManager ? "Your manager share" : "Your share"}</p>
                  <p className={`num text-3xl font-semibold ${isManager ? "text-manager" : "text-investor"}`}>{inr(yourShare)}</p>
                </div>
              )}
            </div>
            <div className="mt-8">
              <ProfitStack
                revenue={t.revenue}
                expenses={t.expenses}
                net={t.net}
                managerShare={t.manager_share}
                managerPct={t.net > 0 ? (t.manager_share / t.net) * 100 : 0}
                managerName="Managers"
                investors={[{ name: "Investors", amount: t.investor_pool }]}
              />
            </div>
          </section>

          <section aria-label="Businesses" className="space-y-3">
            {data.rows.map((r, i) => (
              <BusinessRow key={r.business.id} row={r} index={i} showMine={!isManager} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function BusinessRow({ row, index, showMine }: { row: Row; index: number; showMine: boolean }) {
  const Icon = TYPE_ICON[row.business.type];
  const tint = row.business.type === "RESORT" ? "var(--revenue)" : row.business.type === "PHARMACY" ? "var(--profit)" : "var(--investor)";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.06 }}>
      <Link
        href={`/business/${row.business.id}`}
        className="glass group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl p-4 transition hover:bg-glass-strong sm:grid-cols-[auto_1.4fr_repeat(3,minmax(0,1fr))_auto_auto] sm:p-5"
      >
        <div className="grid size-12 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(145deg, color-mix(in oklab, ${tint} 75%, white), ${tint})`, boxShadow: `0 6px 0 -1px color-mix(in oklab, ${tint} 60%, black 25%)` }}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{row.business.name}</p>
          <p className="truncate text-sm text-muted">
            {BUSINESS_TYPE_LABEL[row.business.type]}
            {row.business.location ? `, ${row.business.location}` : ""}
            {row.occupancy !== null ? ` — ${pct(row.occupancy)} occupied` : ""}
          </p>
        </div>
        <Stat label="Revenue" value={row.revenue} className="hidden sm:block" />
        <Stat label="Expenses" value={row.expenses} className="hidden sm:block" />
        <Stat label={showMine && row.my_payout ? "Your share" : "Net profit"} value={showMine && row.my_payout ? row.my_payout : row.net} strong className="max-sm:text-right" />
        <div className="hidden items-center gap-2 sm:flex">
          {row.warnings.length > 0 && (
            <span title={row.warnings.join("\n")} className="text-manager"><AlertTriangle className="size-4" /></span>
          )}
          <Sparkline values={row.spark} />
        </div>
        <ChevronRight className="hidden size-5 text-muted transition group-hover:translate-x-0.5 sm:block" />
      </Link>
    </motion.div>
  );
}

function Stat({ label, value, strong, className = "" }: { label: string; value: number; strong?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`num ${strong ? "text-lg font-semibold" : "text-base"} ${value < 0 ? "text-expense" : ""}`}>{inrShort(value)}</p>
    </div>
  );
}
