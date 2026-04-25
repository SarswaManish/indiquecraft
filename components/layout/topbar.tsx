"use client";

import { signOut, useSession } from "next-auth/react";
import { CalendarDays, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { Role } from "@prisma/client";

export function Topbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { data: session } = useSession();
  const today = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/60 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onMenuOpen} className="lg:hidden">
          <Menu size={18} />
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">IndiqueCraft</p>
          <p className="text-xs text-slate-500">Factory workflow control panel</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:flex">
          <CalendarDays size={14} />
          {today}
        </div>
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{session.user.name}</p>
              <p className="text-xs text-slate-400">
                {ROLE_LABELS[session.user.role as Role]}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-slate-500"
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
