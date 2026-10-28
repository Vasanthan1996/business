import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const metadata: Metadata = { title: "Accounts" };

export default async function Page() {
  const user = await requirePageUser(["ADMIN"]);
  return <UsersAdmin me={user.id} />;
}
