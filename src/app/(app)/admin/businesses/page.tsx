import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { BusinessesAdmin } from "@/components/admin/BusinessesAdmin";

export const metadata: Metadata = { title: "Businesses & shares" };

export default async function Page() {
  await requirePageUser(["ADMIN"]);
  return <BusinessesAdmin />;
}
