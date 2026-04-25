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
    <aside className={cn("min-h-screen bg-gray-900 flex flex-col", className)}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">IC</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">IndiqueCraft</p>
            <p className="text-gray-400 text-xs">Factory Manager</p>
          </div>
          {onNavigate && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onNavigate}
              className="ml-auto rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
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
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
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
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{session.user.name}</p>
              <p className="text-gray-500 text-xs truncate">{session.user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
