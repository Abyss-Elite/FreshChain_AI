"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { useDemoStore } from "@/store/demo-store";

export default function RegisterTruckPage() {
  const addTruck = useDemoStore((s) => s.addTruck);
  const { register, handleSubmit } = useForm({ defaultValues: { type: "Xe lanh 5 tan", plate: "51C-88999", maxCapacityKg: 5000, remainingKg: 2600, refrigerated: true, tempMin: -18, tempMax: 8, route: "Da Lat -> TP.HCM", eta: "2h 30m" } });
  return (
    <AppShell title="Dang thong tin xe" subtitle="Chu xe cong bo tai trong trong, nhiet do ho tro va tuyen hien tai.">
      <Card className="mx-auto max-w-3xl">
        <CardHeader><CardTitle>Thong tin xe</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((data) => { addTruck(data); toast.success("Da dang xe moi vao pool matching"); })}>
            <Field label="Loai xe"><Input {...register("type")} /></Field>
            <Field label="Bien so"><Input {...register("plate")} /></Field>
            <Field label="Tai trong toi da kg"><Input type="number" {...register("maxCapacityKg", { valueAsNumber: true })} /></Field>
            <Field label="Tai trong con trong kg"><Input type="number" {...register("remainingKg", { valueAsNumber: true })} /></Field>
            <Field label="Co xe lanh"><Select {...register("refrigerated")}><option value="true">Co</option><option value="false">Khong</option></Select></Field>
            <Field label="Nhiet do min C"><Input type="number" {...register("tempMin", { valueAsNumber: true })} /></Field>
            <Field label="Nhiet do max C"><Input type="number" {...register("tempMax", { valueAsNumber: true })} /></Field>
            <Field label="Tuyen hien tai"><Input {...register("route")} /></Field>
            <Field label="ETA"><Input {...register("eta")} /></Field>
            <div className="md:col-span-2"><Button className="w-full">Dang xe</Button></div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
