"use client";

import { useUser } from "@/contexts/user-context";
import { Badge } from "@/components/ui/badge";
import { Truck, Package } from "lucide-react";

export function UserRoleBadge() {
  const { user, loading } = useUser();

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  /**
   * QUY TẮC ĐỊNH DANH VAI TRÒ:
   * - SHIPPER = CHỦ NHÀ XE (người sở hữu xe, bên cung cấp dịch vụ vận chuyển)
   * - CARRIER = CHỦ HÀNG (người gửi hàng, bên yêu cầu vận chuyển)
   * - ADMIN = QUẢN TRỊ VIÊN
   */
  const roleConfig = {
    SHIPPER: {
      fullLabel: "Vai trò: Chủ Nhà Xe (Nhà Xe)",
      shortLabel: "Chủ Xe",
      icon: Truck,
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
    },
    CARRIER: {
      fullLabel: "Vai trò: Chủ Hàng (Chủ Doanh Nghiệp)",
      shortLabel: "Chủ Hàng",
      icon: Package,
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    },
    ADMIN: {
      fullLabel: "Vai trò: Quản Trị Viên",
      shortLabel: "Admin",
      icon: null,
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    },
  };

  const config = roleConfig[user.role];
  const Icon = config.icon;

  return (
    <>
      {/* Hiển thị full text trên desktop và tablet */}
      <Badge
        className={`${config.className} font-semibold hidden sm:inline-flex items-center gap-1`}
      >
        {Icon && <Icon size={14} />}
        <span className="hidden md:inline">{config.fullLabel}</span>
        <span className="md:hidden">{config.shortLabel}</span>
      </Badge>

      {/* Hiển thị icon only trên mobile khi quá chật */}
      <div
        className={`sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg font-semibold ${config.className}`}
        title={config.fullLabel}
      >
        {Icon && <Icon size={18} />}
      </div>
    </>
  );
}
