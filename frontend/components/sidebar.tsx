"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Truck,
  Package,
  Zap,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  submenu?: { label: string; href: string }[];
}

const menuItems: SidebarItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    href: "/dashboard",
  },
  {
    label: "Quản lý xe",
    icon: <Truck size={20} />,
    submenu: [
      { label: "Danh sách xe", href: "/trucks" },
      { label: "Thêm xe mới", href: "/trucks/register" },
    ],
  },
  {
    label: "Quản lý đơn hàng",
    icon: <Package size={20} />,
    submenu: [
      { label: "Danh sách đơn", href: "/shipments" },
      { label: "Tạo đơn hàng", href: "/shipments/create" },
    ],
  },
  {
    label: "Ghép chuyến",
    icon: <Zap size={20} />,
    href: "/matching",
  },
  {
    label: "Hợp đồng",
    icon: <FileText size={20} />,
    href: "/deals",
  },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const pathname = usePathname();

  const isActive = (href?: string) =>
    href === pathname || pathname.startsWith(href || "");

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white transition-transform duration-200 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-700 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 font-bold">
            FC
          </div>
          <div>
            <p className="font-bold text-white">FreshChain AI</p>
            <p className="text-xs text-slate-400">Logistics Platform</p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {menuItems.map((item) => {
            const hasSubmenu = !!item.submenu;
            const isItemActive = isActive(item.href);
            const isExpanded = expandedItem === item.label;

            return (
              <div key={item.label}>
                {hasSubmenu ? (
                  <button
                    onClick={() =>
                      setExpandedItem(isExpanded ? null : item.label)
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-4 py-3 transition-colors ${
                      isExpanded
                        ? "bg-slate-800 text-emerald-400"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <Link href={item.href!}>
                    <div
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                        isItemActive
                          ? "bg-emerald-500 text-white"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                )}

                {/* Submenu */}
                {hasSubmenu && isExpanded && (
                  <div className="ml-2 space-y-1 border-l-2 border-slate-700">
                    {item.submenu.map((subitem) => (
                      <Link key={subitem.href} href={subitem.href}>
                        <div
                          className={`flex items-center gap-3 rounded-lg px-4 py-2 pl-6 transition-colors ${
                            isActive(subitem.href)
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          <span className="text-sm font-medium">
                            {subitem.label}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 px-3 py-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          >
            <LogOut size={20} />
            <span className="ml-3">Đăng xuất</span>
          </Button>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
