"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shipmentsApi } from "@/lib/api";

export default function CreateShipmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cargoType: "",
    weightKg: "",
    requiredTempMin: "",
    requiredTempMax: "",
    pickup: "",
    dropoff: "",
    proposedPrice: "",
    fragile: false,
    strongSmell: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Kiểm tra dữ liệu đầu vào cơ bản trước khi gửi đi
    if (
      !formData.cargoType ||
      !formData.weightKg ||
      !formData.pickup ||
      !formData.dropoff ||
      !formData.proposedPrice
    ) {
      setError("Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)");
      setIsSubmitting(false);
      return;
    }

    try {
      // Chuẩn hóa và ép kiểu dữ liệu khớp chính xác với Prisma Schema ở Backend
      const payload = {
        cargoType: formData.cargoType,
        weightKg: Number(formData.weightKg),
        requiredTempMin:
          formData.requiredTempMin !== ""
            ? Number(formData.requiredTempMin)
            : null,
        requiredTempMax:
          formData.requiredTempMax !== ""
            ? Number(formData.requiredTempMax)
            : null,
        pickup: formData.pickup,
        dropoff: formData.dropoff,
        proposedPrice: Number(formData.proposedPrice),
        fragile: formData.fragile,
        strongSmell: formData.strongSmell,
        status: "MATCHING", // Trạng thái khởi tạo mặc định cho chu kỳ điều phối
      };

      await shipmentsApi.create(payload);

      // Chuyển hướng quay lại danh sách sau khi lưu thành công
      router.push("/shipments");
      router.refresh();
    } catch (err: any) {
      console.error("Lỗi khi tạo lô hàng:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Có lỗi xảy ra trong quá trình lưu đơn hàng.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/shipments"
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          Quay lại danh sách
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Tạo đơn hàng mới
        </h1>
        <p className="mt-2 text-slate-600">
          Đăng nhu cầu vận chuyển và đợi hệ thống AI ghép xe chuỗi cung ứng lạnh
          phù hợp.
        </p>
      </div>

      <div className="max-w-2xl">
        <Card className="p-8 border border-slate-100 shadow-sm bg-white rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hiển thị thông báo lỗi nếu có */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {/* Cargo Info */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-base border-b pb-2 border-slate-100">
                Thông tin hàng hóa
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Loại hàng / Tên hàng hóa *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="VD: Sầu riêng Ri6, Tôm đông lạnh, Rau xà lách..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 text-sm"
                    value={formData.cargoType}
                    onChange={(e) =>
                      setFormData({ ...formData, cargoType: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Khối lượng (kg) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      disabled={isSubmitting}
                      placeholder="1000"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-sm"
                      value={formData.weightKg}
                      onChange={(e) =>
                        setFormData({ ...formData, weightKg: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Biên độ nhiệt độ an toàn (°C)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        disabled={isSubmitting}
                        placeholder="Min"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-sm"
                        value={formData.requiredTempMin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requiredTempMin: e.target.value,
                          })
                        }
                      />
                      <span className="text-slate-400 font-medium">~</span>
                      <input
                        type="number"
                        disabled={isSubmitting}
                        placeholder="Max"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-sm"
                        value={formData.requiredTempMax}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requiredTempMax: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Route */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-base border-b pb-2 border-slate-100">
                Lộ trình vận chuyển
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Điểm đóng hàng (Pick up) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="VD: Kho Đà Lạt, Lâm Đồng"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-sm"
                    value={formData.pickup}
                    onChange={(e) =>
                      setFormData({ ...formData, pickup: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Điểm trả hàng (Drop off) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="VD: Chợ đầu mối Bình Điền, TP.HCM"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-sm"
                    value={formData.dropoff}
                    onChange={(e) =>
                      setFormData({ ...formData, dropoff: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-base border-b pb-2 border-slate-100">
                Chi phí dự kiến
              </h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ngân sách tối đa (VNĐ) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  disabled={isSubmitting}
                  placeholder="3000000"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 text-sm font-medium"
                  value={formData.proposedPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, proposedPrice: e.target.value })
                  }
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Các đối tác vận tải dựa vào đây để tối ưu thuật toán ghép xe.
                </p>
              </div>
            </div>

            {/* Special Conditions */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 text-base border-b pb-2 border-slate-100">
                Đặc tính bảo quản đặc biệt
              </h3>
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-lg border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={isSubmitting}
                    checked={formData.fragile}
                    onChange={(e) =>
                      setFormData({ ...formData, fragile: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-slate-700">
                      Hàng dễ dập / Dễ vỡ
                    </p>
                    <p className="text-xs text-slate-400">
                      Yêu cầu không xếp đè vật nặng hoặc xếp chồng quá nhiều
                      lớp.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={isSubmitting}
                    checked={formData.strongSmell}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        strongSmell: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-slate-700">
                      Hàng có mùi đặc trưng mạnh
                    </p>
                    <p className="text-xs text-slate-400">
                      Tránh ghép chung chặng với các loại thực phẩm nhạy cảm bám
                      mùi khác.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-slate-100">
              <Link href="/shipments" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo đơn...
                  </>
                ) : (
                  "Tạo đơn hàng"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
