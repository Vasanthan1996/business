"use client";
import { useState } from "react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { ErrorNote } from "../ui/Misc";
import { useToast } from "../ui/Toast";
import { api } from "@/lib/client";
import { addDays, diffDays } from "@/lib/dates";
import { inr } from "@/lib/format";
import { BOOKING_CHANNELS, type Booking, type Unit } from "@/lib/types";

export interface BookingDraft {
  id?: string; unit_id: string; guest_name: string; guest_phone: string;
  check_in: string; check_out: string; amount: string; channel: string; remarks: string;
}

export const blankBooking = (unitId: string, date: string): BookingDraft => ({
  unit_id: unitId, guest_name: "", guest_phone: "", check_in: date, check_out: addDays(date, 1),
  amount: "", channel: "Direct", remarks: "",
});

export const draftFrom = (b: Booking): BookingDraft => ({
  id: b.id, unit_id: b.unit_id, guest_name: b.guest_name, guest_phone: b.guest_phone,
  check_in: b.check_in, check_out: b.check_out, amount: String(b.amount), channel: b.channel || "Direct", remarks: b.remarks,
});

export function BookingForm({ open, onClose, draft, units, businessId, canEdit, onSaved }: {
  open: boolean; onClose: () => void; draft: BookingDraft | null; units: Unit[];
  businessId: string; canEdit: boolean; onSaved: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState<BookingDraft | null>(draft);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setF(draft);
    setError(null);
    setConfirmDelete(false);
  }

  if (!f) return null;
  const set = (k: keyof BookingDraft, v: string) => setF((s) => (s ? { ...s, [k]: v } : s));
  const nights = f.check_in && f.check_out ? diffDays(f.check_in, f.check_out) : 0;
  const amount = Number(f.amount) || 0;
  const editing = !!f.id;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy("save");
    setError(null);
    try {
      const body = { ...f, business_id: businessId, amount };
      if (editing) await api("PATCH", `/api/entries/bookings/${f.id}`, body);
      else await api("POST", "/api/entries/bookings", body);
      toast(editing ? "Booking updated" : "Booking added");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the booking");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!f?.id) return;
    setBusy("delete");
    try {
      await api("DELETE", `/api/entries/bookings/${f.id}`);
      toast("Booking removed");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the booking");
    } finally {
      setBusy(null);
    }
  }

  const floors = [...units].sort((a, b) => a.floor - b.floor);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? (canEdit ? "Edit booking" : "Booking") : "New booking"}
      subtitle={editing && canEdit ? "Changes are recorded in the change log." : undefined}
      footer={
        canEdit ? (
          <>
            {editing && (
              confirmDelete ? (
                <Button variant="danger" busy={busy === "delete"} onClick={remove} className="mr-auto">Confirm remove</Button>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="mr-auto text-expense">Remove</Button>
              )
            )}
            <Button variant="soft" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="booking-form" busy={busy === "save"}>{editing ? "Save changes" : "Add booking"}</Button>
          </>
        ) : undefined
      }
    >
      <form id="booking-form" onSubmit={save} className="space-y-4">
        <fieldset disabled={!canEdit} className="space-y-4">
          <Field label="Room">
            <Select value={f.unit_id} onChange={(e) => set("unit_id", e.target.value)} required>
              {floors.map((u) => (
                <option key={u.id} value={u.id}>{u.floor_label} — {u.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Guest name">
              <Input value={f.guest_name} onChange={(e) => set("guest_name", e.target.value)} required autoFocus={!editing} />
            </Field>
            <Field label="Phone (optional)">
              <Input type="tel" value={f.guest_phone} onChange={(e) => set("guest_phone", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in">
              <Input
                type="date"
                value={f.check_in}
                onChange={(e) => {
                  const v = e.target.value;
                  setF((s) => (s ? { ...s, check_in: v, check_out: s.check_out <= v ? addDays(v, 1) : s.check_out } : s));
                }}
                required
              />
            </Field>
            <Field label="Check-out" error={nights <= 0 ? "Check-out must be after check-in" : undefined}>
              <Input type="date" value={f.check_out} min={addDays(f.check_in, 1)} onChange={(e) => set("check_out", e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total amount (₹)" hint={nights > 0 && amount > 0 ? `${nights} night${nights > 1 ? "s" : ""} at ${inr(amount / nights)} per night` : `${Math.max(nights, 0)} night${nights === 1 ? "" : "s"}`}>
              <Input type="number" inputMode="decimal" min={0} step="1" value={f.amount} onChange={(e) => set("amount", e.target.value)} required />
            </Field>
            <Field label="Booked through">
              <Select value={f.channel} onChange={(e) => set("channel", e.target.value)}>
                {BOOKING_CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Remarks">
            <Textarea value={f.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Advance paid, extra bed, ID checked…" />
          </Field>
        </fieldset>
        <p className="text-xs text-muted">The full amount counts as revenue in the month of check-in.</p>
        {error && <ErrorNote>{error}</ErrorNote>}
      </form>
    </Drawer>
  );
}
