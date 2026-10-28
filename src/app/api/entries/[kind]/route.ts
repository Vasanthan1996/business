import { ok, route, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { assertEdit, assertMonthOpen, assertView } from "@/lib/rbac";
import { assertNoOverlap, createEntry, kindConfig, listEntries } from "@/lib/entries";
import { findById } from "@/lib/db";
import { audit } from "@/lib/audit";
import { monthParam } from "@/lib/validation";
import type { EntryKind } from "@/lib/types";

type Ctx = { params: Promise<{ kind: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const { kind } = await params;
  kindConfig(kind);
  const user = await requireApiUser();
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId") ?? "";
  const month = url.searchParams.get("month");
  await assertView(user, businessId);
  const entries = await listEntries(kind as EntryKind, businessId, month ? monthParam.parse(month) : undefined);
  return ok({ entries });
});

export const POST = route<Ctx>(async (req, { params }) => {
  const { kind } = await params;
  const cfg = kindConfig(kind);
  const user = await requireApiUser(["ADMIN", "PROPERTY"]);
  const data = cfg.schema.parse(await req.json()) as Record<string, unknown>;
  const businessId = String(data.business_id);
  await assertEdit(user, businessId);
  await assertMonthOpen(user, businessId, cfg.dateOf(data));
  if (kind === "bookings") {
    const unit = await findById("Units", String(data.unit_id));
    if (!unit || unit.business_id !== businessId) throw new HttpError(400, "That room doesn't belong to this business.");
    await assertNoOverlap(data as { business_id: string; unit_id: string; check_in: string; check_out: string });
  }
  const row = await createEntry(kind as EntryKind, data, user.id);
  await audit({ user, action: "CREATE", entity: cfg.entity, entityId: String(row.id), businessId, summary: `Added ${cfg.label(row)}`, after: row });
  return ok({ entry: row }, 201);
});
