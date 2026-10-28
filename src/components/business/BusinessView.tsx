"use client";
import { useMemo, useState } from "react";
import { BedDouble, Eye, FileBarChart2, Lock, Plus, ReceiptIndianRupee, Wallet } from "lucide-react";
import { useApi } from "@/lib/client";
import { BUSINESS_TYPE_LABEL, inr, shortDate, CHANNEL_COLOR } from "@/lib/format";
import { todayIST } from "@/lib/dates";
import type { Booking, Business, SessionUser, Shareholder, Unit } from "@/lib/types";
import { MonthPicker } from "../ui/MonthPicker";
import { Tabs } from "../ui/Tabs";
import { Button } from "../ui/Button";
import { Empty, ErrorNote, Loading } from "../ui/Misc";
import { RoomBoard } from "../resort/RoomBoard";
import { BookingForm, blankBooking, draftFrom, type BookingDraft } from "../resort/BookingForm";
import { LedgerTab } from "../entries/LedgerTab";
import { ReportView } from "../report/ReportView";
import { TYPE_ICON } from "../shell/AppShell";

interface Detail {
  business: Business; canEdit: boolean; units: Unit[]; shareholders: Shareholder[];
  managers: { id: string; name: string }[]; lockedMonths: string[];
}
type Tab = "rooms" | "income" | "expenses" | "report";

export function BusinessView({ businessId, user, initialMonth }: { businessId: string; user: SessionUser; initialMonth: string }) {
  const { data, error, loading } = useApi<Detail>(`/api/businesses/${businessId}`);
  const [month, setMonth] = useState(initialMonth);
  const [tab, setTab] = useState<Tab | null>(null);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (loading || !data) return <Loading />;

  const b = data.business;
  const isResort = b.type === "RESORT";
  const locked = data.lockedMonths.includes(month);
  const canEdit = data.canEdit && (!locked || user.role === "ADMIN");
  const Icon = TYPE_ICON[b.type];
  const active: Tab = tab ?? (data.canEdit ? (isResort ? "rooms" : "income") : "report");

  const tabs: { value: Tab; label: string; icon: React.ReactNode }[] = [
    ...(isResort
      ? [{ value: "rooms" as Tab, label: "Room board", icon: <BedDouble className="size-4" /> }]
      : [{ value: "income" as Tab, label: "Daily income", icon: <Wallet className="size-4" /> }]),
    { value: "expenses", label: "Expenses", icon: <ReceiptIndianRupee className="size-4" /> },
    ...(isResort ? [{ value: "income" as Tab, label: "Other income", icon: <Wallet className="size-4" /> }] : []),
    { value: "report", label: "Report", icon: <FileBarChart2 className="size-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-revenue to-investor text-white shadow-[0_6px_0_-1px_rgba(60,40,120,0.5)]">
            <Icon className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{b.name}</h1>
            <p className="text-sm text-muted">
              {BUSINESS_TYPE_LABEL[b.type]}{b.location ? `, ${b.location}` : ""}
              {data.managers.length > 0 && ` — run by ${data.managers.map((m) => m.name).join(", ")}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!data.canEdit && (
            <span className="flex items-center gap-1.5 rounded-full bg-line px-3 py-1.5 text-xs text-muted"><Eye className="size-3.5" /> View only</span>
          )}
          {locked && (
            <span className="flex items-center gap-1.5 rounded-full bg-manager/15 px-3 py-1.5 text-xs"><Lock className="size-3.5 text-manager" /> Month locked</span>
          )}
          <MonthPicker month={month} onChange={setMonth} />
        </div>
      </div>

      <Tabs id="biz" value={active} onChange={setTab} items={tabs} />

      {active === "rooms" && isResort && (
        <RoomsTab businessId={businessId} units={data.units} month={month} canEdit={canEdit} onChanged={bump} />
      )}
      {active === "income" && (
        <LedgerTab kind="income" businessId={businessId} businessType={b.type} month={month} canEdit={canEdit} onChanged={bump} />
      )}
      {active === "expenses" && (
        <LedgerTab kind="expenses" businessId={businessId} businessType={b.type} month={month} canEdit={canEdit} onChanged={bump} />
      )}
      {active === "report" && <ReportView businessId={businessId} month={month} isAdmin={user.role === "ADMIN"} refreshKey={version} />}
    </div>
  );
}

function RoomsTab({ businessId, units, month, canEdit, onChanged }: {
  businessId: string; units: Unit[]; month: string; canEdit: boolean; onChanged: () => void;
}) {
  const { data, error, loading, reload } = useApi<{ entries: Booking[] }>(`/api/entries/bookings?businessId=${businessId}&month=${month}`);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const active = units.filter((u) => u.status !== "INACTIVE");
  const bookings = useMemo(() => data?.entries ?? [], [data]);
  const inMonth = bookings.filter((b) => b.check_in.startsWith(month));
  const total = inMonth.reduce((s, b) => s + b.amount, 0);

  if (active.length === 0) {
    return <Empty title="No rooms set up">Ask the admin to add rooms in Businesses & shares.</Empty>;
  }

  const firstDate = todayIST().startsWith(month) ? todayIST() : `${month}-01`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="num font-semibold text-ink">{inr(total)}</span> from {inMonth.length} {inMonth.length === 1 ? "stay" : "stays"} checked in this month
        </p>
        {canEdit && (
          <Button onClick={() => setDraft(blankBooking(active[0].id, firstDate))}>
            <Plus className="size-4" /> New booking
          </Button>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : (
        <section className="glass rounded-[28px] p-3 sm:p-5">
          <RoomBoard
            month={month}
            units={active}
            bookings={bookings}
            canEdit={canEdit}
            onAdd={(unitId, date) => setDraft(blankBooking(unitId, date))}
            onOpen={(b) => setDraft(draftFrom(b))}
          />
        </section>
      )}

      {inMonth.length > 0 && (
        <div className="glass overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Nights</th>
                <th className="px-4 py-3 font-medium">Through</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inMonth.map((b) => {
                const u = units.find((x) => x.id === b.unit_id);
                return (
                  <tr key={b.id} onClick={() => setDraft(draftFrom(b))} className="cursor-pointer border-b border-line last:border-0 hover:bg-line/40">
                    <td className="num whitespace-nowrap px-4 py-3">{shortDate(b.check_in)}</td>
                    <td className="px-4 py-3">{u?.floor_label ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{b.guest_name}</td>
                    <td className="num px-4 py-3">{b.nights}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: CHANNEL_COLOR[b.channel] ?? "var(--muted)" }} />{b.channel}</span>
                    </td>
                    <td className="num px-4 py-3 text-right font-medium">{inr(b.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BookingForm
        open={!!draft}
        draft={draft}
        onClose={() => setDraft(null)}
        units={active}
        businessId={businessId}
        canEdit={canEdit}
        onSaved={() => {
          void reload();
          onChanged();
        }}
      />
    </div>
  );
}
