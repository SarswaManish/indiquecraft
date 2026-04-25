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
    <div className={cn("bg-white rounded-lg border border-gray-200 p-5", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={cn("text-3xl font-bold mt-1", c.text)}>{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={cn("p-3 rounded-full", c.icon)}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
