import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  color?: "blue" | "red" | "green" | "yellow" | "purple" | "orange" | "gray";
  subtext?: string;
  className?: string;
}

const colorMap = {
  blue: { bg: "from-blue-50 to-indigo-50", icon: "bg-blue-100 text-blue-600", text: "text-blue-700", accent: "bg-blue-500" },
  red: { bg: "from-rose-50 to-red-50", icon: "bg-red-100 text-red-600", text: "text-red-700", accent: "bg-red-500" },
  green: { bg: "from-emerald-50 to-green-50", icon: "bg-green-100 text-green-600", text: "text-green-700", accent: "bg-emerald-500" },
  yellow: { bg: "from-amber-50 to-yellow-50", icon: "bg-yellow-100 text-yellow-600", text: "text-yellow-700", accent: "bg-amber-500" },
  purple: { bg: "from-violet-50 to-fuchsia-50", icon: "bg-purple-100 text-purple-600", text: "text-purple-700", accent: "bg-violet-500" },
  orange: { bg: "from-orange-50 to-amber-50", icon: "bg-orange-100 text-orange-600", text: "text-orange-700", accent: "bg-orange-500" },
  gray: { bg: "from-slate-50 to-gray-50", icon: "bg-gray-100 text-gray-600", text: "text-gray-700", accent: "bg-slate-500" },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  subtext,
  className,
}: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/70 bg-gradient-to-br p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5",
        c.bg,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={cn("text-3xl font-bold mt-1", c.text)}>{value}</p>
          {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-2xl p-3 ring-1 ring-black/5 shadow-sm", c.icon)}>
            <Icon size={22} />
          </div>
        )}
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-white/70">
        <div className={cn("h-1.5 w-16 rounded-full opacity-85", c.accent)} />
      </div>
    </div>
  );
}
