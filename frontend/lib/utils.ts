import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vnd(value: number | string | null | undefined) {
  const num = typeof value === "string" ? Number(value) : Number(value ?? 0);
  if (Number.isNaN(num)) return "0 VND";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Lowercases and strips Vietnamese diacritics so search matching works
 * regardless of accents, e.g. "oa" matches "Xoài".
 */
export function normalizeSearchText(value?: string | null) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
