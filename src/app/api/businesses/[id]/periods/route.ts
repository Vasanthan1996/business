import { z } from "zod";
import { all, insert, newId, nowIso, replace } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { monthParam } from "@/lib/validation";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };
const body = z.object({ month: monthParam, status: z.enum(["OPEN", "LOCKED"]), note: z.string().max(200).default("") });

/** Lock a month once payouts are agreed, so managers can't change its numbers. */
export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser(["ADMIN"]);
  const { month, status, note } = body.parse(await req.json());
  const existing = (await all("Periods")).find((p) => p.business_id === id && p.month === month);
  const row = {
    id: existing?.id ?? newId("PER"), business_id: id, month, status,
    locked_by: status === "LOCKED" ? user.name : "", locked_at: status === "LOCKED" ? nowIso() : "", note,
  };
  if (existing) await replace("Periods", existing.id, row);
  else await insert("Periods", row);
  await audit({ user, action: status === "LOCKED" ? "LOCK" : "UNLOCK", entity: "Month", entityId: row.id, businessId: id, summary: `${status === "LOCKED" ? "Locked" : "Unlocked"} ${month}`, before: existing ?? null, after: row });
  return ok({ period: row });
});
