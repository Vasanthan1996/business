import { all, insert, newId, nowIso, replace } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { shareholdersInput } from "@/lib/validation";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/** Replace the investor list. Removed investors are marked INACTIVE. */
export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser(["ADMIN"]);
  const list = shareholdersInput.parse(await req.json());
  const existing = (await all("Shareholders")).filter((s) => s.business_id === id);
  const keep = new Set(list.map((s) => s.id).filter(Boolean));
  const fmt = (xs: { name: string; share_pct: number }[]) => xs.map((s) => `${s.name} ${s.share_pct}%`).join(", ");

  for (const s of existing) {
    if (!keep.has(s.id) && s.status !== "INACTIVE") {
      await replace("Shareholders", s.id, { ...s, status: "INACTIVE", updated_at: nowIso() });
    }
  }
  for (const s of list) {
    const before = existing.find((e) => e.id === s.id);
    if (before) {
      await replace("Shareholders", before.id, { ...before, ...s, status: "ACTIVE", updated_at: nowIso() });
    } else {
      await insert("Shareholders", { ...s, id: newId("SH"), business_id: id, status: "ACTIVE", created_at: nowIso(), updated_at: nowIso() });
    }
  }
  const prev = existing.filter((s) => s.status !== "INACTIVE");
  await audit({
    user, action: "UPDATE", entity: "Investor shares", entityId: id, businessId: id,
    summary: `Investor split: ${fmt(prev) || "(none)"} → ${fmt(list)}`,
    before: { investors: prev }, after: { investors: list },
  });
  return ok({ shareholders: (await all("Shareholders")).filter((s) => s.business_id === id && s.status !== "INACTIVE") });
});
