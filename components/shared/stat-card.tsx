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
  blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", text: "text-blue-700" },
  red: { bg: "bg-red-50", icon: "bg-red-100 text-red-600", text: "text-red-700" },
  green: { bg: "bg-green-50", icon: "bg-green-100 text-green-600", text: "text-green-700" },
  yellow: { bg: "bg-yellow-50", icon: "bg-yellow-100 text-yellow-600", text: "text-yellow-700" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", text: "text-purple-700" },
  orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600", text: "text-orange-700" },
  gray: { bg: "bg-gray-50", icon: "bg-gray-100 text-gray-600", text: "text-gray-700" },
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
    <div className={cn("rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={cn("text-3xl font-bold mt-1", c.text)}>{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-2xl p-3 ring-1 ring-black/5", c.icon)}>
            <Icon size={22} />
          </div>
        )}
      </div>
      <div className={cn("mt-4 h-1.5 rounded-full", c.bg)}>
        <div className={cn("h-1.5 rounded-full opacity-35", c.icon.split(" ").at(-1))} />
      </div>
    </div>
  );
}
