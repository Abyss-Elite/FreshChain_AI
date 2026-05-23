"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200 bg-white/95 px-3 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} title="Mo menu">
            <Menu size={22} />
          </Button>
          <span className="ml-2 truncate text-sm font-semibold text-slate-900">FreshChain AI</span>
        </header>
        <div className="mx-auto min-h-screen w-full max-w-6xl p-3 sm:p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
