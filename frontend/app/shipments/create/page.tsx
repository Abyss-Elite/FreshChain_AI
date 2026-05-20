"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useDemoStore } from "@/store/demo-store";

export default function CreateShipmentPage() {
  const addShipment = useDemoStore((s) => s.addShipment);
  const { register, handleSubmit, watch } = useForm({ defaultValues: { cargoType: "Sau rieng", category: "Trai cay", weightKg: 1200, requiredTempMin: 8, requiredTempMax: 14, pickup: "Da Lat", dropoff: "TP.HCM", price: 4500000, notes: "", strongSmell: true, fragile: false, frozenRequired: false, specialTemperature: true, allowCombine: false, compatibilityNote: "Sau rieng co mui manh, khong ghep voi trai cay khac" } });
  const smell = watch("strongSmell");
  const frozen = watch("frozenRequired");
  const fragile = watch("fragile");
  return (
    <AppShell title="Tao don van chuyen" subtitle="Chu hang khai bao hang hoa, nhiet do va compatibility rules de matching an toan.">
      <form onSubmit={handleSubmit((data) => { addShipment(data); toast.success("Da tao don va chuyen sang trang thai Matching"); })} className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Thong tin don hang</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Loai hang"><Input {...register("cargoType")} /></Field>
            <Field label="Danh muc"><Select {...register("category")}><option>Rau cu</option><option>Trai cay</option><option>Hai san</option><option>Hang dong lanh</option></Select></Field>
            <Field label="Khoi luong kg"><Input type="number" {...register("weightKg", { valueAsNumber: true })} /></Field>
            <Field label="Gia de xuat VND"><Input type="number" {...register("price", { valueAsNumber: true })} /></Field>
            <Field label="Nhiet do min C"><Input type="number" {...register("requiredTempMin", { valueAsNumber: true })} /></Field>
            <Field label="Nhiet do max C"><Input type="number" {...register("requiredTempMax", { valueAsNumber: true })} /></Field>
            <Field label="Diem lay hang"><Input {...register("pickup")} /></Field>
            <Field label="Diem giao hang"><Input {...register("dropoff")} /></Field>
            <Field label="Thoi gian giao"><Input type="datetime-local" /></Field>
            <Field label="Ghi chu"><Textarea {...register("notes")} /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Compatibility declaration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ["strongSmell", "Hang co mui manh"],
              ["fragile", "Hang de dap"],
              ["frozenRequired", "Can dong lanh"],
              ["specialTemperature", "Can nhiet do dac biet"],
              ["allowCombine", "Duoc ghep chung hang khac"]
            ].map(([name, label]) => <label key={name} className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{label}</span><input type="checkbox" {...register(name as any)} /></label>)}
            <Field label="Ghi chu compatibility"><Textarea {...register("compatibilityNote")} /></Field>
            <div className="flex flex-wrap gap-2">
              {smell && <Badge tone="red">Smell Conflict</Badge>}
              {frozen && <Badge tone="amber">Temperature Conflict risk</Badge>}
              {fragile && <Badge tone="amber">Fragile Cargo Warning</Badge>}
              {!smell && !frozen && !fragile && <Badge tone="green">Safe to combine</Badge>}
            </div>
            <Button className="w-full">Tao don va tim xe</Button>
          </CardContent>
        </Card>
      </form>
    </AppShell>
  );
}
