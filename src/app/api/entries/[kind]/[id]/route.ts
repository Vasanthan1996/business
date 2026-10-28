import { ok, route, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { assertEdit, assertMonthOpen } from "@/lib/rbac";
import { assertNoOverlap, getEntry, kindConfig, softDeleteEntry, updateEntry } from "@/lib/entries";
import { findById } from "@/lib/db";
import { audit, describeChanges } from "@/lib/audit";
import type { EntryKind } from "@/lib/types";

type Ctx = { params: Promise<{ kind: string; id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { kind, id } = await params;
  const cfg = kindConfig(kind);
  const user = await requireApiUser(["ADMIN", "PROPERTY"]);
  const before = await getEntry(kind as EntryKind, id);
  await assertEdit(user, before.business_id);
  const merged = { ...before, ...(await req.json()), business_id: before.business_id };
  const data = cfg.schema.parse(merged) as Record<string, unknown>;
  // Both the old and the new date must be in an open month.
  await assertMonthOpen(user, before.business_id, cfg.dateOf(before as unknown as Record<string, unknown>));
  await assertMonthOpen(user, before.business_id, cfg.dateOf(data));
  if (kind === "bookings") {
    const unit = await findById("Units", String(data.unit_id));
    if (!unit || unit.business_id !== before.business_id) throw new HttpError(400, "That room doesn't belong to this business.");
    await assertNoOverlap(data as { business_id: string; unit_id: string; check_in: string; check_out: string }, id);
  }
  const after = await updateEntry(kind as EntryKind, before, data, user.id);
  const changes = describeChanges(before, after);
  await audit({ user, action: "UPDATE", entity: cfg.entity, entityId: id, businessId: before.business_id, summary: `${cfg.label(before as unknown as Record<string, unknown>)}: ${changes || "no field changes"}`, before, after });
  return ok({ entry: after });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { kind, id } = await params;
  const cfg = kindConfig(kind);
  const user = await requireApiUser(["ADMIN", "PROPERTY"]);
  const before = await getEntry(kind as EntryKind, id);
  await assertEdit(user, before.business_id);
  await assertMonthOpen(user, before.business_id, cfg.dateOf(before as unknown as Record<string, unknown>));
  const after = await softDeleteEntry(kind as EntryKind, before, user.id);
  await audit({ user, action: "DELETE", entity: cfg.entity, entityId: id, businessId: before.business_id, summary: `Removed ${cfg.label(before as unknown as Record<string, unknown>)}`, before, after });
  return ok({ ok: true });
});
