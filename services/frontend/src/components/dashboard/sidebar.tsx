"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HardDrive,
  FileText,
  Database,
  Shield,
  LogOut,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Blob Storage", href: "/dashboard/blobs", icon: HardDrive },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Data", href: "/dashboard/data", icon: Database },
];

const adminNavigation = [
  { name: "Admin", href: "/dashboard/admin", icon: Shield },
];

interface SidebarProps {
  user: { username: string; roles: string[] } | null;
  isAdmin: boolean;
}

export function DashboardSidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="relative flex w-64 flex-col border-r border-blue-800/30 bg-gradient-to-b from-blue-950 to-slate-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-blue-800/30 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
          <LayoutDashboard className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-white">Dashboard</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-blue-400">
          Navigation
        </p>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
                  : "text-blue-200 hover:bg-blue-900/30 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <Separator className="my-3 bg-blue-800/30" />
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-blue-400">
              Administration
            </p>
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
                      : "text-blue-200 hover:bg-blue-900/30 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-blue-800/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white">
            {user?.username?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">
              {user?.username ?? "Unknown"}
            </p>
            <p className="truncate text-xs text-blue-300">
              {user?.roles.join(", ") ?? "No roles"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            window.location.href = "/auth/logout";
          }}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
