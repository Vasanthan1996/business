import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { currentMonth } from "@/lib/dates";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  return <Dashboard user={user} initialMonth={currentMonth()} />;
}
