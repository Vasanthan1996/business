import { ok, route, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { assertView } from "@/lib/rbac";
import { buildReport } from "@/lib/reports";
import { monthParam } from "@/lib/validation";

export const GET = route(async (req) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId") ?? "";
  const month = monthParam.parse(url.searchParams.get("month"));
  await assertView(user, businessId);
  const data = await buildReport(businessId, month);
  if (!data) throw new HttpError(404, "Business not found");
  return ok(data);
});
