"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Snowflake, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { scoreMatch } from "@/lib/demo-data";
import { vnd } from "@/lib/utils";

export function MatchingCard({ shipment, truck, index }: { shipment: any; truck: any; index: number }) {
  const score = scoreMatch(shipment, truck);

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
      <Card className="overflow-hidden p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={score.matchingScore >= 82 ? "green" : "amber"}>{score.matchingScore}% phù hợp</Badge>
              {truck.refrigerated ? <Badge tone="blue"><Snowflake size={12} /> Xe lạnh</Badge> : <Badge tone="slate">Xe thường</Badge>}
              {score.warnings.length ? <Badge tone="red"><AlertTriangle size={12} /> {score.warnings[0]}</Badge> : <Badge tone="green"><CheckCircle2 size={12} /> Có thể ghép</Badge>}
            </div>
            <h3 className="mt-3 text-lg font-bold">{truck.type} - {truck.plate}</h3>
            <p className="text-sm text-muted-foreground">{truck.owner} | {truck.route} | Sẵn sàng sau {truck.eta}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[
                ["Tương thích", score.compatibility],
                ["Tuyến đường", score.routeScore],
                ["Tải trọng", score.capacityScore],
                ["Thời gian", score.timeScore],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-xs"><span>{label}</span><b>{value}%</b></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${value}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-background/60 p-4 lg:w-60">
            <div className="flex items-center gap-2 text-sm font-semibold"><Truck size={16} /> Tuyến dự kiến</div>
            <div className="mt-4 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-600" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{shipment.pickup}</span><span>{shipment.dropoff}</span></div>
            <p className="mt-4 text-sm text-muted-foreground">Chi phí tiết kiệm dự kiến</p>
            <p className="text-xl font-bold text-emerald-600">{vnd(score.estimatedSavings)}</p>
            <Button className="mt-4 w-full">Chọn xe này</Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
