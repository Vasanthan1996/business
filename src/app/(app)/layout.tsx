import { AppShell } from "@/components/shell/AppShell";
import { requirePageUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const access = await getAccess(user);
  const businesses = access.businesses
    .filter((b) => b.status !== "ARCHIVED")
    .map((b) => ({ id: b.id, name: b.name, type: b.type, canEdit: access.edit.has(b.id) }));
  return (
    <AppShell user={user} businesses={businesses}>
      {children}
    </AppShell>
  );
}
