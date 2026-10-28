"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useApi } from "@/lib/client";
import { ROLE_LABEL, dateTime } from "@/lib/format";
import type { AuditEntry, Business } from "@/lib/types";
import { Select } from "../ui/Field";
import { Empty, ErrorNote, Loading, Pill } from "../ui/Misc";

const ACTION_COLOR: Record<string, string> = {
  CREATE: "var(--profit)", UPDATE: "var(--investor)", DELETE: "var(--expense)",
  LOCK: "var(--manager)", UNLOCK: "var(--manager)", LOGIN: "var(--muted)",
};
const ACTION_LABEL: Record<string, string> = {
  CREATE: "Added", UPDATE: "Changed", DELETE: "Removed", LOCK: "Locked", UNLOCK: "Unlocked", LOGIN: "Signed in",
};

export function AuditLogView() {
  const [businessId, setBusinessId] = useState("");
  const [role, setRole] = useState("PROPERTY");
  const [showLogins, setShowLogins] = useState(false);
  const biz = useApi<{ businesses: Business[] }>("/api/businesses");
  const q = new URLSearchParams({ limit: "500", ...(businessId ? { businessId } : {}), ...(role ? { role } : {}) });
  const log = useApi<{ entries: AuditEntry[] }>(`/api/audit?${q}`);
  const [open, setOpen] = useState<string | null>(null);
  const entries = (log.data?.entries ?? []).filter((e) => showLogins || e.action !== "LOGIN");
  const bizName = (id: string) => biz.data?.businesses.find((b) => b.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Change log</h1>
        <p className="text-sm text-muted">Every entry added, changed or removed, with who did it and what it was before.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-auto rounded-full" aria-label="Made by">
          <option value="PROPERTY">Changes by managers</option>
          <option value="ADMIN">Changes by admins</option>
          <option value="">Everyone</option>
        </Select>
        <Select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="w-auto rounded-full" aria-label="Business">
          <option value="">All businesses</option>
          {biz.data?.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <label className="flex items-center gap-2 px-2 text-sm text-muted">
          <input type="checkbox" className="accent-[var(--investor)]" checked={showLogins} onChange={(e) => setShowLogins(e.target.checked)} /> Show sign-ins
        </label>
      </div>

      {log.error && <ErrorNote>{log.error}</ErrorNote>}
      {log.loading && !log.data && <Loading />}
      {log.data && entries.length === 0 && <Empty title="No changes match these filters">Changes appear here as soon as someone saves them.</Empty>}

      <ol className="relative space-y-2 border-l-2 border-line pl-5">
        {entries.map((e) => {
          const isOpen = open === e.id;
          const before = parse(e.before_json), after = parse(e.after_json);
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[27px] top-5 size-3 rounded-full ring-4 ring-bg" style={{ background: ACTION_COLOR[e.action] }} />
              <div className="glass rounded-2xl">
                <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill color={ACTION_COLOR[e.action]}>{ACTION_LABEL[e.action]} {e.entity.toLowerCase()}</Pill>
                      {e.business_id && <span className="text-xs text-muted">{bizName(e.business_id)}</span>}
                    </div>
                    <p className="mt-1.5 text-sm">{e.summary}</p>
                    <p className="mt-1 text-xs text-muted">{e.user_name}, {ROLE_LABEL[e.role] ?? e.role}, {dateTime(e.timestamp)}</p>
                  </div>
                  {(before || after) && <ChevronDown className={`mt-1 size-4 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} />}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (before || after) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <Diff before={before} after={after} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function parse(s: string): Record<string, unknown> | null {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

const HIDE = new Set(["id", "business_id", "created_at", "created_by", "updated_at", "updated_by"]);

function Diff({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((k) => !HIDE.has(k));
  const show = (v: unknown) => (v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <div className="overflow-x-auto border-t border-line px-4 pb-4 pt-2">
      <table className="w-full text-xs">
        <thead className="text-left text-muted">
          <tr><th className="py-1.5 pr-4 font-medium">Field</th><th className="py-1.5 pr-4 font-medium">Before</th><th className="py-1.5 font-medium">After</th></tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const changed = show(before?.[k]) !== show(after?.[k]);
            return (
              <tr key={k} className={changed ? "" : "text-muted"}>
                <td className="py-1 pr-4">{k}</td>
                <td className={`py-1 pr-4 ${changed && before ? "text-expense line-through decoration-expense/40" : ""}`}>{before ? show(before[k]) : "—"}</td>
                <td className={`py-1 ${changed && after ? "font-medium text-profit" : ""}`}>{after ? show(after[k]) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
