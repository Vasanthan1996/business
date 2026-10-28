"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { ROLE_LABEL, dateTime } from "@/lib/format";
import type { Business, Role } from "@/lib/types";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { Field, Input, Select } from "../ui/Field";
import { ErrorNote, Loading, Pill } from "../ui/Misc";
import { useToast } from "../ui/Toast";

interface UserRow {
  id: string; name: string; email: string; role: Role; status: "ACTIVE" | "DISABLED";
  phone: string; last_login_at: string; business_ids: string[];
}
interface Draft { id?: string; name: string; email: string; role: Role; status: "ACTIVE" | "DISABLED"; phone: string; password: string; business_ids: string[] }

const ROLE_COLOR: Record<Role, string> = { ADMIN: "var(--revenue)", PROPERTY: "var(--manager)", USER: "var(--investor)" };
const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Sees everything, manages accounts, shares and locks months.",
  PROPERTY: "Enters bookings, income and expenses for the businesses ticked below.",
  USER: "Read-only. Sees reports for the businesses ticked below.",
};

export function UsersAdmin({ me }: { me: string }) {
  const users = useApi<{ users: UserRow[] }>("/api/users");
  const biz = useApi<{ businesses: Business[] }>("/api/businesses");
  const [draft, setDraft] = useState<Draft | null>(null);
  const bizName = (id: string) => biz.data?.businesses.find((b) => b.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted">Who can sign in, and which businesses each person can see or edit.</p>
        </div>
        <Button onClick={() => setDraft({ name: "", email: "", role: "PROPERTY", status: "ACTIVE", phone: "", password: "", business_ids: [] })}>
          <Plus className="size-4" /> New account
        </Button>
      </div>

      {users.error && <ErrorNote>{users.error}</ErrorNote>}
      {users.loading && !users.data && <Loading />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {users.data?.users.map((u) => (
          <button
            key={u.id}
            onClick={() => setDraft({ ...u, password: "" })}
            className={`glass rounded-3xl p-5 text-left transition hover:bg-glass-strong ${u.status === "DISABLED" ? "opacity-55" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold">{u.name}{u.id === me ? " (you)" : ""}</p>
                <p className="truncate text-sm text-muted">{u.email}</p>
              </div>
              <Pill color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Pill>
            </div>
            <p className="mt-3 text-sm">
              {u.role === "ADMIN" ? "All businesses" : u.business_ids.length ? u.business_ids.map(bizName).join(", ") : <span className="text-manager">No business assigned</span>}
            </p>
            <p className="mt-2 text-xs text-muted">
              {u.status === "DISABLED" ? "Removed" : u.last_login_at ? `Last signed in ${dateTime(u.last_login_at)}` : "Hasn't signed in yet"}
            </p>
          </button>
        ))}
      </div>

      <UserDrawer
        draft={draft}
        me={me}
        businesses={biz.data?.businesses ?? []}
        onClose={() => setDraft(null)}
        onSaved={() => void users.reload()}
      />
    </div>
  );
}

function UserDrawer({ draft, me, businesses, onClose, onSaved }: {
  draft: Draft | null; me: string; businesses: Business[]; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState<Draft | null>(draft);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setF(draft);
    setError(null);
    setConfirm(false);
  }
  if (!f) return <Drawer open={false} onClose={onClose} title=""><div /></Drawer>;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((s) => (s ? { ...s, [k]: v } : s));
  const editing = !!f.id;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setBusy("save");
    setError(null);
    try {
      const body = { name: f.name, email: f.email, role: f.role, status: f.status, phone: f.phone, business_ids: f.business_ids, ...(f.password ? { password: f.password } : {}) };
      if (editing) await api("PATCH", `/api/users/${f.id}`, body);
      else await api("POST", "/api/users", body);
      toast(editing ? "Account updated" : "Account created");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the account");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!f?.id) return;
    setBusy("remove");
    try {
      await api("DELETE", `/api/users/${f.id}`);
      toast("Account removed");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the account");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer
      open={!!draft}
      onClose={onClose}
      title={editing ? f.name || "Account" : "New account"}
      footer={
        <>
          {editing && f.id !== me && f.status === "ACTIVE" && (confirm ? (
            <Button variant="danger" busy={busy === "remove"} onClick={remove} className="mr-auto">Confirm remove</Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirm(true)} className="mr-auto text-expense">Remove account</Button>
          ))}
          <Button variant="soft" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="user-form" busy={busy === "save"}>{editing ? "Save changes" : "Create account"}</Button>
        </>
      }
    >
      <form id="user-form" onSubmit={save} className="space-y-4">
        <Field label="Full name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} required /></Field>
          <Field label="Phone (optional)"><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        </div>
        <Field label={editing ? "New password" : "Starting password"} hint={editing ? "Leave blank to keep the current password." : "Share this with them privately. 8+ characters."}>
          <Input type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={(e) => set("password", e.target.value)} required={!editing} />
        </Field>
        <Field label="Account type" hint={ROLE_HELP[f.role]}>
          <Select value={f.role} onChange={(e) => set("role", e.target.value as Role)} disabled={f.id === me}>
            <option value="PROPERTY">Property manager</option>
            <option value="USER">Shareholder (view only)</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
        {f.role !== "ADMIN" && (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-muted">{f.role === "PROPERTY" ? "Businesses they manage" : "Businesses they can view"}</legend>
            <div className="space-y-1.5">
              {businesses.map((b) => (
                <label key={b.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-line/40">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--investor)]"
                    checked={f.business_ids.includes(b.id)}
                    onChange={(e) => set("business_ids", e.target.checked ? [...f.business_ids, b.id] : f.business_ids.filter((x) => x !== b.id))}
                  />
                  <span className="text-sm">{b.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {editing && f.status === "DISABLED" && (
          <Field label="Status">
            <Select value={f.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
              <option value="DISABLED">Removed (can&apos;t sign in)</option>
              <option value="ACTIVE">Active</option>
            </Select>
          </Field>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
      </form>
    </Drawer>
  );
}
