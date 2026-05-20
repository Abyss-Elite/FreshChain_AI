"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Package, Percent, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chartData, routes, shipments } from "@/lib/demo-data";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" subtitle="Tong quan don hang, tai trong, chi phi tiet kiem va heatmap tuyen duong.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Tong don hang" value="30" caption="+18% tuan nay" icon={Package} />
        <MetricCard title="Xe dang hoat dong" value="18" caption="Realtime tracking" icon={Truck} />
        <MetricCard title="Xe con tai trong" value="14" caption="San sang ghep don" icon={Truck} />
        <MetricCard title="Toi uu tai trong" value="82%" caption="+9% sau matching" icon={Percent} />
        <MetricCard title="Chi phi tiet kiem" value="186M" caption="VND thang nay" icon={DollarSign} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Bieu do van chuyen</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="ship" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" /><YAxis /><Tooltip />
                <Area type="monotone" dataKey="shipments" stroke="#10b981" fill="url(#ship)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Heatmap tuyen duong</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {routes.map((route) => (
              <div key={route.name} className="rounded-lg border p-4">
                <div className="flex justify-between"><b>{route.name}</b><Badge tone="blue">{route.orders} don</Badge></div>
                <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${route.utilization}%` }} /></div>
                <p className="mt-2 text-xs text-muted-foreground">Utilization {route.utilization}%</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Don gan day</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-2">Ma don</th><th>Hang hoa</th><th>Tuyen</th><th>Nhiet do</th><th>Status</th></tr></thead>
            <tbody>{shipments.map((s) => <tr key={s.id} className="border-t"><td className="py-3 font-semibold">{s.id}</td><td>{s.cargoType}</td><td>{s.pickup} to {s.dropoff}</td><td>{s.requiredTempMin}C to {s.requiredTempMax}C</td><td><Badge tone="green">{s.status}</Badge></td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
