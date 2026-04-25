"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  ShoppingCart,
  ClipboardList,
  Factory,
  Send,
  BarChart2,
  ChevronRight,
  X,
} from "lucide-react";
import { Role } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Vendor Requests", href: "/vendor-requests", icon: ClipboardList, roles: ["ADMIN", "OWNER", "PURCHASE_COORDINATOR", "ORDER_MANAGER"] },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Products", href: "/products", icon: Package },
  { label: "Vendors", href: "/vendors", icon: Truck },
  { label: "Production", href: "/production", icon: Factory, roles: ["ADMIN", "OWNER", "PRODUCTION_MANAGER", "ORDER_MANAGER"] },
  { label: "Dispatch", href: "/dispatch", icon: Send, roles: ["ADMIN", "OWNER", "DISPATCH_MANAGER", "ORDER_MANAGER"] },
  { label: "Reports", href: "/reports", icon: BarChart2, roles: ["ADMIN", "OWNER", "ORDER_MANAGER"] },
];

export function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as Role | undefined;

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <aside
      className={cn(
        "min-h-screen border-r border-slate-800/80 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_28rem),linear-gradient(180deg,#0f172a_0%,#111827_45%,#0b1220_100%)] flex flex-col",
        className
      )}
    >
      {/* Logo */}
      <div className="border-b border-slate-800/80 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 shadow-inner ring-1 ring-white/10">
            <span className="text-white font-bold text-sm">IC</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">IndiqueCraft</p>
            <p className="text-slate-400 text-xs">Factory Manager</p>
          </div>
          {onNavigate && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onNavigate}
              className="ml-auto rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10"
                  : "text-slate-400 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {session?.user && (
        <div className="border-t border-slate-800/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{session.user.name}</p>
              <p className="text-slate-500 text-xs truncate">{session.user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
