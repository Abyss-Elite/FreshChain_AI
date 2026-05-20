"use client";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shipments } from "@/lib/demo-data";
import { vnd } from "@/lib/utils";

const statuses = ["Pending", "Matching", "Negotiating", "In Transit", "Delivered", "Cancelled"];

export default function OrdersPage() {
  return (
    <AppShell title="Order Management" subtitle="Quan ly vong doi don hang tu Pending den Delivered hoac Cancelled.">
      <Card>
        <CardHeader><CardTitle>Danh sach don hang</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">{statuses.map((s) => <Badge key={s} tone={s === "Cancelled" ? "red" : "slate"}>{s}</Badge>)}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-2">Ma</th><th>Hang</th><th>Tuyen</th><th>Gia</th><th>Compatibility</th><th>Status</th></tr></thead>
              <tbody>{shipments.map((s) => <tr key={s.id} className="border-t"><td className="py-3 font-bold">{s.id}</td><td>{s.cargoType}</td><td>{s.pickup} to {s.dropoff}</td><td>{vnd(s.price)}</td><td>{s.strongSmell ? <Badge tone="red">Smell Conflict</Badge> : s.fragile ? <Badge tone="amber">Fragile</Badge> : <Badge tone="green">Safe</Badge>}</td><td><Badge tone="blue">{s.status}</Badge></td></tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
