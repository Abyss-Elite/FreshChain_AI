"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit2, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trucksApi } from "@/lib/api";

type TruckForm = {
  plateNumber: string;
  type: string;
  maxCapacityKg: string;
  remainingKg: string;
  refrigerated: boolean;
  tempMin: string;
  tempMax: string;
  currentRoute: string;
  eta: string;
  active: boolean;
};

const emptyForm: TruckForm = {
  plateNumber: "",
  type: "Xe lanh",
  maxCapacityKg: "",
  remainingKg: "",
  refrigerated: true,
  tempMin: "0",
  tempMax: "8",
  currentRoute: "",
  eta: "",
  active: true,
};

const plateRegex = /^[0-9]{2}[A-Z]-[0-9]{4,5}$/;

function toLocalInput(date?: string) {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<TruckForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTrucks = async () => {
    try {
      setLoading(true);
      setTrucks(await trucksApi.getAll());
    } catch (error: any) {
      toast.error(error.message || "Khong tai duoc danh sach xe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrucks();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (truck: any) => {
    setEditing(truck);
    setForm({
      plateNumber: truck.plateNumber || "",
      type: truck.type || "Xe lanh",
      maxCapacityKg: String(truck.maxCapacityKg || ""),
      remainingKg: String(truck.remainingKg ?? ""),
      refrigerated: Boolean(truck.refrigerated),
      tempMin: truck.tempMin == null ? "" : String(truck.tempMin),
      tempMax: truck.tempMax == null ? "" : String(truck.tempMax),
      currentRoute: truck.currentRoute || "",
      eta: toLocalInput(truck.eta),
      active: truck.active !== false,
    });
    setSheetOpen(true);
  };

  const validationError = useMemo(() => {
    const plate = form.plateNumber.trim().toUpperCase();
    const max = Number(form.maxCapacityKg);
    const remaining = Number(form.remainingKg);
    if (!plateRegex.test(plate)) return "Bien so can dung dang VD: 51C-78001";
    if (!max || max <= 0) return "Tai trong toi da phai la so duong";
    if (remaining < 0 || remaining > max) return "Tai trong con trong phai nam trong tong tai";
    if (!form.currentRoute.trim()) return "Vui long nhap tuyen duong";
    if (form.refrigerated && (form.tempMin === "" || form.tempMax === "")) return "Xe lanh can co khoang nhiet do";
    return "";
  }, [form]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) return toast.error(validationError);

    const payload = {
      plateNumber: form.plateNumber.trim().toUpperCase(),
      type: form.type.trim(),
      maxCapacityKg: Number(form.maxCapacityKg),
      remainingKg: Number(form.remainingKg),
      refrigerated: form.refrigerated,
      tempMin: form.refrigerated ? Number(form.tempMin) : null,
      tempMax: form.refrigerated ? Number(form.tempMax) : null,
      currentRoute: form.currentRoute.trim(),
      currentLat: 11.94,
      currentLng: 108.45,
      eta: form.eta ? new Date(form.eta).toISOString() : new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      active: form.active,
    };

    try {
      setBusy(true);
      const saved = editing ? await trucksApi.update(editing.id, payload) : await trucksApi.create(payload);
      setTrucks((prev) => editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]);
      toast.success(editing ? "Da cap nhat xe" : "Da them xe moi");
      setSheetOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Khong luu duoc xe");
    } finally {
      setBusy(false);
    }
  };

  const removeTruck = async () => {
    if (!deleteTarget) return;
    try {
      setBusy(true);
      await trucksApi.delete(deleteTarget.id);
      setTrucks((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Da xoa xe");
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Khong xoa duoc xe");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-3xl">Quan ly xe</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Theo doi tai trong, tuyen duong va trang thai doi xe.</p>
        </div>
        <Button className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700" onClick={openCreate}>
          <Plus size={16} />
          Them
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Dang tai du lieu xe...
        </div>
      ) : (
        <div className="space-y-3">
          {trucks.map((truck) => {
            const used = Math.max((truck.maxCapacityKg || 0) - (truck.remainingKg || 0), 0);
            const usedPct = Math.min(100, Math.round((used / Math.max(truck.maxCapacityKg || 1, 1)) * 100));
            return (
              <Card key={truck.id} className="overflow-hidden border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Truck size={17} className="shrink-0 text-emerald-600" />
                      <h2 className="truncate text-base font-bold text-slate-900" title={truck.plateNumber}>{truck.plateNumber}</h2>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500" title={truck.type}>{truck.type}</p>
                  </div>
                  <Badge tone={truck.active ? "green" : "slate"} className="shrink-0">{truck.active ? "Hoat dong" : "Tam dung"}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Tai trong</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900" title={`${truck.remainingKg}/${truck.maxCapacityKg} kg`}>
                      {(truck.remainingKg || 0).toLocaleString("vi-VN")} / {(truck.maxCapacityKg || 0).toLocaleString("vi-VN")} kg
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${usedPct}%` }} />
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Lo trinh</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900" title={truck.currentRoute}>{truck.currentRoute}</p>
                    <p className="mt-2 truncate text-xs text-slate-500" title={truck.refrigerated ? `${truck.tempMin}C den ${truck.tempMax}C` : "Khong lanh"}>
                      {truck.refrigerated ? `${truck.tempMin}C den ${truck.tempMax}C` : "Khong lanh"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(truck)}>
                    <Edit2 size={14} />
                    Sua
                  </Button>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(truck)}>
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
            <SheetTitle>{editing ? "Chinh sua xe" : "Them xe moi"}</SheetTitle>
            <SheetDescription>Form mot cot toi uu cho cua so chia doi man hinh.</SheetDescription>
          </SheetHeader>
          <form id="truck-form" onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2"><Label>Bien so</Label><Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} placeholder="51C-78001" /></div>
            <div className="space-y-2"><Label>Loai xe</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Xe lanh 5 tan" /></div>
            <div className="space-y-2"><Label>Tai trong toi da (kg)</Label><Input inputMode="numeric" value={form.maxCapacityKg} onChange={(e) => setForm({ ...form, maxCapacityKg: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="space-y-2"><Label>Tai trong con trong (kg)</Label><Input inputMode="numeric" value={form.remainingKg} onChange={(e) => setForm({ ...form, remainingKg: e.target.value.replace(/\D/g, "") })} /></div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.refrigerated} onChange={(e) => setForm({ ...form, refrigerated: e.target.checked })} /> Xe co lam lanh</label>
            {form.refrigerated && (
              <>
                <div className="space-y-2"><Label>Nhiet do toi thieu</Label><Input type="number" value={form.tempMin} onChange={(e) => setForm({ ...form, tempMin: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nhiet do toi da</Label><Input type="number" value={form.tempMax} onChange={(e) => setForm({ ...form, tempMax: e.target.value })} /></div>
              </>
            )}
            <div className="space-y-2"><Label>Tuyen duong</Label><Input value={form.currentRoute} onChange={(e) => setForm({ ...form, currentRoute: e.target.value })} placeholder="Da Lat -> TP.HCM" /></div>
            <div className="space-y-2"><Label>ETA</Label><Input type="datetime-local" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Dang hoat dong</label>
          </form>
          <SheetFooter>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)} disabled={busy}>Huy</Button>
              <Button form="truck-form" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy}>{busy ? "Dang luu..." : "Luu"}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xoa xe?"
        description={`Xe ${deleteTarget?.plateNumber || ""} se bi xoa khoi he thong.`}
        confirmText="Xoa xe"
        loading={busy}
        onConfirm={removeTruck}
      />
    </DashboardShell>
  );
}
