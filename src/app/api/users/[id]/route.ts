import bcrypt from "bcryptjs";
import { hardDelete, insert, many, newId, nowIso, replace } from "@/lib/db";
import { ok, route, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { userInput } from "@/lib/validation";
import { audit, describeChanges } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const admin = await requireApiUser(["ADMIN"]);
  const { Users, Assignments } = await many(["Users", "Assignments"]);
  const before = Users.find((u) => u.id === id);
  if (!before) throw new HttpError(404, "User not found");
  const data = userInput.partial().parse(await req.json());
  if (id === admin.id && (data.role && data.role !== "ADMIN" || data.status === "DISABLED")) {
    throw new HttpError(400, "You can't remove your own admin access. Ask another admin to do it.");
  }
  if (data.email && Users.some((u) => u.id !== id && u.email.toLowerCase() === data.email)) {
    throw new HttpError(409, "Another account already uses that email.");
  }
  const after = {
    ...before,
    name: data.name ?? before.name,
    email: data.email ?? before.email,
    role: data.role ?? before.role,
    status: data.status ?? before.status,
    phone: data.phone ?? before.phone,
    password_hash: data.password ? await bcrypt.hash(data.password, 10) : before.password_hash,
    updated_at: nowIso(),
  };
  await replace("Users", id, after);

  // Sync business assignments.
  let assignmentNote = "";
  if (data.business_ids) {
    const current = Assignments.filter((a) => a.user_id === id);
    const wanted = after.role === "ADMIN" ? [] : data.business_ids;
    const access = after.role === "PROPERTY" ? "MANAGE" : "VIEW";
    for (const a of current) {
      if (!wanted.includes(a.business_id) || a.access !== access) await hardDelete("Assignments", a.id);
    }
    for (const b of wanted) {
      if (!current.some((a) => a.business_id === b && a.access === access)) {
        await insert("Assignments", { id: newId("AS"), user_id: id, business_id: b, access, created_at: nowIso(), created_by: admin.id });
      }
    }
    const before = current.map((a) => a.business_id).sort().join(",");
    if (before !== [...wanted].sort().join(",")) assignmentNote = `businesses ${before || "(none)"} → ${wanted.join(",") || "(none)"}`;
  }
  const changes = [describeChanges(before, after), data.password ? "password reset" : "", assignmentNote].filter(Boolean).join("; ");
  await audit({ user: admin, action: "UPDATE", entity: "User", entityId: id, summary: `${after.name}: ${changes || "no changes"}`, before, after });
  const { password_hash: _p, ...safe } = after;
  void _p;
  return ok({ user: safe });
});

/** "Remove" disables the account and drops its access; the row stays for the audit trail. */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const admin = await requireApiUser(["ADMIN"]);
  if (id === admin.id) throw new HttpError(400, "You can't remove your own account.");
  const { Users, Assignments } = await many(["Users", "Assignments"]);
  const before = Users.find((u) => u.id === id);
  if (!before) throw new HttpError(404, "User not found");
  await replace("Users", id, { ...before, status: "DISABLED", updated_at: nowIso() });
  for (const a of Assignments.filter((x) => x.user_id === id)) await hardDelete("Assignments", a.id);
  await audit({ user: admin, action: "DELETE", entity: "User", entityId: id, summary: `Removed ${before.name} (${before.email}) and their business access`, before });
  return ok({ ok: true });
});
