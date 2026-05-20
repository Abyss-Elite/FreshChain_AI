"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, DollarSign, Package, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/demo-data";

export default function AdminPage() {
  return (
    <AppShell title="Admin Analytics" subtitle="Admin theo doi user, don hang, tuyen van chuyen va bao cao van hanh.">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Users" value="63" caption="Shipper, carrier, admin" icon={Users} />
        <MetricCard title="Orders" value="30" caption="Demo seed data" icon={Package} />
        <MetricCard title="Revenue" value="428M" caption="VND GMV demo" icon={DollarSign} />
        <MetricCard title="Reports" value="7" caption="Can xu ly" icon={BarChart3} />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader><CardTitle>Route utilization</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routes}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="from" /><YAxis /><Tooltip />
                <Bar dataKey="utilization" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quan ly bao cao</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {["Temperature alert tren xe 51C-78001", "Xe cham 20 phut tuyen Can Tho", "Don SHP-1025 dang negotiating qua 2h"].map((item) => <div key={item} className="rounded-md border p-3 text-sm">{item}</div>)}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
