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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shipmentsApi } from "@/lib/api";
import { onlyDigits } from "@/lib/utils";
import { vietnamLogisticsLocations } from "@/lib/vietnam-locations";

export default function CreateShipmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cargoType: "",
    category: "Thực phẩm tươi sống",
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
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.cargoType.trim() ||
      !formData.weightKg ||
      !formData.pickup ||
      !formData.dropoff ||
      !formData.proposedPrice
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (formData.pickup === formData.dropoff) {
      toast.error("Điểm đi và điểm đến phải khác nhau");
      return;
    }
    if (Number(formData.requiredTempMin) > Number(formData.requiredTempMax)) {
      toast.error("Nhiệt độ tối thiểu không được lớn hơn tối đa");
      return;
    }

    // const payload = {
    //   cargoType: formData.cargoType.trim(),
    //   category: formData.category.trim() || "Hàng tổng hợp",
    //   weightKg: Number(formData.weightKg),
    //   requiredTempMin: Number(formData.requiredTempMin),
    //   requiredTempMax: Number(formData.requiredTempMax),
    //   pickup: formData.pickup,
    //   dropoff: formData.dropoff,
    //   pickupLat: 11.94,
    //   pickupLng: 108.45,
    //   dropoffLat: 10.82,
    //   dropoffLng: 106.63,
    //   deliveryTime: formData.deliveryTime
    //     ? new Date(formData.deliveryTime).toISOString()
    //     : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    //   proposedPrice: Number(formData.proposedPrice),
    //   notes: formData.notes.trim() || undefined,
    //   fragile: formData.fragile,
    //   strongSmell: formData.strongSmell,
    //   frozenRequired: formData.frozenRequired,
    //   specialTemperature: true,
    //   allowCombine: formData.allowCombine,
    // };
    const payload = {
      cargoType: formData.cargoType.trim(),
      category: formData.category.trim() || "Hàng tổng hợp",

      weightKg: Number(formData.weightKg),
      requiredTempMin: Number(formData.requiredTempMin),
      requiredTempMax: Number(formData.requiredTempMax),

      pickup: formData.pickup,
      dropoff: formData.dropoff,

      pickupLat: 11.94,
      pickupLng: 108.45,
      dropoffLat: 10.82,
      dropoffLng: 106.63,

      deliveryTime: formData.deliveryTime
        ? new Date(formData.deliveryTime).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),

      proposedPrice: Number(formData.proposedPrice),

      // 🔥 FIX QUAN TRỌNG
      notes: formData.notes.trim() || null,

      fragile: formData.fragile,
      strongSmell: formData.strongSmell,
      frozenRequired: formData.frozenRequired,

      // 🔥 FIX LOGIC
      specialTemperature:
        Number(formData.requiredTempMin) !== 0 ||
        Number(formData.requiredTempMax) !== 0,

      allowCombine: formData.allowCombine,
    };


    try {
      setIsSubmitting(true);
      await shipmentsApi.create(payload);
      toast.success("Đã tạo đơn hàng thành công");
      router.push("/shipments");
      router.refresh();
    } catch (error: any) {
      console.error("Lỗi tạo đơn hàng:", error);
      toast.error(
        error.message ||
          "Không tạo được đơn hàng. Vui lòng kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-4">
        <Link
          href="/shipments"
          className="mb-3 flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Quay lại danh sách
        </Link>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Khu vực Chủ doanh nghiệp / Chủ hàng
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            Tạo đơn hàng vận chuyển
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Hệ thống tự động ghép xe phù hợp nhất theo tuyến, tải trọng và yêu
            cầu bảo quản.
          </p>
        </div>
      </div>

      <Card className="max-w-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tên hàng hóa *</Label>
            <Input
              value={formData.cargoType}
              onChange={(e) =>
                setFormData({ ...formData, cargoType: e.target.value })
              }
              placeholder="Rau Đà Lạt, tôm đông lạnh..."
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>Nhóm hàng</Label>
            <Input
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Khối lượng (kg) *</Label>
              <Input
                inputMode="numeric"
                value={formData.weightKg}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weightKg: onlyDigits(e.target.value),
                  })
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Giá đề xuất *</Label>
              <Input
                inputMode="numeric"
                value={
                  formData.proposedPrice
                    ? Number(formData.proposedPrice).toLocaleString("vi-VN")
                    : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    proposedPrice: onlyDigits(e.target.value),
                  })
                }
                placeholder="1.500.000 VND"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 relative z-10">
              <Label>Điểm đi *</Label>
              <Select
                value={formData.pickup}
                onValueChange={(value) =>
                  setFormData({ ...formData, pickup: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn tỉnh/thành phố" />
                </SelectTrigger>
                <SelectContent>
                  {vietnamLogisticsLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 relative z-10">
              <Label>Điểm đến *</Label>
              <Select
                value={formData.dropoff}
                onValueChange={(value) =>
                  setFormData({ ...formData, dropoff: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn tỉnh/thành phố" />
                </SelectTrigger>
                <SelectContent>
                  {vietnamLogisticsLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Nhiệt độ tối thiểu (°C)</Label>
              <Input
                type="number"
                value={formData.requiredTempMin}
                onChange={(e) =>
                  setFormData({ ...formData, requiredTempMin: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Nhiệt độ tối đa (°C)</Label>
              <Input
                type="number"
                value={formData.requiredTempMax}
                onChange={(e) =>
                  setFormData({ ...formData, requiredTempMax: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Hạn giao</Label>
              <Input
                type="datetime-local"
                value={formData.deliveryTime}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryTime: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ghi chú bảo quản</Label>
            <Input
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Yêu cầu nhiệt độ, bốc xếp, lưu kho..."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 sm:grid-cols-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.fragile}
                onChange={(e) =>
                  setFormData({ ...formData, fragile: e.target.checked })
                }
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              Hàng dễ vỡ
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.strongSmell}
                onChange={(e) =>
                  setFormData({ ...formData, strongSmell: e.target.checked })
                }
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              Hàng có mùi mạnh
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.frozenRequired}
                onChange={(e) =>
                  setFormData({ ...formData, frozenRequired: e.target.checked })
                }
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              Cần đông lạnh
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allowCombine}
                onChange={(e) =>
                  setFormData({ ...formData, allowCombine: e.target.checked })
                }
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              Cho phép ghép hàng
            </label>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <Link href="/shipments" className="flex-1">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
              >
                Hủy
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo đơn hàng"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
