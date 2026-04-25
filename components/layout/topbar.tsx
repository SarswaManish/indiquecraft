"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { Role } from "@prisma/client";

export function Topbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { data: session } = useSession();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onMenuOpen} className="lg:hidden">
          <Menu size={18} />
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 sm:hidden">IndiqueCraft</p>
          <p className="text-xs text-gray-500 sm:hidden">{session?.user?.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <Bell size={18} />
        </button>
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{session.user.name}</p>
              <p className="text-xs text-gray-400">
                {ROLE_LABELS[session.user.role as Role]}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-500"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
