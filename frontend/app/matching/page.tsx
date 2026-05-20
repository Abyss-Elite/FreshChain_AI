"use client";

import { BrainCircuit, PackageCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchingCard } from "@/components/matching-card";
import { shipments, trucks } from "@/lib/demo-data";

export default function MatchingPage() {
  const shipment = shipments[0];
  return (
    <AppShell title="AI Matching Engine" subtitle="Rule-based scoring: distance, temperature, capacity, ETA va compatibility.">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="text-emerald-500" /> Demo shipment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Hang hoa</p><h2 className="text-2xl font-bold">{shipment.cargoType}</h2></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Khoi luong</p><b>{shipment.weightKg} kg</b></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Nhiet do</p><b>{shipment.requiredTempMin}C to {shipment.requiredTempMax}C</b></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Pickup</p><b>{shipment.pickup}</b></div>
              <div className="rounded-md border p-3"><p className="text-muted-foreground">Dropoff</p><b>{shipment.dropoff}</b></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="red">Smell Conflict</Badge>
              <Badge tone="amber">Not recommended</Badge>
              <Badge tone="blue">Temp special</Badge>
            </div>
            <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{shipment.compatibilityNote}</p>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><h3 className="font-bold">Matching pipeline</h3><p className="text-sm text-muted-foreground">Filter xe active to score rule to canh bao conflict to goi y ghep don.</p></div>
              <Badge tone="green"><PackageCheck size={12} /> 4 xe phu hop</Badge>
            </div>
          </Card>
          {trucks.map((truck, index) => <MatchingCard key={truck.id} shipment={shipment} truck={truck} index={index} />)}
        </div>
      </div>
    </AppShell>
  );
}
