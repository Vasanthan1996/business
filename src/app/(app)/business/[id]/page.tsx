import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/rbac";
import { currentMonth } from "@/lib/dates";
import { BusinessView } from "@/components/business/BusinessView";

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const access = await getAccess(user);
  if (!access.view.has(id)) redirect("/dashboard");
  return <BusinessView businessId={id} user={user} initialMonth={currentMonth()} />;
}
