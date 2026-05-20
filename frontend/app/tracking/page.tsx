"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AlertTriangle, MapPin, Snowflake, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrackingPage() {
  const [temp, setTemp] = useState(2.8);
  const [eta, setEta] = useState(126);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = Number((-1 + Math.random() * 7).toFixed(1));
      setTemp(next);
      setEta((value) => Math.max(98, value - 1));
    }, 2200);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try {
      const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", { transports: ["websocket"], autoConnect: true });
      socket.on("tracking:update", (event) => { setTemp(event.temperature); setEta(event.etaMinutes); });
      return () => { socket.close(); };
    } catch {
      return undefined;
    }
  }, []);
  return (
    <AppShell title="Tracking Map" subtitle="Fake realtime GPS, route path, nhiet do hien tai, ETA va alert.">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="h-[560px] bg-[linear-gradient(135deg,rgba(16,185,129,.18),rgba(14,165,233,.18))] p-6">
            <div className="relative h-full rounded-lg border bg-background/50">
              <div className="absolute left-[14%] top-[18%] flex items-center gap-2"><MapPin className="text-emerald-500" /><b>Da Lat</b></div>
              <div className="absolute bottom-[18%] right-[12%] flex items-center gap-2"><b>TP.HCM</b><MapPin className="text-sky-500" /></div>
              <div className="absolute left-[18%] top-[24%] h-[52%] w-[64%] rounded-br-[150px] border-b-4 border-r-4 border-dashed border-emerald-500/70" />
              <div className="absolute left-[49%] top-[48%] grid size-14 place-items-center rounded-lg bg-card shadow-glow"><Truck className="text-emerald-600" /></div>
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Xe 51C-78001</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-4"><span className="flex items-center gap-2"><Snowflake size={18} /> Current temperature</span><Badge tone={temp > 4 ? "red" : "green"}>{temp}C</Badge></div>
              <div className="flex items-center justify-between rounded-md border p-4"><span>ETA</span><b>{eta} phut</b></div>
              <div className="flex items-center justify-between rounded-md border p-4"><span>Route</span><b>Da Lat to TP.HCM</b></div>
              {temp > 4 ? <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600"><AlertTriangle className="mr-2 inline" size={16} />Nhiet do vuot nguong</p> : <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">Nhiet do on dinh, khong co alert.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
