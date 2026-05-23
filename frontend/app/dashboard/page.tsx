"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Package,
  Zap,
  DollarSign,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { dashboardApi } from "@/lib/api";

// Hàm định dạng hiển thị trạng thái đơn hàng trực quan
// Hàm định dạng hiển thị trạng thái đơn hàng tương thích với cấu trúc Badge của bạn
const getStatusBadge = (status: string) => {
  const configs: Record<
    string,
    {
      label: string;
      tone: "green" | "blue" | "amber" | "red" | "slate";
      className?: string;
    }
  > = {
    MATCHING: { label: "Đang ghép xe", tone: "blue" },
    BOOKED: { label: "Đã chốt xe", tone: "green" },
    IN_TRANSIT: { label: "Đang giao", tone: "amber" },
    DELIVERED: { label: "Đã giao", tone: "slate" },
    CANCELLED: { label: "Đã hủy", tone: "red" },
  };

  const config = configs[status] || {
    label: status,
    tone: "slate",
  };

  return (
    <Badge tone={config.tone} className={config.className}>
      {config.label}
    </Badge>
  );
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getDashboard()
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-slate-500 animate-pulse">
            Đang tải dữ liệu hệ thống...
          </p>
        </div>
      </DashboardShell>
    );
  }

  const stats = dashboard?.stats || {};
  const recentShipments = dashboard?.shipments || [];

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Tổng quan hệ thống
        </h1>
        <p className="mt-2 text-slate-600">
          Hệ thống điều phối FreshChain AI — Giám sát vận chuyển và tối ưu hóa
          tải trọng chuỗi cung ứng lạnh.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Số xe hoạt động"
          value={String(stats.activeTrucks || 0)}
          icon={Truck}
          iconClassName="text-emerald-500"
          caption="Xe đang trực tuyến"
        />

        <MetricCard
          title="Tổng đơn hàng"
          value={String(stats.orders || 0)}
          icon={Package}
          iconClassName="text-blue-500"
          caption="Đơn hàng trên hệ thống"
        />

        <MetricCard
          title="Xe tải trống sẵn sàng"
          value={String(stats.emptyTrucks || 0)}
          icon={Zap}
          iconClassName="text-yellow-500"
          caption="Tải trọng còn trống > 1 tấn"
        />

        <MetricCard
          title="Hiệu suất tối ưu"
          value={`${stats.loadOptimization || 0}%`}
          icon={DollarSign}
          iconClassName="text-green-500"
          caption={`Tiết kiệm: ₫${(stats.savings || 0).toLocaleString("vi-VN")}`}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Quick Actions */}
        <div className="space-y-6">
          <Card className="p-6 border-0 shadow-sm bg-white">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Hành động nhanh
            </h3>
            <div className="space-y-3">
              <Link href="/trucks/register" className="block">
                <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Truck size={18} className="mr-2" />
                  Đăng ký xe tải mới
                </Button>
              </Link>
              <Link href="/shipments/create" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Package size={18} className="mr-2" />
                  Tạo đơn hàng vận chuyển
                </Button>
              </Link>
              <Link href="/matching" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Zap size={18} className="mr-2" />
                  Sắp xếp ghép chuyến
                </Button>
              </Link>
            </div>
          </Card>

          {/* AI Suggestion Box */}
          <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 text-white">
              <Sparkles size={140} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-indigo-400" />
              <h4 className="font-semibold text-sm tracking-wider uppercase text-indigo-200">
                Gợi ý tối ưu từ AI
              </h4>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              "Ghép thêm đơn rau củ Đà Lạt → TP.HCM 850kg để tăng hệ số sử dụng
              tải trọng lên 91%."
            </p>
          </Card>
        </div>

        {/* Right Column: Recent Shipments From Real DB */}
        <Card className="p-6 border-0 shadow-sm bg-white lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Đơn hàng vừa cập nhật
            </h3>
            <Link
              href="/shipments"
              className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
            >
              Xem toàn bộ <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {recentShipments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Chưa có dữ liệu đơn hàng nào được tạo.
              </div>
            ) : (
              recentShipments.map((shipment: any) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-xl border border-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm shrink-0">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {shipment.pickup} → {shipment.dropoff}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {shipment.cargoType}
                        </span>
                        <span>•</span>
                        <span>
                          {shipment.weightKg.toLocaleString("vi-VN")} kg
                        </span>
                        {shipment.frozenRequired && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">
                              Đông lạnh
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
                    <span className="text-xs font-bold text-slate-900">
                      ₫{shipment.proposedPrice.toLocaleString("vi-VN")}
                    </span>
                    {getStatusBadge(shipment.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Optimization Tips Section */}
      <Card className="mt-6 p-5 border-0 shadow-sm bg-emerald-50/50 border-l-4 border-emerald-500 rounded-r-xl">
        <div className="flex gap-2.5">
          <span className="text-emerald-600 text-base">💡</span>
          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-0.5">
              Quy tắc tương thích chuỗi cung ứng lạnh
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Các đơn hàng thực phẩm tỏa mùi mạnh (như sầu riêng, mít) sẽ tự
              động bị hệ thống từ chối ghép với các mặt hàng nhạy cảm nhiệt độ
              như hoa quả tươi hoặc sữa, nhằm đảm bảo chất lượng hàng hóa khi
              đến tay người nhận.
            </p>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
