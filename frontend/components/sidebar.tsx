"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useUser } from "@/contexts/user-context";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Sparkles,
  Truck,
  Zap,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Tổng quan", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Đội xe", icon: Truck, href: "/trucks", roles: ["SHIPPER", "ADMIN"] },
  { label: "Đơn hàng", icon: Package, href: "/shipments", roles: ["CARRIER", "ADMIN"] },
  { label: "Ghép hàng", icon: Zap, href: "/matching" },
  { label: "Copilot nhập liệu", icon: Sparkles, href: "/create-order-ai" },
  { label: "Thương lượng", icon: FileText, href: "/deals" },
  { label: "Hợp đồng đã ký", icon: CheckCircle, href: "/signed-deals" },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();

  const active = (href?: string) =>
    !!href && (pathname === href || pathname.startsWith(`${href}/`));

  const handleLogout = async () => {
    try {
      logout();
      toast.success("Đã đăng xuất thành công");
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      toast.error("Lỗi đăng xuất. Vui lòng thử lại.");
    }
  };

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-white shadow-xl transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500 text-sm font-bold">
            FC
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">FreshChain AI</p>
            <p className="truncate text-xs text-slate-400">
              Ghép hàng thông minh
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems
            .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            .map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white",
                    active(item.href) && "bg-emerald-500 text-white",
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="border-t border-white/10 space-y-3 p-3">
          {user && (
            <div className="rounded-md bg-white/5 p-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 mb-1">
                {user.role === "SHIPPER" ? (
                  <Truck size={14} />
                ) : user.role === "CARRIER" ? (
                  <Package size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                <span className="font-semibold">
                  {user.role === "SHIPPER"
                    ? "Chủ Nhà Xe"
                    : user.role === "CARRIER"
                      ? "Chủ Hàng"
                      : "Quản Trị"}
                </span>
              </div>
              <p className="text-slate-400 truncate">{user.email}</p>
              {user.company && (
                <p className="text-slate-400 text-xs truncate mt-1">
                  {user.company}
                </p>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:bg-red-500/20 hover:text-red-300"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
