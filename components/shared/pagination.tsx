"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) =>
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - page) <= 1
  );

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-700">{start}</span> to{" "}
        <span className="font-semibold text-slate-700">{end}</span> of{" "}
        <span className="font-semibold text-slate-700">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={14} />
          Prev
        </Button>

        <div className="flex items-center gap-2">
          {visiblePages.map((pageNumber, index) => {
            const previous = visiblePages[index - 1];
            const showEllipsis = previous && pageNumber - previous > 1;

            return (
              <div key={pageNumber} className="flex items-center gap-2">
                {showEllipsis && <span className="px-1 text-sm text-slate-400">…</span>}
                <Button
                  variant={pageNumber === page ? "primary" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className="min-w-9"
                >
                  {pageNumber}
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
