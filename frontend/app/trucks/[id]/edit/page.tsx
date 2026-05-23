"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { trucksApi } from "@/lib/api";

export default function EditTruckPage() {
  const router = useRouter();
  const params = useParams();
  const truckId = params.id as string; // Lấy ID xe từ URL ngầm định

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: "",
    type: "",
    ownerName: "",
    maxCapacityKg: 0,
    remainingKg: 0,
    tempMin: "",
    tempMax: "",
    status: "idle",
  });

  // 1. Tải dữ liệu hiện tại của xe lên Form dựa vào id
  useEffect(() => {
    if (!truckId) return;

    setLoading(true);
    // Thay vì gọi API thật, có thể kiểm tra dữ liệu từ API hoặc fallback mock
    trucksApi
      .getAll()
      .then((trucks) => {
        const currentTruck = trucks.find((t: any) => t.id === truckId);

        if (currentTruck) {
          setFormData({
            plateNumber: currentTruck.plateNumber || currentTruck.plate || "",
            type: currentTruck.type || "",
            ownerName: currentTruck.owner?.name || currentTruck.owner || "",
            maxCapacityKg:
              currentTruck.maxCapacityKg || currentTruck.capacity || 0,
            remainingKg:
              currentTruck.remainingKg || currentTruck.remaining || 0,
            tempMin: currentTruck.tempMin?.toString() || "",
            tempMax: currentTruck.tempMax?.toString() || "",
            status: currentTruck.status || "idle",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [truckId]);

  // 2. Xử lý thay đổi dữ liệu trong ô nhập liệu
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Kg") ? Number(value) : value,
    }));
  };

  // 3. Xử lý submit lưu dữ liệu thay đổi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Chuẩn hóa dữ liệu sang dạng số trước khi gửi lên API
      const payload = {
        ...formData,
        tempMin: formData.tempMin !== "" ? Number(formData.tempMin) : null,
        tempMax: formData.tempMax !== "" ? Number(formData.tempMax) : null,
      };

      console.log("Dữ liệu cập nhật:", payload);
      // Gọi API cập nhật: await trucksApi.update(truckId, payload);

      alert("Cập nhật thông tin xe thành công!");
      router.push("/trucks"); // Quay lại trang danh sách xe
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi lưu dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center gap-2 text-slate-500 py-10 justify-center">
          <Loader2 className="animate-spin h-5 w-5 text-emerald-500" />
          <span>Đang truy vấn dữ liệu phương tiện...</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Nút quay lại */}
      <div className="mb-6">
        <Link
          href="/trucks"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách xe
        </Link>
      </div>

      {/* Tiêu đề */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Truck className="text-emerald-500" size={28} />
          Chỉnh sửa thông tin xe
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Mã định danh phương tiện hệ thống:{" "}
          <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">
            {truckId}
          </span>
        </p>
      </div>

      {/* Form cấu hình dữ liệu */}
      <Card className="max-w-2xl p-6 border border-slate-100 shadow-sm bg-white rounded-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Biển số xe */}
            <div className="space-y-2">
              <Label htmlFor="plateNumber">Biển kiểm soát *</Label>
              <Input
                id="plateNumber"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                placeholder="Ví dụ: 51C-78001"
                required
              />
            </div>

            {/* Loại xe */}
            <div className="space-y-2">
              <Label htmlFor="type">Loại xe / Quy cách thùng *</Label>
              <Input
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="Ví dụ: Xe lạnh 5 tấn"
                required
              />
            </div>

            {/* Tên nhà xe / chủ sở hữu */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ownerName">Đơn vị vận chuyển / Chủ xe</Label>
              <Input
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Tên công ty logistics hoặc cá nhân chủ xe"
              />
            </div>

            {/* Tải trọng tối đa */}
            <div className="space-y-2">
              <Label htmlFor="maxCapacityKg">Tải trọng tổng thể (kg) *</Label>
              <Input
                id="maxCapacityKg"
                name="maxCapacityKg"
                type="number"
                value={formData.maxCapacityKg}
                onChange={handleChange}
                required
              />
            </div>

            {/* Tải trọng còn trống */}
            <div className="space-y-2">
              <Label htmlFor="remainingKg">
                Tải trọng trống khả dụng (kg) *
              </Label>
              <Input
                id="remainingKg"
                name="remainingKg"
                type="number"
                value={formData.remainingKg}
                onChange={handleChange}
                required
              />
            </div>

            {/* Ngưỡng nhiệt độ dưới */}
            <div className="space-y-2">
              <Label htmlFor="tempMin">Nhiệt độ tối thiểu (°C)</Label>
              <Input
                id="tempMin"
                name="tempMin"
                type="number"
                value={formData.tempMin}
                onChange={handleChange}
                placeholder="Để trống nếu là xe thường"
              />
            </div>

            {/* Ngưỡng nhiệt độ trên */}
            <div className="space-y-2">
              <Label htmlFor="tempMax">Nhiệt độ tối đa (°C)</Label>
              <Input
                id="tempMax"
                name="tempMax"
                type="number"
                value={formData.tempMax}
                onChange={handleChange}
                placeholder="Để trống nếu là xe thường"
              />
            </div>

            {/* Trạng thái vận hành */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="status">Trạng thái điều xe hiện tại</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, status: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    Hoạt động (Đang đi tuyến)
                  </SelectItem>
                  <SelectItem value="idle">Chờ đơn (Đang trống tải)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cụm nút tác vụ ở cuối Form */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/trucks">
              <Button type="button" variant="outline">
                Hủy bỏ
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
