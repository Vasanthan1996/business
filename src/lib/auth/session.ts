import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./jwt";
import { findById } from "../db";
import type { Role, SessionUser } from "../types";
import { HttpError } from "../http";

/**
 * Reads the session cookie and re-checks the user against the Users tab, so
 * disabling an account or changing its role takes effect on the next request
 * rather than when the 12-hour token expires.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token);
  if (!claims) return null;
  const user = await findById("Users", claims.id);
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** For pages: send signed-out visitors to /login. */
export async function requirePageUser(roles?: Role[]): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  if (roles && !roles.includes(u.role)) redirect("/dashboard");
  return u;
}

/** For API routes: throw 401/403 instead of redirecting. */
export async function requireApiUser(roles?: Role[]): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new HttpError(401, "Sign in to continue.");
  if (roles && !roles.includes(u.role)) throw new HttpError(403, "Your account can't do this.");
  return u;
}

export async function startSession(user: SessionUser) {
  const token = await signSession(user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
