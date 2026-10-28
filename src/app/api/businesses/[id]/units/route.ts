import { z } from "zod";
import { all, insert, newId, nowIso, replace } from "@/lib/db";
import { ok, route, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { unitInput } from "@/lib/validation";
import { audit, describeChanges } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/** Upsert the room list for a business. Rooms are deactivated, never deleted, so history stays intact. */
export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireApiUser(["ADMIN"]);
  const list = z.array(unitInput).parse(await req.json());
  const existing = (await all("Units")).filter((u) => u.business_id === id);
  for (const [i, u] of list.entries()) {
    const before = u.id ? existing.find((e) => e.id === u.id) : undefined;
    if (u.id && !before) throw new HttpError(404, `Room ${u.id} not found`);
    if (before) {
      const after = { ...before, ...u, id: before.id, sort: i };
      const changes = describeChanges(before, after);
      if (changes) {
        await replace("Units", before.id, after);
        await audit({ user, action: "UPDATE", entity: "Room", entityId: before.id, businessId: id, summary: `${after.name}: ${changes}`, before, after });
      }
    } else {
      const row = { ...u, id: newId("U"), business_id: id, sort: i, created_at: nowIso() };
      await insert("Units", row);
      await audit({ user, action: "CREATE", entity: "Room", entityId: row.id, businessId: id, summary: `Added ${row.floor_label} · ${row.name}`, after: row });
    }
  }
  return ok({ units: (await all("Units")).filter((u) => u.business_id === id) });
});
