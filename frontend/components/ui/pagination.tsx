"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

function getPageList(current: number, total: number): (number | "...")[] {
  const delta = 1;
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);

  const range: (number | "...")[] = [1];
  if (rangeStart > 2) range.push("...");
  for (let i = rangeStart; i <= rangeEnd; i++) range.push(i);
  if (rangeEnd < total - 1) range.push("...");
  if (total > 1) range.push(total);

  return range;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageList(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
      {totalItems != null && pageSize != null && (
        <p className="text-xs text-slate-500">
          Hiển thị {(page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, totalItems)} / {totalItems}
        </p>
      )}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} />
        </Button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-colors ${
                p === page
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
