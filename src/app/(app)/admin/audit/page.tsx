import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { AuditLogView } from "@/components/admin/AuditLogView";

export const metadata: Metadata = { title: "Change log" };

export default async function Page() {
  await requirePageUser(["ADMIN"]);
  return <AuditLogView />;
}
