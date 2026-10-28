"use client";
import { motion } from "framer-motion";
import { inr, inrShort, pct } from "@/lib/format";

/**
 * The profit staircase: revenue on top, split into expenses + net profit,
 * with net profit split again into the manager's and investors' shares.
 * Widths are true to scale, so the picture is the math.
 */
export function ProfitStack({
  revenue, expenses, net, managerShare, managerPct, managerName, investors, compact = false,
}: {
  revenue: number; expenses: number; net: number; managerShare: number; managerPct: number;
  managerName: string; investors: { name: string; amount: number }[]; compact?: boolean;
}) {
  const loss = net <= 0;
  const base = Math.max(revenue, expenses, 1);
  const revW = (revenue / base) * 100;
  const expW = (Math.min(expenses, revenue) / base) * 100;
  const netW = loss ? 0 : (net / base) * 100;
  const mgrW = loss ? 0 : (managerShare / base) * 100;
  const h = compact ? 30 : 40;

  const investorColors = ["var(--investor)", "#a9b2ff", "#6f7de0", "#c3c9ff", "#5361d6"];

  return (
    <div className="space-y-3">
      <Row label="Revenue" h={h}>
        <Seg w={revW} color="var(--revenue)" delay={0} h={h} text={inr(revenue)} />
      </Row>

      <Row label={loss ? "Expenses" : "Expenses + profit"} h={h}>
        {loss ? (
          <Seg w={(expenses / base) * 100} color="var(--expense)" delay={0.15} h={h} text={`${inr(expenses)} spent`} />
        ) : (
          <>
            <Seg w={expW} color="var(--expense)" delay={0.15} h={h} text={expenses ? inr(expenses) : ""} />
            <Seg w={netW} color="var(--profit)" delay={0.28} h={h} text={inr(net)} />
          </>
        )}
      </Row>

      {!loss ? (
        <Row label="Profit share" h={h}>
          <div style={{ width: `${expW}%` }} className="shrink-0" />
          <Seg w={mgrW} color="var(--manager)" delay={0.42} h={h} text={inrShort(managerShare)} />
          {investors.map((inv, i) => (
            <Seg
              key={inv.name + i}
              w={(inv.amount / base) * 100}
              color={investorColors[i % investorColors.length]}
              delay={0.5 + i * 0.08}
              h={h}
              text={inrShort(inv.amount)}
            />
          ))}
        </Row>
      ) : (
        <p className="pl-[7.5rem] text-sm text-muted max-sm:pl-0">
          Loss of <span className="num font-semibold text-expense">{inr(Math.abs(net))}</span>, so no profit share is paid this month.
        </p>
      )}

      {!compact && !loss && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 pt-3 text-sm sm:grid-cols-3 sm:pl-[7.5rem]">
          <Legend color="var(--manager)" name={`${managerName} (${pct(managerPct)})`} value={managerShare} />
          {investors.map((inv, i) => (
            <Legend key={inv.name + i} color={investorColors[i % investorColors.length]} name={inv.name} value={inv.amount} />
          ))}
        </dl>
      )}
    </div>
  );
}

function Row({ label, h, children }: { label: string; h: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 max-sm:flex-col max-sm:items-stretch max-sm:gap-1">
      <span className="w-28 shrink-0 text-[13px] text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 gap-1" style={{ height: h }}>{children}</div>
    </div>
  );
}

function Seg({ w, color, delay, h, text }: { w: number; color: string; delay: number; h: number; text: string }) {
  if (w <= 0) return null;
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: `${w}%`,
        height: h,
        background: `linear-gradient(180deg, color-mix(in oklab, ${color} 82%, white) 0%, ${color} 60%)`,
        boxShadow: `0 6px 0 -1px color-mix(in oklab, ${color} 55%, black 20%), 0 14px 22px -14px ${color}`,
        transformOrigin: "left center",
      }}
      className="relative flex min-w-[6px] items-center overflow-hidden rounded-[10px] px-3"
      title={text}
    >
      {w > 14 && <span className="num truncate text-sm font-semibold text-white drop-shadow-sm">{text}</span>}
    </motion.div>
  );
}

function Legend({ color, name, value }: { color: string; name: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: color }} />
      <dt className="truncate text-muted">{name}</dt>
      <dd className="num ml-auto font-semibold sm:ml-0">{inr(value)}</dd>
    </div>
  );
}
