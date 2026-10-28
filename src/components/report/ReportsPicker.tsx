"use client";
import { useState } from "react";
import { MonthPicker } from "../ui/MonthPicker";
import { Select } from "../ui/Field";
import { Empty } from "../ui/Misc";
import { ReportView } from "./ReportView";

export function ReportsPicker({ businesses, initialMonth, isAdmin }: {
  businesses: { id: string; name: string }[]; initialMonth: string; isAdmin: boolean;
}) {
  const [id, setId] = useState(businesses[0]?.id ?? "");
  const [month, setMonth] = useState(initialMonth);
  if (!businesses.length) return <Empty title="No businesses to report on">Your account hasn&apos;t been given access to a business yet.</Empty>;
  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Monthly report</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={id} onChange={(e) => setId(e.target.value)} className="w-auto rounded-full" aria-label="Business">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <MonthPicker month={month} onChange={setMonth} />
        </div>
      </div>
      <ReportView businessId={id} month={month} isAdmin={isAdmin} />
    </div>
  );
}
