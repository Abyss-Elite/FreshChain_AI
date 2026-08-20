"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Truck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trucksApi } from "@/lib/api";
import { PLATE_NUMBER_EXAMPLE, PLATE_NUMBER_REGEX, splitTruckRoute } from "@/lib/utils";
import { vietnamLogisticsLocations } from "@/lib/vietnam-locations";

export default function EditTruckPage() {
  const router = useRouter();
  const params = useParams();
  const truckId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: "",
    type: "",
    maxCapacityKg: "",
    remainingKg: "",
    refrigerated: true,
    tempMin: "",
    tempMax: "",
    routeOrigin: "",
    routeDestination: "",
    active: true,
  });

  useEffect(() => {
    if (!truckId) return;
    setLoading(true);
    trucksApi
      .getAll()
      .then((trucks) => {
        const currentTruck = trucks.find((truck: any) => truck.id === truckId);
        if (!currentTruck) {
          toast.error("Không tìm thấy xe");
          router.push("/trucks");
          return;
        }
        const route = splitTruckRoute(currentTruck.currentRoute);
        setFormData({
          plateNumber: currentTruck.plateNumber || "",
          type: currentTruck.type || "",
          maxCapacityKg: String(currentTruck.maxCapacityKg || ""),
          remainingKg: String(currentTruck.remainingKg || ""),
          refrigerated: Boolean(currentTruck.refrigerated),
          tempMin: currentTruck.tempMin == null ? "" : String(currentTruck.tempMin),
          tempMax: currentTruck.tempMax == null ? "" : String(currentTruck.tempMax),
          routeOrigin: route.origin,
          routeDestination: route.destination,
          active: currentTruck.active !== false,
        });
      })
      .catch((error: any) => toast.error(error.message || "Không tải được dữ liệu xe"))
      .finally(() => setLoading(false));
  }, [router, truckId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const plateNumber = formData.plateNumber.trim().toUpperCase();
    if (!PLATE_NUMBER_REGEX.test(plateNumber)) return toast.error(`Biển số cần đúng dạng VD: ${PLATE_NUMBER_EXAMPLE}`);
    if (!formData.routeOrigin || !formData.routeDestination) return toast.error("Vui lòng chọn tuyến xe");
    if (formData.routeOrigin === formData.routeDestination) return toast.error("Điểm đầu và điểm cuối tuyến phải khác nhau");
    if (formData.tempMin === "" || formData.tempMax === "") return toast.error("Vui lòng nhập nhiệt độ tối thiểu và tối đa");
    if (Number(formData.tempMin) > Number(formData.tempMax)) return toast.error("Nhiệt độ tối thiểu không được lớn hơn tối đa");

    const payload = {
      plateNumber,
      type: formData.type.trim() || undefined,
      maxCapacityKg: Number(formData.maxCapacityKg),
      remainingKg: Number(formData.remainingKg),
      refrigerated: formData.refrigerated,
      tempMin: Number(formData.tempMin),
      tempMax: Number(formData.tempMax),
      currentRoute: `${formData.routeOrigin} -> ${formData.routeDestination}`,
      active: formData.active,
    };

    try {
      setSubmitting(true);
      await trucksApi.update(truckId, payload);
      toast.success("Đã cập nhật thông tin xe");
      router.push("/trucks");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Không lưu được dữ liệu xe");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          <span>Đang tải dữ liệu xe...</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link href="/trucks" className="mb-3 flex w-fit items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-800">
          <ArrowLeft size={16} />
          Quay lại danh sách xe
        </Link>
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Khu vực Chủ xe / Nhà xe</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            <Truck className="text-emerald-500" size={24} />
            Chỉnh sửa thông tin xe
          </h1>
        </div>
      </div>

      <Card className="max-w-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Biển số</Label><Input value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Loại xe</Label><Input value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="Không bắt buộc" /></div>
            <div className="space-y-2"><Label>Tải trọng tối đa (kg)</Label><Input inputMode="numeric" value={formData.maxCapacityKg} onChange={(e) => setFormData({ ...formData, maxCapacityKg: e.target.value.replace(/\D/g, "") })} required /></div>
            <div className="space-y-2"><Label>Tải trọng còn trống (kg)</Label><Input inputMode="numeric" value={formData.remainingKg} onChange={(e) => setFormData({ ...formData, remainingKg: e.target.value.replace(/\D/g, "") })} required /></div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={formData.refrigerated} onChange={(e) => setFormData({ ...formData, refrigerated: e.target.checked })} /> Xe có làm lạnh</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nhiệt độ tối thiểu (°C)</Label><Input type="number" value={formData.tempMin} onChange={(e) => setFormData({ ...formData, tempMin: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nhiệt độ tối đa (°C)</Label><Input type="number" value={formData.tempMax} onChange={(e) => setFormData({ ...formData, tempMax: e.target.value })} required /></div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Điểm đầu tuyến</Label>
              <Select value={formData.routeOrigin} onValueChange={(value) => setFormData({ ...formData, routeOrigin: value })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Chọn tỉnh/thành phố" /></SelectTrigger>
                <SelectContent>{vietnamLogisticsLocations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Điểm cuối tuyến</Label>
              <Select value={formData.routeDestination} onValueChange={(value) => setFormData({ ...formData, routeDestination: value })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Chọn tỉnh/thành phố" /></SelectTrigger>
                <SelectContent>{vietnamLogisticsLocations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} /> Đang hoạt động</label>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Link href="/trucks"><Button type="button" variant="outline">Hủy</Button></Link>
            <Button type="submit" disabled={submitting} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
