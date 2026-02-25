"use client";

import { Bell, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TopNavProps {
  user: { username: string; roles: string[] } | null;
}

export function TopNav({ user }: TopNavProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-blue-800/30 bg-gradient-to-r from-blue-950/80 to-slate-900/80 px-6 backdrop-blur-sm">
      {/* Search */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
        <input
          type="text"
          placeholder="Search..."
          className="h-9 w-full rounded-lg border border-blue-700/30 bg-blue-900/30 pl-9 pr-4 text-sm text-white placeholder-blue-400 outline-none transition-colors focus:border-blue-500 focus:bg-blue-900/50"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-blue-300 transition-colors hover:bg-blue-800/30 hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400" />
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-blue-800/30 outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white">
                {user?.username?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-white">
                {user?.username ?? "Unknown"}
              </p>
              <p className="text-xs text-blue-300">
                {user?.roles[0] ?? "viewer"}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 border-blue-700/30 bg-blue-950"
          >
            <DropdownMenuLabel className="text-blue-200">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-blue-800/30" />
            <DropdownMenuItem className="text-blue-100 focus:bg-blue-800/30 focus:text-white">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-blue-100 focus:bg-blue-800/30 focus:text-white">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-blue-800/30" />
            <DropdownMenuItem
              className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
              onClick={() => {
                window.location.href = "/auth/logout";
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
