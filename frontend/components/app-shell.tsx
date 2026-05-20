"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { BarChart3, Boxes, Handshake, LayoutDashboard, Map, Menu, Moon, PackagePlus, Route, ShieldAlert, Sun, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/shipments/create", label: "Tao don", icon: PackagePlus },
  { href: "/trucks/register", label: "Dang xe", icon: Truck },
  { href: "/matching", label: "AI Matching", icon: Route },
  { href: "/aggregation", label: "Multi-truck", icon: Boxes },
  { href: "/tracking", label: "Tracking", icon: Map },
  { href: "/compatibility", label: "Compatibility", icon: ShieldAlert },
  { href: "/deals", label: "Deal Price", icon: Handshake },
  { href: "/orders", label: "Orders", icon: Menu },
  { href: "/admin", label: "Admin", icon: Users }
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-card/70 p-4 lg:block">
        <Link href="/" className="mb-7 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-lg bg-emerald-500 text-white"><Route size={21} /></div>
          <div>
            <p className="font-bold">FreshChain AI</p>
            <p className="text-xs text-muted-foreground">Logistics optimization</p>
          </div>
        </Link>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                pathname === item.href && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">FreshChain AI Console</p>
            <h1 className="text-xl font-bold lg:text-2xl">{title}</h1>
            <p className="hidden text-sm text-muted-foreground md:block">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="lg:hidden" aria-label="Open menu"><Menu size={18} /></Button>
            <Button variant="outline" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="hidden dark:block" size={18} />
              <Moon className="dark:hidden" size={18} />
            </Button>
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
