"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { BUSINESS_TYPE_LABEL, pct } from "@/lib/format";
import type { Business, BusinessType, Shareholder, Unit } from "@/lib/types";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { ErrorNote, Loading, Pill } from "../ui/Misc";
import { Tabs } from "../ui/Tabs";
import { useToast } from "../ui/Toast";
import { TYPE_ICON } from "../shell/AppShell";

interface Detail {
  business: Business; units: Unit[]; shareholders: Shareholder[];
  managers: { id: string; name: string }[]; viewers: { id: string; name: string }[];
}
interface UserOpt { id: string; name: string; role: string; status: string }

export function BusinessesAdmin() {
  const list = useApi<{ businesses: Business[] }>("/api/businesses");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Businesses & shares</h1>
          <p className="text-sm text-muted">Set each business&apos;s rooms, the manager&apos;s profit share and how the investor pool is split.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Add business</Button>
      </div>

      {list.error && <ErrorNote>{list.error}</ErrorNote>}
      {list.loading && !list.data && <Loading />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.data?.businesses.map((b) => {
          const Icon = TYPE_ICON[b.type];
          return (
            <button key={b.id} onClick={() => setOpenId(b.id)} className={`glass rounded-3xl p-5 text-left transition hover:bg-glass-strong ${b.status === "ARCHIVED" ? "opacity-55" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-line"><Icon className="size-5" /></div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold">{b.name}</p>
                  <p className="text-sm text-muted">{BUSINESS_TYPE_LABEL[b.type]}{b.location ? `, ${b.location}` : ""}</p>
                </div>
              </div>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
                <div style={{ width: `${b.manager_share_pct}%`, background: "var(--manager)" }} />
                <div className="flex-1" style={{ background: "var(--investor)" }} />
              </div>
              <p className="mt-2 text-xs text-muted">
                Manager {pct(b.manager_share_pct)}, investors {pct(100 - b.manager_share_pct)}
                {b.status === "ARCHIVED" ? " — archived" : ""}
              </p>
            </button>
          );
        })}
      </div>

      <NewBusiness open={creating} onClose={() => setCreating(false)} onCreated={(id) => { void list.reload(); setOpenId(id); }} />
      <BusinessDrawer id={openId} onClose={() => setOpenId(null)} onSaved={() => void list.reload()} />
    </div>
  );
}

function NewBusiness({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", type: "RESORT" as BusinessType, location: "", manager_share_pct: "30", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { business } = await api<{ business: Business }>("POST", "/api/businesses", { ...f, manager_share_pct: Number(f.manager_share_pct) });
      toast(`${business.name} added`);
      onClose();
      setF({ name: "", type: "RESORT", location: "", manager_share_pct: "30", notes: "" });
      onCreated(business.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the business");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add business" subtitle="You can add rooms, investors and a manager next."
      footer={<><Button variant="soft" onClick={onClose}>Cancel</Button><Button type="submit" form="new-biz" busy={busy}>Add business</Button></>}>
      <form id="new-biz" onSubmit={save} className="space-y-4">
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as BusinessType })}>
              {(Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((t) => <option key={t} value={t}>{BUSINESS_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Location"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        </div>
        <Field label="Manager's share of net profit (%)">
          <Input type="number" min={0} max={100} step="0.5" value={f.manager_share_pct} onChange={(e) => setF({ ...f, manager_share_pct: e.target.value })} required />
        </Field>
        <Field label="Notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        {error && <ErrorNote>{error}</ErrorNote>}
      </form>
    </Drawer>
  );
}

type DTab = "details" | "rooms" | "investors";

function BusinessDrawer({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const detail = useApi<Detail>(id ? `/api/businesses/${id}` : null);
  const users = useApi<{ users: UserOpt[] }>(id ? "/api/users" : null);
  const [tab, setTab] = useState<DTab>("details");
  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setTab("details");
  }
  const d = detail.data;
  const isResort = d?.business.type === "RESORT";

  return (
    <Drawer open={!!id} onClose={onClose} title={d?.business.name ?? "Business"} subtitle={d ? `Run by ${d.managers.map((m) => m.name).join(", ") || "no manager yet — assign one in Accounts"}` : undefined}>
      {!d || detail.loading ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <Tabs id="bizdrawer" value={tab} onChange={setTab} items={[
            { value: "details", label: "Details" },
            ...(isResort ? [{ value: "rooms" as DTab, label: "Rooms" }] : []),
            { value: "investors", label: "Investors" },
          ]} />
          {tab === "details" && <DetailsForm key={d.business.id + d.business.updated_at} business={d.business} onSaved={() => { void detail.reload(); onSaved(); }} />}
          {tab === "rooms" && <RoomsForm key={d.business.id} businessId={d.business.id} units={d.units} onSaved={() => void detail.reload()} />}
          {tab === "investors" && (
            <InvestorsForm key={d.business.id} business={d.business} shareholders={d.shareholders}
              users={(users.data?.users ?? []).filter((u) => u.status === "ACTIVE")} onSaved={() => void detail.reload()} />
          )}
        </div>
      )}
    </Drawer>
  );
}

function DetailsForm({ business, onSaved }: { business: Business; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ ...business, manager_share_pct: String(business.manager_share_pct) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mgr = Number(f.manager_share_pct) || 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("PATCH", `/api/businesses/${business.id}`, {
        name: f.name, type: f.type, location: f.location, status: f.status, notes: f.notes, manager_share_pct: mgr,
      });
      toast("Business saved");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as BusinessType })}>
            {(Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((t) => <option key={t} value={t}>{BUSINESS_TYPE_LABEL[t]}</option>)}
          </Select>
        </Field>
        <Field label="Location"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
      </div>
      <Field label="Manager's share of net profit (%)">
        <Input type="number" min={0} max={100} step="0.5" value={f.manager_share_pct} onChange={(e) => setF({ ...f, manager_share_pct: e.target.value })} required />
      </Field>
      <div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="transition-all" style={{ width: `${mgr}%`, background: "var(--manager)" }} />
          <div className="flex-1" style={{ background: "var(--investor)" }} />
        </div>
        <p className="mt-1.5 text-xs text-muted">Of every ₹100 profit: ₹{mgr} to the manager, ₹{100 - mgr} to the investor pool.</p>
      </div>
      <Field label="Status">
        <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Business["status"] })}>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived (hidden from managers and shareholders)</option>
        </Select>
      </Field>
      <Field label="Notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" busy={busy}>Save details</Button>
    </form>
  );
}

type UnitDraft = { id?: string; floor: string; floor_label: string; name: string; base_rate: string; status: "ACTIVE" | "INACTIVE" };

function RoomsForm({ businessId, units, onSaved }: { businessId: string; units: Unit[]; onSaved: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<UnitDraft[]>(
    [...units].sort((a, b) => a.sort - b.sort).map((u) => ({ id: u.id, floor: String(u.floor), floor_label: u.floor_label, name: u.name, base_rate: String(u.base_rate), status: u.status })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upd = (i: number, k: keyof UnitDraft, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("PUT", `/api/businesses/${businessId}/units`, rows.map((r) => ({ ...r, floor: Number(r.floor), base_rate: Number(r.base_rate) || 0 })));
      toast("Rooms saved");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save rooms");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Floor 0 is the ground floor. Rooms you stop using are marked inactive so past bookings stay intact.</p>
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className={`rounded-2xl border border-line p-3 ${r.status === "INACTIVE" ? "opacity-55" : ""}`}>
          <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-2">
            <Field label="Floor"><Input type="number" value={r.floor} onChange={(e) => upd(i, "floor", e.target.value)} /></Field>
            <Field label="Floor name"><Input value={r.floor_label} onChange={(e) => upd(i, "floor_label", e.target.value)} /></Field>
            <Field label="Room name"><Input value={r.name} onChange={(e) => upd(i, "name", e.target.value)} /></Field>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Usual rate per night (₹, optional)"><Input type="number" min={0} value={r.base_rate} onChange={(e) => upd(i, "base_rate", e.target.value)} /></Field>
            <Button variant="ghost" size="sm" onClick={() => upd(i, "status", r.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>
              {r.status === "ACTIVE" ? "Mark inactive" : "Reactivate"}
            </Button>
          </div>
        </div>
      ))}
      <Button variant="soft" onClick={() => {
        const top = rows.reduce((m, r) => Math.max(m, Number(r.floor)), -1) + 1;
        setRows([...rows, { floor: String(top), floor_label: `Floor ${top}`, name: "Room", base_rate: "0", status: "ACTIVE" }]);
      }}>
        <Plus className="size-4" /> Add room
      </Button>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div><Button busy={busy} onClick={save}>Save rooms</Button></div>
    </div>
  );
}

type InvDraft = { id?: string; name: string; user_id: string; share_pct: string };

function InvestorsForm({ business, shareholders, users, onSaved }: { business: Business; shareholders: Shareholder[]; users: UserOpt[]; onSaved: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<InvDraft[]>(shareholders.map((s) => ({ id: s.id, name: s.name, user_id: s.user_id, share_pct: String(s.share_pct) })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = rows.reduce((s, r) => s + (Number(r.share_pct) || 0), 0);
  const balanced = Math.abs(total - 100) < 0.01;
  const pool = 100 - business.manager_share_pct;
  const upd = (i: number, k: keyof InvDraft, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("PUT", `/api/businesses/${business.id}/shareholders`, rows.map((r) => ({ ...r, share_pct: Number(r.share_pct) })));
      toast("Investor split saved");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save investors");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Investors share the {pct(pool)} pool left after the manager&apos;s {pct(business.manager_share_pct)}. Their percentages must add up to 100%.
        Link an investor to an account so they see their own payout.
      </p>
      {rows.map((r, i) => (
        <div key={r.id ?? `n${i}`} className="grid grid-cols-[1fr_5.5rem_auto] items-end gap-2 rounded-2xl border border-line p-3">
          <div className="space-y-2">
            <Field label="Investor name"><Input value={r.name} onChange={(e) => upd(i, "name", e.target.value)} required /></Field>
            <Field label="Linked account">
              <Select value={r.user_id} onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                setRows((rs) => rs.map((x, j) => (j === i ? { ...x, user_id: e.target.value, name: x.name || u?.name || "" } : x)));
              }}>
                <option value="">Not linked</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="% of pool" hint={`${pct(((Number(r.share_pct) || 0) * pool) / 100)} of profit`}>
            <Input type="number" min={0} max={100} step="0.5" value={r.share_pct} onChange={(e) => upd(i, "share_pct", e.target.value)} />
          </Field>
          <button className="mb-6 rounded-full p-2 text-muted hover:bg-expense/10 hover:text-expense" aria-label={`Remove ${r.name || "investor"}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button variant="soft" onClick={() => setRows([...rows, { name: "", user_id: "", share_pct: String(Math.max(0, 100 - total)) }])}>
          <Plus className="size-4" /> Add investor
        </Button>
        <Pill color={balanced ? "var(--profit)" : "var(--expense)"}>Total {pct(total)}</Pill>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div><Button busy={busy} disabled={!balanced || rows.length === 0} onClick={save}>Save investor split</Button></div>
    </div>
  );
}
