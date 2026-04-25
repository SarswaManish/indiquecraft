import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn("rounded-2xl border border-white/70 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn("border-b border-slate-100 px-5 py-4 sm:px-6", className)}>{children}</div>
  );
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn("px-5 py-4 sm:px-6", className)}>{children}</div>;
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <h3 className={cn("text-base font-semibold text-gray-900", className)}>{children}</h3>
  );
}
