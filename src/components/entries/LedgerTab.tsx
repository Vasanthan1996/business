"use client";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { Empty, ErrorNote, Loading } from "../ui/Misc";
import { useToast } from "../ui/Toast";
import { api, useApi } from "@/lib/client";
import { CATEGORY_LABEL, inr, shortDate } from "@/lib/format";
import { todayIST } from "@/lib/dates";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type BusinessType, type Expense, type Income } from "@/lib/types";

type Kind = "income" | "expenses";
type Row = (Income | Expense) & { paid_to?: string };

interface Draft { id?: string; date: string; category: string; amount: string; description: string; paid_to: string }

const CAT_COLOR: Record<string, string> = {
  RENT: "var(--investor)", SALARY: "var(--manager)", MAINTENANCE: "var(--profit)", OTHERS: "var(--muted)",
};

/** Date-wise list + entry drawer for daily income or categorised expenses. */
export function LedgerTab({ kind, businessId, businessType, month, canEdit, onChanged }: {
  kind: Kind; businessId: string; businessType: BusinessType; month: string; canEdit: boolean; onChanged?: () => void;
}) {
  const { data, error, loading, reload } = useApi<{ entries: Row[] }>(`/api/entries/${kind}?businessId=${businessId}&month=${month}`);
  const [draft, setDraft] = useState<Draft | null>(null);
  const isExpense = kind === "expenses";
  const categories = isExpense
    ? EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
    : INCOME_CATEGORIES[businessType].map((c) => ({ value: c, label: c }));

  const defaultDate = todayIST().startsWith(month) ? todayIST() : `${month}-01`;
  const newDraft = (): Draft => ({ date: defaultDate, category: categories[0].value, amount: "", description: "", paid_to: "" });

  const entries = data?.entries ?? [];
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const byCat = categories.map((c) => ({ ...c, amount: entries.filter((e) => e.category === c.value).reduce((s, e) => s + e.amount, 0) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {byCat.filter((c) => isExpense || c.amount > 0).map((c) => (
            <div key={c.value} className="glass rounded-2xl px-3.5 py-2">
              <p className="text-xs text-muted">{isExpense ? CATEGORY_LABEL[c.value] : c.label}</p>
              <p className="num text-sm font-semibold">{inr(c.amount)}</p>
            </div>
          ))}
          <div className="rounded-2xl px-3.5 py-2" style={{ background: `color-mix(in oklab, ${isExpense ? "var(--expense)" : "var(--revenue)"} 14%, transparent)` }}>
            <p className="text-xs text-muted">Total</p>
            <p className="num text-sm font-semibold" style={{ color: isExpense ? "var(--expense)" : "var(--revenue)" }}>{inr(total)}</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setDraft(newDraft())}>
            <Plus className="size-4" /> {isExpense ? "Add expense" : "Add income"}
          </Button>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data && <Loading />}
      {data && entries.length === 0 && (
        <Empty
          title={isExpense ? "No expenses logged this month" : "No income logged this month"}
          action={canEdit ? <Button variant="soft" onClick={() => setDraft(newDraft())}>{isExpense ? "Add the first expense" : "Add the first entry"}</Button> : undefined}
        >
          {isExpense ? "Log rent, salaries, maintenance materials and other costs so net profit is accurate." : "Record each day's takings so revenue builds up through the month."}
        </Empty>
      )}

      {entries.length > 0 && (
        <div className="glass overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Details</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0 hover:bg-line/40">
                  <td className="num whitespace-nowrap px-4 py-3">{shortDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: CAT_COLOR[e.category] ?? "var(--revenue)" }} />
                      {isExpense ? CATEGORY_LABEL[e.category] : e.category}
                    </span>
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-muted sm:table-cell">
                    {[e.description, e.paid_to && `to ${e.paid_to}`].filter(Boolean).join(", ")}
                  </td>
                  <td className="num px-4 py-3 text-right font-medium">{inr(e.amount)}</td>
                  {canEdit && (
                    <td className="pr-2">
                      <button
                        className="rounded-full p-2 text-muted hover:bg-line hover:text-ink"
                        aria-label="Edit entry"
                        onClick={() => setDraft({ id: e.id, date: e.date, category: e.category, amount: String(e.amount), description: e.description, paid_to: e.paid_to ?? "" })}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EntryDrawer
        kind={kind}
        draft={draft}
        categories={categories}
        businessId={businessId}
        onClose={() => setDraft(null)}
        onSaved={() => {
          void reload();
          onChanged?.();
        }}
      />
    </div>
  );
}

function EntryDrawer({ kind, draft, categories, businessId, onClose, onSaved }: {
  kind: Kind; draft: Draft | null; categories: { value: string; label: string }[];
  businessId: string; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState<Draft | null>(draft);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setF(draft);
    setError(null);
    setConfirm(false);
  }

  const isExpense = kind === "expenses";
  const noun = isExpense ? "expense" : "income";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy("save");
    setError(null);
    try {
      const body = { business_id: businessId, date: f.date, category: f.category, amount: Number(f.amount), description: f.description, ...(isExpense ? { paid_to: f.paid_to } : {}) };
      if (f.id) await api("PATCH", `/api/entries/${kind}/${f.id}`, body);
      else await api("POST", `/api/entries/${kind}`, body);
      toast(f.id ? `${isExpense ? "Expense" : "Income"} updated` : `${isExpense ? "Expense" : "Income"} added`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!f?.id) return;
    setBusy("delete");
    try {
      await api("DELETE", `/api/entries/${kind}/${f.id}`);
      toast(`${isExpense ? "Expense" : "Income"} removed`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove");
    } finally {
      setBusy(null);
    }
  }

  const set = (k: keyof Draft, v: string) => setF((s) => (s ? { ...s, [k]: v } : s));

  return (
    <Drawer
      open={!!f}
      onClose={onClose}
      title={f?.id ? `Edit ${noun}` : `New ${noun}`}
      subtitle={f?.id ? "Changes are recorded in the change log." : undefined}
      footer={
        <>
          {f?.id && (confirm ? (
            <Button variant="danger" busy={busy === "delete"} onClick={remove} className="mr-auto">Confirm remove</Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirm(true)} className="mr-auto text-expense">Remove</Button>
          ))}
          <Button variant="soft" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="entry-form" busy={busy === "save"}>{f?.id ? "Save changes" : `Add ${noun}`}</Button>
        </>
      }
    >
      {f && (
        <form id="entry-form" onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required />
            </Field>
            <Field label="Amount (₹)">
              <Input type="number" inputMode="decimal" min={0} step="1" value={f.amount} onChange={(e) => set("amount", e.target.value)} required autoFocus />
            </Field>
          </div>
          <Field label="Category">
            <Select value={f.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          {isExpense && (
            <Field label="Paid to (optional)">
              <Input value={f.paid_to} onChange={(e) => set("paid_to", e.target.value)} placeholder="Landlord, staff name, shop…" />
            </Field>
          )}
          <Field label="Details (optional)">
            <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
        </form>
      )}
    </Drawer>
  );
}
