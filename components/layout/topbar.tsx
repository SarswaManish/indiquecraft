"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { Role } from "@prisma/client";

export function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div />
      <div className="flex items-center gap-3">
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
