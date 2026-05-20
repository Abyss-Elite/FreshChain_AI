"use client";

import { Boxes, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shipments, trucks } from "@/lib/demo-data";
import { vnd } from "@/lib/utils";

export default function AggregationPage() {
  const selected = trucks.filter((t) => t.refrigerated).slice(0, 3);
  const totalCapacity = selected.reduce((s, t) => s + t.remainingKg, 0);
  return (
    <AppShell title="Multi-truck Aggregation" subtitle="Gom nhieu xe phu hop khi doanh nghiep can nhieu xe cung tuyen.">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="text-sky-500" /> Nhu cau demo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <h2 className="text-2xl font-bold">Can 5 xe lanh</h2>
            <p className="text-muted-foreground">Tuyen Da Lat to TP.HCM cho lo hang rau cu va trai cay can nhiet do 2C - 8C.</p>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Tong tai trong can</p><b className="text-2xl">12,000 kg</b></div>
            <Button className="w-full">Tu dong gom xe</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ket qua aggregation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Xe phu hop</p><b className="text-2xl">{selected.length}/5</b></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Tong tai trong trong</p><b className="text-2xl">{totalCapacity} kg</b></div>
              <div className="rounded-md border p-4"><p className="text-sm text-muted-foreground">Tong chi phi uoc tinh</p><b className="text-2xl">{vnd(13800000)}</b></div>
            </div>
            {selected.map((truck) => <div key={truck.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"><div><b>{truck.plate}</b><p className="text-sm text-muted-foreground">{truck.type} | {truck.remainingKg}kg trong | ETA {truck.eta}</p></div><Badge tone="green"><CheckCircle2 size={12} /> Compatible</Badge></div>)}
            <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">Goi y ghep them don {shipments[2].cargoType} 850kg de day utilization len 91%.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
