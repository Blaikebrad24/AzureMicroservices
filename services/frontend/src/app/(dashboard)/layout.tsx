import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const navigation = [
  { name: "Overview", href: "/dashboard" },
  { name: "Blob Storage", href: "/dashboard/blobs" },
  { name: "Reports", href: "/dashboard/reports" },
  { name: "Data", href: "/dashboard/data" },
];

const adminNavigation = [
  { name: "Admin", href: "/dashboard/admin" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = user?.roles.includes("admin") ?? false;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.name}
            </Link>
          ))}
          {isAdmin &&
            adminNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 hover:text-red-900"
              >
                {item.name}
              </Link>
            ))}
        </nav>
        {/* User info */}
        <div className="absolute bottom-0 w-64 border-t border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium">{user?.username ?? "Unknown"}</p>
            <p className="text-xs text-gray-400">
              {user?.roles.join(", ") ?? "No roles"}
            </p>
          </div>
          <a
            href="/auth/logout"
            className="mt-2 block text-xs text-red-600 hover:text-red-800"
          >
            Sign out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
