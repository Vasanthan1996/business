"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/dates";

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="glass inline-flex items-center rounded-full p-1">
      <button className="rounded-full p-1.5 hover:bg-line" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </button>
      <label className="relative cursor-pointer px-2 text-sm font-medium">
        <span className="num">{monthLabel(month)}</span>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Choose month"
        />
      </label>
      <button className="rounded-full p-1.5 hover:bg-line" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
