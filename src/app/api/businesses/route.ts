import { insert, newId, nowIso } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/rbac";
import { businessInput } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const GET = route(async () => {
  const user = await requireApiUser();
  const access = await getAccess(user);
  return ok({
    businesses: access.businesses.map((b) => ({ ...b, canEdit: access.edit.has(b.id) })),
  });
});

export const POST = route(async (req) => {
  const user = await requireApiUser(["ADMIN"]);
  const data = businessInput.parse(await req.json());
  const row = { id: newId("BIZ"), ...data, currency: "INR", created_at: nowIso(), updated_at: nowIso() };
  await insert("Businesses", row);
  await audit({ user, action: "CREATE", entity: "Business", entityId: row.id, businessId: row.id, summary: `Created business ${row.name}`, after: row });
  return ok({ business: row }, 201);
});
