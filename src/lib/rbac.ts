import "server-only";
import { many } from "./db";
import { HttpError } from "./http";
import type { Business, SessionUser } from "./types";

/**
 * Role-based access rules — the single place that decides who sees what.
 *
 *  ADMIN     sees and edits every business, manages users and configuration.
 *  PROPERTY  sees and edits only businesses assigned with access MANAGE.
 *  USER      read-only; sees businesses assigned with access VIEW, plus any
 *            business where they are listed as a shareholder.
 */
export interface AccessMap {
  view: Set<string>;
  edit: Set<string>;
  businesses: Business[];
}

export async function getAccess(user: SessionUser): Promise<AccessMap> {
  const { Businesses, Assignments, Shareholders } = await many([
    "Businesses", "Assignments", "Shareholders",
  ]);
  const active = Businesses.filter((b) => b.status !== "ARCHIVED");

  if (user.role === "ADMIN") {
    const ids = new Set(Businesses.map((b) => b.id));
    return { view: ids, edit: ids, businesses: Businesses };
  }

  const view = new Set<string>();
  const edit = new Set<string>();
  for (const a of Assignments.filter((a) => a.user_id === user.id)) {
    view.add(a.business_id);
    if (user.role === "PROPERTY" && a.access === "MANAGE") edit.add(a.business_id);
  }
  for (const s of Shareholders) {
    if (s.user_id === user.id && s.status !== "INACTIVE") view.add(s.business_id);
  }
  return { view, edit, businesses: active.filter((b) => view.has(b.id)) };
}

export async function assertView(user: SessionUser, businessId: string) {
  const a = await getAccess(user);
  if (!a.view.has(businessId)) throw new HttpError(403, "You don't have access to this business.");
  return a;
}

export async function assertEdit(user: SessionUser, businessId: string) {
  const a = await getAccess(user);
  if (!a.edit.has(businessId)) throw new HttpError(403, "Your account can view this business but not change it.");
  return a;
}

/** Managers can't change entries in a month the admin has locked. */
export async function assertMonthOpen(user: SessionUser, businessId: string, isoDate: string) {
  if (user.role === "ADMIN") return;
  const month = isoDate.slice(0, 7);
  const { Periods } = await many(["Periods"]);
  const locked = Periods.find(
    (p) => p.business_id === businessId && p.month === month && p.status === "LOCKED",
  );
  if (locked) {
    throw new HttpError(423, `${month} is locked for payouts. Ask the admin to unlock it before making changes.`);
  }
}
