import { many, nowIso, replace } from "@/lib/db";
import { ok, route, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { assertView } from "@/lib/rbac";
import { businessInput } from "@/lib/validation";
import { audit, describeChanges } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser();
  const access = await assertView(user, id);
  const d = await many(["Businesses", "Units", "Shareholders", "Assignments", "Users", "Periods"]);
  const business = d.Businesses.find((b) => b.id === id);
  if (!business) throw new HttpError(404, "Business not found");
  const people = (ids: string[]) =>
    d.Users.filter((u) => ids.includes(u.id)).map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email }));
  const assigned = d.Assignments.filter((a) => a.business_id === id);
  return ok({
    business,
    canEdit: access.edit.has(id),
    units: d.Units.filter((u) => u.business_id === id).sort((a, b) => a.sort - b.sort || a.floor - b.floor),
    shareholders: d.Shareholders.filter((s) => s.business_id === id && s.status !== "INACTIVE"),
    managers: people(assigned.filter((a) => a.access === "MANAGE").map((a) => a.user_id)),
    viewers: people(assigned.filter((a) => a.access === "VIEW").map((a) => a.user_id)),
    lockedMonths: d.Periods.filter((p) => p.business_id === id && p.status === "LOCKED").map((p) => p.month),
  });
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser(["ADMIN"]);
  const { Businesses } = await many(["Businesses"]);
  const before = Businesses.find((b) => b.id === id);
  if (!before) throw new HttpError(404, "Business not found");
  const data = businessInput.partial().parse(await req.json());
  const after = { ...before, ...data, updated_at: nowIso() };
  await replace("Businesses", id, after);
  await audit({ user, action: "UPDATE", entity: "Business", entityId: id, businessId: id, summary: describeChanges(before, after) || "No changes", before, after });
  return ok({ business: after });
});
