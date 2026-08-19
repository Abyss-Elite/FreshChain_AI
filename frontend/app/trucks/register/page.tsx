"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trucksApi } from "@/lib/api";
import { PLATE_NUMBER_EXAMPLE, PLATE_NUMBER_REGEX } from "@/lib/utils";
import { vietnamLogisticsLocations } from "@/lib/vietnam-locations";

export default function RegisterTruckPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: "",
    type: "Xe lạnh",
    maxCapacityKg: "",
    remainingKg: "",
    refrigerated: true,
    tempMin: "0",
    tempMax: "8",
    routeOrigin: "",
    routeDestination: "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const plateNumber = formData.plateNumber.trim().toUpperCase();
    const maxCapacityKg = Number(formData.maxCapacityKg);
    const remainingKg = Number(formData.remainingKg || formData.maxCapacityKg);

    if (!PLATE_NUMBER_REGEX.test(plateNumber)) return toast.error(`Biển số cần đúng dạng VD: ${PLATE_NUMBER_EXAMPLE}`);
    if (!maxCapacityKg || maxCapacityKg <= 0) return toast.error("Tải trọng tối đa phải là số dương");
    if (remainingKg < 0 || remainingKg > maxCapacityKg) return toast.error("Tải trọng còn trống phải nằm trong tổng tải");
    if (!formData.routeOrigin || !formData.routeDestination) return toast.error("Vui lòng chọn điểm đầu và điểm cuối tuyến");
    if (formData.routeOrigin === formData.routeDestination) return toast.error("Điểm đầu và điểm cuối tuyến phải khác nhau");
    if (formData.tempMin === "" || formData.tempMax === "") return toast.error("Vui lòng nhập nhiệt độ tối thiểu và tối đa");
    if (Number(formData.tempMin) > Number(formData.tempMax)) return toast.error("Nhiệt độ tối thiểu không được lớn hơn tối đa");

    const payload = {
      plateNumber,
      type: formData.type.trim() || undefined,
      maxCapacityKg,
      remainingKg,
      refrigerated: formData.refrigerated,
      tempMin: Number(formData.tempMin),
      tempMax: Number(formData.tempMax),
      currentRoute: `${formData.routeOrigin} -> ${formData.routeDestination}`,
      currentLat: 11.94,
      currentLng: 108.45,
      eta: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      active: true,
    };

    try {
      setIsSubmitting(true);
      await trucksApi.create(payload);
      toast.success("Đã đăng ký xe mới");
      router.push("/trucks");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Không đăng ký được xe");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link href="/trucks" className="mb-3 flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
          <ArrowLeft size={18} />
          Quay lại danh sách
        </Link>
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Khu vực Chủ xe / Nhà xe</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Đăng ký xe mới</h1>
          <p className="mt-1 text-sm text-slate-600">Cập nhật đội xe, tải trọng khả dụng và tuyến hoạt động để tìm đơn hàng đang chờ ghép.</p>
        </div>
      </div>

      <Card className="max-w-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Biển số xe *</Label>
            <Input value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} placeholder={PLATE_NUMBER_EXAMPLE} disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label>Loại xe</Label>
            <Input value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="Xe lạnh 5 tấn (không bắt buộc)" disabled={isSubmitting} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tải trọng tối đa (kg) *</Label>
              <Input inputMode="numeric" value={formData.maxCapacityKg} onChange={(e) => setFormData({ ...formData, maxCapacityKg: e.target.value.replace(/\D/g, "") })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Tải trọng còn trống (kg)</Label>
              <Input inputMode="numeric" value={formData.remainingKg} onChange={(e) => setFormData({ ...formData, remainingKg: e.target.value.replace(/\D/g, "") })} placeholder="Mặc định bằng tải trọng tối đa" disabled={isSubmitting} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={formData.refrigerated} onChange={(e) => setFormData({ ...formData, refrigerated: e.target.checked })} disabled={isSubmitting} />
            Xe có làm lạnh
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nhiệt độ tối thiểu (°C) *</Label><Input type="number" value={formData.tempMin} onChange={(e) => setFormData({ ...formData, tempMin: e.target.value })} disabled={isSubmitting} /></div>
            <div className="space-y-2"><Label>Nhiệt độ tối đa (°C) *</Label><Input type="number" value={formData.tempMax} onChange={(e) => setFormData({ ...formData, tempMax: e.target.value })} disabled={isSubmitting} /></div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Điểm đầu tuyến *</Label>
              <Select value={formData.routeOrigin} onValueChange={(value) => setFormData({ ...formData, routeOrigin: value })} disabled={isSubmitting}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Chọn tỉnh/thành phố" /></SelectTrigger>
                <SelectContent>{vietnamLogisticsLocations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Điểm cuối tuyến *</Label>
              <Select value={formData.routeDestination} onValueChange={(value) => setFormData({ ...formData, routeDestination: value })} disabled={isSubmitting}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Chọn tỉnh/thành phố" /></SelectTrigger>
                <SelectContent>{vietnamLogisticsLocations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <Link href="/trucks" className="flex-1"><Button type="button" variant="outline" className="w-full" disabled={isSubmitting}>Hủy</Button></Link>
            <Button type="submit" className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</> : "Đăng ký xe"}
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
