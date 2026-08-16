import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = { title: "管理后台" };

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has("admin_session")) redirect("/admin/login");

  return <AdminDashboard />;
}
