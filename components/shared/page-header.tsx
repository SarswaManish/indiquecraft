import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur md:flex-row md:items-start md:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-500">
          Factory workspace
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 md:justify-end">{actions}</div>}
    </div>
  );
}
