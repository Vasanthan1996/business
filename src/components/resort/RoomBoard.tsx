"use client";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { daysInMonth, todayIST } from "@/lib/dates";
import { CHANNEL_COLOR, inr, inrShort } from "@/lib/format";
import { nightsInMonth } from "@/lib/finance";
import type { Booking, Unit } from "@/lib/types";

/**
 * The resort drawn as a cut-through of the building: one slab per floor,
 * top floor at the top, each stay a bar across the nights it covers.
 * Click an empty night to add a booking; click a bar to edit it.
 */
export function RoomBoard({ month, units, bookings, canEdit, onAdd, onOpen }: {
  month: string; units: Unit[]; bookings: Booking[]; canEdit: boolean;
  onAdd: (unitId: string, date: string) => void; onOpen: (b: Booking) => void;
}) {
  const days = daysInMonth(month);
  const today = todayIST();
  const floors = [...units].sort((a, b) => b.floor - a.floor || a.sort - b.sort);
  const dayList = Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
    return { d: i + 1, date, weekend: wd === 0 || wd === 6, wd: "SMTWTFS"[wd] };
  });
  const cols = `minmax(6.5rem, 8.5rem) repeat(${days}, minmax(26px, 1fr))`;

  const span = (b: Booking) => {
    const start = b.check_in.slice(0, 7) < month ? 1 : Number(b.check_in.slice(8, 10));
    const end = b.check_out.slice(0, 7) > month ? days + 1 : Number(b.check_out.slice(8, 10));
    return { start, end, clippedLeft: b.check_in.slice(0, 7) < month, clippedRight: b.check_out.slice(0, 7) > month };
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: `calc(8.5rem + ${days * 27}px)` }} className="px-1 pt-2">
          {/* Roofline */}
          <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="ml-[8.5rem] block h-8 w-[calc(100%-8.5rem)]" aria-hidden>
            <path d="M0,40 L500,4 L1000,40" fill="none" stroke="var(--line)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>

          <div className="grid gap-y-0" style={{ gridTemplateColumns: cols }}>
            <div />
            {dayList.map((x) => (
              <div key={x.d} className={`pb-2 text-center text-[11px] leading-tight ${x.date === today ? "font-semibold text-revenue" : "text-muted"}`}>
                <div>{x.wd}</div>
                <div className="num text-xs">{x.d}</div>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {floors.map((u, fi) => {
              const stays = bookings.filter((b) => b.unit_id === u.id && nightsInMonth(b, month) > 0);
              const occupied = new Set<number>();
              stays.forEach((b) => {
                const { start, end } = span(b);
                for (let d = start; d < end; d++) occupied.add(d);
              });
              const floorRevenue = stays.filter((b) => b.check_in.slice(0, 7) === month).reduce((s, b) => s + b.amount, 0);
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * fi, type: "spring", stiffness: 260, damping: 26 }}
                  className="slab grid items-stretch rounded-2xl"
                  style={{ gridTemplateColumns: cols, gridTemplateRows: "56px" }}
                >
                  <div className="sticky left-0 z-20 flex flex-col justify-center rounded-l-2xl bg-glass-strong px-3" style={{ gridRow: 1, gridColumn: 1 }}>
                    <span className="truncate text-sm font-semibold">{u.floor_label}</span>
                    <span className="num truncate text-xs text-muted">{inrShort(floorRevenue)} this month</span>
                  </div>

                  {dayList.map((x) => (
                    <button
                      key={x.d}
                      type="button"
                      disabled={!canEdit || occupied.has(x.d)}
                      onClick={() => onAdd(u.id, x.date)}
                      style={{ gridRow: 1, gridColumn: x.d + 1 }}
                      className={`group relative border-l border-line/70 ${x.weekend ? "bg-line/60" : ""} ${x.date === today ? "bg-revenue/10" : ""} ${canEdit && !occupied.has(x.d) ? "cursor-pointer hover:bg-investor/12" : "cursor-default"}`}
                      aria-label={canEdit && !occupied.has(x.d) ? `Add booking for ${u.floor_label} on ${x.date}` : `${u.floor_label} ${x.date}`}
                    >
                      {canEdit && !occupied.has(x.d) && (
                        <Plus className="absolute inset-0 m-auto size-3.5 text-investor opacity-0 transition group-hover:opacity-100" />
                      )}
                    </button>
                  ))}

                  {stays.map((b) => {
                    const { start, end, clippedLeft, clippedRight } = span(b);
                    const color = CHANNEL_COLOR[b.channel] ?? CHANNEL_COLOR.Other;
                    const nights = end - start;
                    return (
                      <motion.button
                        key={b.id}
                        type="button"
                        onClick={() => onOpen(b)}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.15 + 0.08 * fi, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          gridRow: 1,
                          gridColumn: `${start + 1} / ${end + 1}`,
                          background: `linear-gradient(180deg, color-mix(in oklab, ${color} 80%, white), ${color})`,
                          boxShadow: `0 4px 0 -1px color-mix(in oklab, ${color} 55%, black 25%)`,
                          transformOrigin: "left",
                        }}
                        className={`relative z-10 my-2.5 mx-0.5 flex min-w-0 items-center overflow-hidden px-1.5 text-left text-white ${clippedLeft ? "rounded-l-sm" : "rounded-l-xl"} ${clippedRight ? "rounded-r-sm" : "rounded-r-xl"}`}
                        title={`${b.guest_name}: ${b.check_in} to ${b.check_out}, ${inr(b.amount)} via ${b.channel}`}
                      >
                        {nights === 1 ? (
                          <span className="mx-auto text-xs font-semibold">{b.guest_name.slice(0, 1)}</span>
                        ) : (
                          <span className="truncate text-xs font-semibold">{nights === 2 ? b.guest_name.split(" ")[0] : b.guest_name}</span>
                        )}
                        {nights >= 3 && <span className="num ml-auto pl-1 text-[11px] opacity-90">{inrShort(b.amount)}</span>}
                      </motion.button>
                    );
                  })}
                </motion.div>
              );
            })}
          </div>
          {/* Ground line */}
          <div className="mt-4 ml-[8.5rem] h-1.5 rounded-full bg-line" />
        </div>
      </div>

      <ChannelLegend bookings={bookings} />
    </div>
  );
}

function ChannelLegend({ bookings }: { bookings: Booking[] }) {
  const used = [...new Set(bookings.map((b) => b.channel || "Direct"))];
  if (!used.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {used.map((c) => (
        <span key={c} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: CHANNEL_COLOR[c] ?? CHANNEL_COLOR.Other }} />
          {c}
        </span>
      ))}
    </div>
  );
}
