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

/**
 * Chấp nhận biển số dạng seri 4 số ("51C-7800") hoặc 5 số, có hoặc không có
 * dấu chấm nhóm số ("51C-78001" / "51C-780.01") — dùng chung cho form đăng ký,
 * sửa nhanh và trang sửa xe, để khớp với định dạng Copilot tạo ra (luôn có dấu chấm).
 */
export const PLATE_NUMBER_REGEX =
  /^[0-9]{2}[A-Z]-[0-9]{4}$|^[0-9]{2}[A-Z]-[0-9]{3}\.?[0-9]{2}$/;

/** Ví dụ hiển thị cho placeholder/thông báo lỗi biển số. */
export const PLATE_NUMBER_EXAMPLE = "51C-780.01";

/** Tuyến xe có thể được lưu dạng "A -> B" (form) hoặc legacy "A đi B" (Copilot cũ). */
export function splitTruckRoute(route?: string) {
  const [origin = "", destination = ""] = (route || "")
    .split(/\s*->\s*|\s+đi\s+/)
    .map((part) => part.trim());
  return { origin, destination };
}
