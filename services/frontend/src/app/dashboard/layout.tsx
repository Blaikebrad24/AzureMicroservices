import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = user?.roles.includes("admin") ?? false;

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar user={user} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <TopNav user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
