"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  {
    label: "Xe",
    icon: Truck,
    submenu: [{ label: "Danh sach xe", href: "/trucks" }],
  },
  {
    label: "Don hang",
    icon: Package,
    submenu: [{ label: "Danh sach don", href: "/shipments" }],
  },
  { label: "Ghep hang", icon: Zap, href: "/matching" },
  { label: "Thuong luong", icon: FileText, href: "/deals" },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>("Xe");

  const active = (href?: string) => !!href && (pathname === href || pathname.startsWith(`${href}/`));

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
            <p className="truncate text-xs text-slate-400">Smart logistics</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expanded === item.label;
            const hasSubmenu = "submenu" in item;

            if (hasSubmenu) {
              return (
                <div key={item.label}>
                  <button
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={() => setExpanded(isExpanded ? null : item.label)}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={18} />
                      {item.label}
                    </span>
                    <ChevronDown size={16} className={cn("transition", isExpanded && "rotate-180")} />
                  </button>
                  {isExpanded && (
                    <div className="mt-1 space-y-1 border-l border-white/10 pl-3">
                      {item.submenu?.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onClose}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white",
                            active(sub.href) && "bg-emerald-500/15 text-emerald-300",
                          )}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
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

        <div className="border-t border-white/10 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
          >
            <LogOut size={18} />
            Dang xuat
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
    </>
  );
}
