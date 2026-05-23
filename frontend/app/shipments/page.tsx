"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit2, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { shipmentsApi } from "@/lib/api";
import { onlyDigits, vnd } from "@/lib/utils";

type ShipmentForm = {
  cargoType: string;
  category: string;
  weightKg: string;
  requiredTempMin: string;
  requiredTempMax: string;
  pickup: string;
  dropoff: string;
  deliveryTime: string;
  proposedPrice: string;
  notes: string;
  fragile: boolean;
  strongSmell: boolean;
  frozenRequired: boolean;
  allowCombine: boolean;
};

const emptyForm: ShipmentForm = {
  cargoType: "",
  category: "fresh-food",
  weightKg: "",
  requiredTempMin: "0",
  requiredTempMax: "8",
  pickup: "",
  dropoff: "",
  deliveryTime: "",
  proposedPrice: "",
  notes: "",
  fragile: false,
  strongSmell: false,
  frozenRequired: false,
  allowCombine: true,
};

const statusLabel: Record<string, { label: string; tone: "blue" | "green" | "amber" | "red" | "slate" }> = {
  PENDING: { label: "Cho xu ly", tone: "slate" },
  MATCHING: { label: "Dang ghep", tone: "blue" },
  NEGOTIATING: { label: "Thuong luong", tone: "amber" },
  IN_TRANSIT: { label: "Dang chay", tone: "green" },
  DELIVERED: { label: "Hoan tat", tone: "green" },
  CANCELLED: { label: "Da huy", tone: "red" },
};

function toLocalInput(date?: string) {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<ShipmentForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const loadShipments = async () => {
    try {
      setLoading(true);
      setShipments(await shipmentsApi.getAll());
    } catch (error: any) {
      toast.error(error.message || "Khong tai duoc danh sach don hang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (shipment: any) => {
    setEditing(shipment);
    setForm({
      cargoType: shipment.cargoType || "",
      category: shipment.category || "fresh-food",
      weightKg: String(shipment.weightKg || ""),
      requiredTempMin: String(shipment.requiredTempMin ?? "0"),
      requiredTempMax: String(shipment.requiredTempMax ?? "8"),
      pickup: shipment.pickup || "",
      dropoff: shipment.dropoff || "",
      deliveryTime: toLocalInput(shipment.deliveryTime),
      proposedPrice: String(shipment.proposedPrice || ""),
      notes: shipment.notes || "",
      fragile: Boolean(shipment.fragile),
      strongSmell: Boolean(shipment.strongSmell),
      frozenRequired: Boolean(shipment.frozenRequired),
      allowCombine: shipment.allowCombine !== false,
    });
    setSheetOpen(true);
  };

  const validationError = useMemo(() => {
    if (form.cargoType.trim().length < 2) return "Ten hang hoa qua ngan";
    if (Number(form.weightKg) <= 0) return "Khoi luong don hang phai lon hon 0";
    if (!form.pickup.trim() || !form.dropoff.trim()) return "Vui long nhap diem di va diem den";
    if (Number(form.proposedPrice) <= 0) return "Gia de xuat phai la so duong";
    if (Number(form.requiredTempMin) > Number(form.requiredTempMax)) return "Nhiet do toi thieu khong duoc lon hon toi da";
    return "";
  }, [form]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) return toast.error(validationError);

    const payload = {
      cargoType: form.cargoType.trim(),
      category: form.category.trim() || "fresh-food",
      weightKg: Number(form.weightKg),
      requiredTempMin: Number(form.requiredTempMin),
      requiredTempMax: Number(form.requiredTempMax),
      pickup: form.pickup.trim(),
      dropoff: form.dropoff.trim(),
      pickupLat: 11.94,
      pickupLng: 108.45,
      dropoffLat: 10.82,
      dropoffLng: 106.63,
      deliveryTime: form.deliveryTime ? new Date(form.deliveryTime).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      proposedPrice: Number(form.proposedPrice),
      notes: form.notes.trim() || undefined,
      fragile: form.fragile,
      strongSmell: form.strongSmell,
      frozenRequired: form.frozenRequired,
      specialTemperature: true,
      allowCombine: form.allowCombine,
    };

    try {
      setBusy(true);
      const saved = editing ? await shipmentsApi.update(editing.id, payload) : await shipmentsApi.create(payload);
      setShipments((prev) => editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]);
      toast.success(editing ? "Da cap nhat don hang" : "Da tao don hang");
      setSheetOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Khong luu duoc don hang");
    } finally {
      setBusy(false);
    }
  };

  const removeShipment = async () => {
    if (!deleteTarget) return;
    try {
      setBusy(true);
      await shipmentsApi.delete(deleteTarget.id);
      setShipments((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Da xoa don hang");
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Khong xoa duoc don hang");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-3xl">Quan ly don hang</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Quan ly hang hoa can ghep xe, nhiet do va ngan sach.</p>
        </div>
        <Button className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700" onClick={openCreate}>
          <Plus size={16} />
          Them
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Dang tai don hang...
        </div>
      ) : shipments.length === 0 ? (
        <Card className="border border-dashed border-slate-300 bg-white p-8 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="font-semibold text-slate-900">Chua co don hang</p>
          <Button className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700" onClick={openCreate}>Tao don dau tien</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment) => {
            const status = statusLabel[shipment.status] || { label: shipment.status, tone: "slate" as const };
            return (
              <Card key={shipment.id} className="overflow-hidden border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Package size={17} className="shrink-0 text-emerald-600" />
                      <h2 className="truncate text-base font-bold text-slate-900" title={shipment.cargoType}>{shipment.cargoType}</h2>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500" title={`${shipment.pickup} -> ${shipment.dropoff}`}>
                      {shipment.pickup} -&gt; {shipment.dropoff}
                    </p>
                  </div>
                  <Badge tone={status.tone} className="shrink-0">{status.label}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Khoi luong</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900" title={`${shipment.weightKg} kg`}>
                      {(shipment.weightKg || 0).toLocaleString("vi-VN")} kg
                    </p>
                    <p className="mt-2 truncate text-xs text-slate-500" title={`${shipment.requiredTempMin}C den ${shipment.requiredTempMax}C`}>
                      {shipment.requiredTempMin}C den {shipment.requiredTempMax}C
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Lo trinh</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900" title={shipment.pickup}>{shipment.pickup}</p>
                    <p className="mt-2 truncate text-xs text-slate-500" title={shipment.dropoff}>{shipment.dropoff}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-emerald-700" title={vnd(shipment.proposedPrice)}>{vnd(shipment.proposedPrice)}</span>
                  <span className="truncate text-xs text-slate-500" title={shipment.notes || "Khong ghi chu"}>{shipment.notes || "Khong ghi chu"}</span>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(shipment)}>
                    <Edit2 size={14} />
                    Sua
                  </Button>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(shipment)}>
                    <Trash2 size={14} />
                    Xoa
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Chinh sua don hang" : "Tao don hang"}</SheetTitle>
            <SheetDescription>Nhap thong tin theo mot cot de khong vo layout khi chia nua man hinh.</SheetDescription>
          </SheetHeader>
          <form id="shipment-form" onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2"><Label>Ten hang hoa</Label><Input value={form.cargoType} onChange={(e) => setForm({ ...form, cargoType: e.target.value })} placeholder="Rau Da Lat" /></div>
            <div className="space-y-2"><Label>Nhom hang</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-2"><Label>Khoi luong (kg)</Label><Input inputMode="numeric" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: onlyDigits(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Nhiet do toi thieu</Label><Input type="number" value={form.requiredTempMin} onChange={(e) => setForm({ ...form, requiredTempMin: e.target.value })} /></div>
            <div className="space-y-2"><Label>Nhiet do toi da</Label><Input type="number" value={form.requiredTempMax} onChange={(e) => setForm({ ...form, requiredTempMax: e.target.value })} /></div>
            <div className="space-y-2"><Label>Diem di</Label><Input value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} /></div>
            <div className="space-y-2"><Label>Diem den</Label><Input value={form.dropoff} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} /></div>
            <div className="space-y-2"><Label>Han giao</Label><Input type="datetime-local" value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Gia de xuat</Label>
              <Input inputMode="numeric" value={form.proposedPrice ? Number(form.proposedPrice).toLocaleString("vi-VN") : ""} onChange={(e) => setForm({ ...form, proposedPrice: onlyDigits(e.target.value) })} placeholder="1,500,000 VND" />
            </div>
            <div className="space-y-2"><Label>Ghi chu</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.fragile} onChange={(e) => setForm({ ...form, fragile: e.target.checked })} /> Hang de vo</label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.strongSmell} onChange={(e) => setForm({ ...form, strongSmell: e.target.checked })} /> Hang co mui manh</label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.frozenRequired} onChange={(e) => setForm({ ...form, frozenRequired: e.target.checked })} /> Can dong lanh</label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.allowCombine} onChange={(e) => setForm({ ...form, allowCombine: e.target.checked })} /> Cho phep ghep hang</label>
          </form>
          <SheetFooter>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)} disabled={busy}>Huy</Button>
              <Button form="shipment-form" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy}>{busy ? "Dang luu..." : "Luu"}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xoa don hang?"
        description={`Don ${deleteTarget?.cargoType || ""} se bi xoa khoi he thong.`}
        confirmText="Xoa don"
        loading={busy}
        onConfirm={removeShipment}
      />
    </DashboardShell>
  );
}
