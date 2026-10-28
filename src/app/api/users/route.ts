import bcrypt from "bcryptjs";
import { all, insert, insertMany, many, newId, nowIso } from "@/lib/db";
import { ok, route, HttpError } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { userInput } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const GET = route(async () => {
  await requireApiUser(["ADMIN"]);
  const { Users, Assignments } = await many(["Users", "Assignments"]);
  return ok({
    users: Users.map(({ password_hash: _p, ...u }) => {
      void _p;
      return { ...u, business_ids: Assignments.filter((a) => a.user_id === u.id).map((a) => a.business_id) };
    }),
  });
});

export const POST = route(async (req) => {
  const admin = await requireApiUser(["ADMIN"]);
  const data = userInput.parse(await req.json());
  if (!data.password) throw new HttpError(400, "password: set a starting password (8+ characters)");
  if ((await all("Users")).some((u) => u.email.toLowerCase() === data.email)) {
    throw new HttpError(409, "An account with that email already exists.");
  }
  const user = {
    id: newId("USR"), name: data.name, email: data.email, role: data.role, status: data.status, phone: data.phone,
    password_hash: await bcrypt.hash(data.password, 10), created_at: nowIso(), updated_at: nowIso(), last_login_at: "",
  };
  await insert("Users", user);
  if (data.role !== "ADMIN" && data.business_ids.length) {
    await insertMany("Assignments", data.business_ids.map((business_id) => ({
      id: newId("AS"), user_id: user.id, business_id, access: data.role === "PROPERTY" ? "MANAGE" : "VIEW",
      created_at: nowIso(), created_by: admin.id,
    })));
  }
  await audit({ user: admin, action: "CREATE", entity: "User", entityId: user.id, summary: `Created ${data.role.toLowerCase()} account ${user.name} (${user.email})`, after: { ...user, business_ids: data.business_ids } });
  const { password_hash: _p, ...safe } = user;
  void _p;
  return ok({ user: safe }, 201);
});
