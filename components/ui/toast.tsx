"use client";

import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

const toneStyles: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.12)] backdrop-blur",
              toneStyles[toast.tone]
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {toast.tone === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs leading-5 opacity-80">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-full p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
