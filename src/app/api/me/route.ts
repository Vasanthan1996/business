import { ok, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/rbac";

export const GET = route(async () => {
  const user = await requireApiUser();
  const access = await getAccess(user);
  return ok({
    user,
    businesses: access.businesses.map((b) => ({ id: b.id, name: b.name, type: b.type, canEdit: access.edit.has(b.id) })),
  });
});
