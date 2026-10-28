import "server-only";
import { insert, newId, nowIso } from "./db";
import type { AuditEntry, SessionUser } from "./types";

const SKIP = new Set(["updated_at", "updated_by", "created_at", "created_by", "password_hash"]);

/** Human-readable list of the fields that changed, e.g. "amount 6000 → 6500". */
export function describeChanges(before: object | null, after: object | null): string {
  if (!before || !after) return "";
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of Object.keys(a)) {
    if (SKIP.has(k)) continue;
    if (String(b[k] ?? "") !== String(a[k] ?? "")) {
      parts.push(`${k} ${b[k] === "" || b[k] === undefined ? "(blank)" : b[k]} → ${a[k] === "" ? "(blank)" : a[k]}`);
    }
  }
  return parts.join("; ");
}

function strip(o: object | null) {
  if (!o) return "";
  const { password_hash: _drop, ...rest } = o as Record<string, unknown>;
  void _drop;
  return JSON.stringify(rest);
}

export async function audit(params: {
  user: SessionUser;
  action: AuditEntry["action"];
  entity: string;
  entityId: string;
  businessId?: string;
  summary: string;
  before?: object | null;
  after?: object | null;
}) {
  const row: AuditEntry = {
    id: newId("LOG"),
    timestamp: nowIso(),
    user_id: params.user.id,
    user_name: params.user.name,
    role: params.user.role,
    business_id: params.businessId ?? "",
    entity: params.entity,
    entity_id: params.entityId,
    action: params.action,
    summary: params.summary,
    before_json: strip(params.before ?? null),
    after_json: strip(params.after ?? null),
  };
  try {
    await insert("AuditLog", row);
  } catch (e) {
    // The change itself has succeeded; never fail the request on a log write,
    // but make the gap visible in server logs.
    console.error("Audit log write failed", e, row);
  }
}
