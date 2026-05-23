"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trucksApi } from "@/lib/api";

export default function RegisterTruckPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    plate: "",
    type: "refrigerated",
    capacity: "",
    tempMin: "",
    tempMax: "",
    currentRoute: "",
    refrigerated: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra nhanh các trường bắt buộc
    if (!formData.plate || !formData.capacity || !formData.currentRoute) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    if (formData.refrigerated && (!formData.tempMin || !formData.tempMax)) {
      alert("Vui lòng nhập khoảng nhiệt độ cho xe lạnh");
      return;
    }

    try {
      setIsLoading(true);

      // 2. Đồng bộ payload chuẩn hóa cấu trúc Object khớp với Schema Backend & Database
      const payload = {
        plateNumber: formData.plate, // Đồng bộ trường biển số
        type: formData.type === "refrigerated" ? "Xe lạnh" : "Xe tải thùng kín",
        maxCapacityKg: Number(formData.capacity),
        remainingKg: Number(formData.capacity), // Xe mới tạo mặc định tải trống = tổng tải
        currentRoute: formData.currentRoute,
        tempMin: formData.refrigerated ? Number(formData.tempMin) : null,
        tempMax: formData.refrigerated ? Number(formData.tempMax) : null,
        status: "idle", // Trạng thái mặc định ban đầu khi mới đăng ký
      };

      // 3. ĐÃ KÍCH HOẠT: Gọi API thực thông qua Axios/Fetch từ file lib/api của bạn
      console.log("Gửi yêu cầu tạo xe với dữ liệu:", payload);
      await trucksApi.create(payload);

      alert("Đăng ký xe mới lên hệ thống thành công!");

      // 4. Điều hướng quay lại trang quản lý và làm mới dữ liệu
      router.push("/trucks");
      router.refresh();
    } catch (error) {
      console.error("Đăng ký xe thất bại:", error);
      alert(
        "Không thể tạo xe. Vui lòng kiểm tra quyền Carrier hoặc kết nối mạng.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/trucks"
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors w-fit"
        >
          <ArrowLeft size={18} />
          Quay lại
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Đăng ký xe mới</h1>
        <p className="mt-2 text-slate-600">
          Cung cấp thông tin xe và tải trọng còn trống để tìm kiếm đơn hàng
        </p>
      </div>

      <div className="max-w-2xl">
        <Card className="p-8 border-0 shadow-sm bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">
                Thông tin xe
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Biển số xe *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 51C-78001"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-shadow"
                    value={formData.plate}
                    onChange={(e) =>
                      setFormData({ ...formData, plate: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Loại xe *
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                    value={formData.type}
                    onChange={(e) => {
                      const isRefrigerated = e.target.value === "refrigerated";
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        refrigerated: isRefrigerated,
                        // Reset nhiệt độ nếu đổi sang xe không lạnh
                        tempMin: isRefrigerated ? formData.tempMin : "",
                        tempMax: isRefrigerated ? formData.tempMax : "",
                      });
                    }}
                  >
                    <option value="refrigerated">Xe lạnh</option>
                    <option value="normal">Xe tải thùng kín</option>
                    <option value="open">Xe tải mở</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tải trọng tối đa (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="5000"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                  />
                </div>

                {formData.refrigerated && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Khoảng nhiệt độ (°C) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        value={formData.tempMin}
                        onChange={(e) =>
                          setFormData({ ...formData, tempMin: e.target.value })
                        }
                      />
                      <span className="text-slate-400 px-1">~</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        value={formData.tempMax}
                        onChange={(e) =>
                          setFormData({ ...formData, tempMax: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Route */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">
                Tuyến đường hiện tại
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tuyến (VD: Đà Lạt → TP.HCM) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đà Lạt → TP.HCM"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  value={formData.currentRoute}
                  onChange={(e) =>
                    setFormData({ ...formData, currentRoute: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-800 leading-relaxed">
                <span className="font-semibold">💡 Mẹo:</span> Sau khi đăng ký,
                bạn có thể linh hoạt cập nhật lại trạng thái tải trọng thực tế
                và tuyến đường trống để hệ thống tự động gợi ý đơn hàng phù hợp
                nhất.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isLoading}
                onClick={() => router.push("/trucks")}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Đang xử lý..." : "Đăng ký xe"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
