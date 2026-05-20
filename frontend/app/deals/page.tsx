"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { vnd } from "@/lib/utils";

export default function DealsPage() {
  const [shipperPrice, setShipperPrice] = useState(4500000);
  const [counter, setCounter] = useState(5000000);
  const [accepted, setAccepted] = useState(false);
  return (
    <AppShell title="Deal Price System" subtitle="Chu hang de xuat gia, chu xe counter-offer, hai ben accept/reject.">
      <Card className="mx-auto max-w-3xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="text-emerald-500" /> SHP-1024 / 51C-78001</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Chu hang de xuat</p><Input type="number" value={shipperPrice} onChange={(e) => setShipperPrice(Number(e.target.value))} /><p className="mt-2 font-bold">{vnd(shipperPrice)}</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Chu xe counter-offer</p><Input type="number" value={counter} onChange={(e) => setCounter(Number(e.target.value))} /><p className="mt-2 font-bold">{vnd(counter)}</p></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4">
            <div><p className="text-sm text-muted-foreground">Trang thai deal</p><Badge tone={accepted ? "green" : "amber"}>{accepted ? "Accepted" : "Negotiating"}</Badge></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => toast.error("Deal rejected")}>Reject</Button><Button onClick={() => { setAccepted(true); toast.success("Chu hang accepted counter-offer"); }}>Accept {vnd(counter)}</Button></div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
