import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/rbac";
import { currentMonth } from "@/lib/dates";
import { ReportsPicker } from "@/components/report/ReportsPicker";

export const metadata: Metadata = { title: "Monthly reports" };

export default async function ReportsPage() {
  const user = await requirePageUser();
  const access = await getAccess(user);
  return (
    <ReportsPicker
      isAdmin={user.role === "ADMIN"}
      initialMonth={currentMonth()}
      businesses={access.businesses.filter((b) => b.status !== "ARCHIVED").map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
