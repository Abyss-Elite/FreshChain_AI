"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert, Thermometer, Wind } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const checks = [
  { pair: "Sau rieng + Tao", warning: "Smell Conflict", status: "Not recommended", icon: Wind, tone: "red" as const },
  { pair: "Hai san dong lanh + Rau cu", warning: "Temperature Conflict", status: "Not recommended", icon: Thermometer, tone: "red" as const },
  { pair: "Rau la + Thung hang nang", warning: "Fragile Cargo Warning", status: "Warning", icon: AlertTriangle, tone: "amber" as const },
  { pair: "Dau tay + Rau la", warning: "Safe to combine", status: "Compatible", icon: CheckCircle2, tone: "green" as const }
];

export default function CompatibilityPage() {
  return (
    <AppShell title="Compatibility Rules" subtitle="Rule-based compatibility tu khai bao cua chu hang, danh muc va nhiet do.">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="text-amber-500" /> Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {["Sau rieng khong di chung trai cay khac", "Hai san khong di voi rau cu", "Hang dong lanh phai dung nhiet do", "Hang de dap khong di voi hang nang"].map((rule) => <div key={rule} className="rounded-md border p-3">{rule}</div>)}
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <Card key={check.pair} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm text-muted-foreground">Combination</p><h3 className="text-xl font-bold">{check.pair}</h3></div>
                <check.icon className="text-emerald-500" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone={check.tone}>{check.warning}</Badge>
                <Badge tone={check.tone}>{check.status}</Badge>
              </div>
              <div className="mt-5 h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${check.tone === "green" ? "bg-emerald-500" : check.tone === "amber" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: check.tone === "green" ? "92%" : check.tone === "amber" ? "64%" : "38%" }} /></div>
              <p className="mt-2 text-xs text-muted-foreground">Compatibility score</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
