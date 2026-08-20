"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Boxes,
  Handshake,
  LayoutDashboard,
  Map,
  Menu,
  Moon,
  PackagePlus,
  Sparkles,
  Route,
  ShieldAlert,
  Sun,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { UserRoleBadge } from "@/components/user-role-badge";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/shipments/create", label: "Tạo đơn", icon: PackagePlus },
  { href: "/trucks/register", label: "Đăng xe", icon: Truck },
  { href: "/matching", label: "Ghép hàng", icon: Route },
  { href: "/create-order-ai", label: "Copilot nhập liệu", icon: Sparkles },
  { href: "/aggregation", label: "Ghép nhiều xe", icon: Boxes },
  { href: "/tracking", label: "Theo dõi", icon: Map },
  { href: "/compatibility", label: "Tương thích", icon: ShieldAlert },
  { href: "/deals", label: "Thương lượng", icon: Handshake },
  { href: "/orders", label: "Đơn hàng", icon: Menu },
  { href: "/admin", label: "Quản trị", icon: Users },
  { href: "/signed-deals", label: "Hợp đồng đã ký", icon: BarChart3 },
];

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      {/* SIDEBAR - Desktop Only */}
      <aside className="hidden border-r bg-card/70 p-4 lg:block">
        <Link href="/" className="mb-7 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-lg bg-emerald-500 text-white">
            <Route size={21} />
          </div>
          <div>
            <p className="font-bold">FreshChain Logistics</p>
            <p className="text-xs text-muted-foreground">Tối ưu vận tải</p>
          </div>
        </Link>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                pathname === item.href &&
                  "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* SIDEBAR MOBILE - Sheet Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-emerald-500 text-white">
                <Route size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">
                  FreshChain Logistics
                </p>
                <p className="truncate text-xs text-slate-500">
                  Tối ưu vận tải
                </p>
              </div>
            </Link>
          </SheetHeader>

          <nav className="space-y-1 px-3 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  pathname === item.href &&
                    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* MAIN CONTENT */}
      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          {/* LEFT: Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Trung tâm điều phối
            </p>
            <h1 className="truncate text-lg font-bold md:text-2xl">{title}</h1>
            <p className="hidden truncate text-sm text-muted-foreground md:block">
              {subtitle}
            </p>
          </div>

          {/* RIGHT: Badge + Menu Buttons */}
          <div className="flex shrink-0 items-center gap-2">
            {/* User Role Badge - Hidden on very small screens, short text on mobile */}
            <div className="hidden xs:block sm:hidden">
              <UserRoleBadge />
            </div>
            <div className="hidden sm:block">
              <UserRoleBadge />
            </div>

            {/* Hamburger Menu - Mobile Only */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              aria-label="Mở menu"
            >
              <Menu size={18} />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              aria-label="Đổi giao diện"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="hidden dark:block size-4" />
              <Moon className="dark:hidden size-4" />
            </Button>
          </div>
        </header>

        {/* PAGE CONTENT - Responsive Padding */}
        <div className="p-3 md:p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
