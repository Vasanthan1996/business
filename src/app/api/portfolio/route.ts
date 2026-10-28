import { ok, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/rbac";
import { buildPortfolio } from "@/lib/reports";
import { monthParam } from "@/lib/validation";

export const GET = route(async (req) => {
  const user = await requireApiUser();
  const month = monthParam.parse(new URL(req.url).searchParams.get("month"));
  const access = await getAccess(user);
  const ids = new Set(access.businesses.map((b) => b.id));
  return ok(await buildPortfolio(ids, month, user.id));
});
