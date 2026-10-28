import bcrypt from "bcryptjs";
import { z } from "zod";
import { all, nowIso, replace } from "@/lib/db";
import { ok, route, HttpError } from "@/lib/http";
import { startSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const body = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1) });

// Simple per-instance throttle against password guessing.
const attempts = new Map<string, { n: number; until: number }>();

export const POST = route(async (req) => {
  const { email, password } = body.parse(await req.json());
  const a = attempts.get(email);
  if (a && a.until > Date.now()) {
    throw new HttpError(429, "Too many attempts. Wait a minute and try again.");
  }
  const user = (await all("Users")).find((u) => u.email.toLowerCase() === email);
  const valid = user && user.status === "ACTIVE" && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    throw new HttpError(401, "That email and password don't match an active account.");
  }
  attempts.delete(email);
  const session = { id: user.id, name: user.name, email: user.email, role: user.role };
  await startSession(session);
  await replace("Users", user.id, { ...user, last_login_at: nowIso() });
  await audit({ user: session, action: "LOGIN", entity: "User", entityId: user.id, summary: "Signed in" });
  return ok({ user: session });
});
