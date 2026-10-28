import { all } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";

export const GET = route(async (req) => {
  await requireApiUser(["ADMIN"]);
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  const role = url.searchParams.get("role");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 300), 2000);
  const rows = (await all("AuditLog"))
    .filter((r) => (!businessId || r.business_id === businessId) && (!role || r.role === role))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
  return ok({ entries: rows });
});
