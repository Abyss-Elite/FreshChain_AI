"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, DollarSign, Package, Truck, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api";

const statusLabel: Record<string, { label: string; tone: "green" | "blue" | "amber" | "red" | "slate" }> = {
  PENDING: { label: "Chờ xử lý", tone: "slate" },
  MATCHING: { label: "Đang ghép xe", tone: "blue" },
  NEGOTIATING: { label: "Đang thương lượng", tone: "amber" },
  IN_TRANSIT: { label: "Đang vận chuyển", tone: "green" },
  DELIVERED: { label: "Đã giao", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
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
        <div className="flex h-[50vh] items-center justify-center text-sm text-slate-500">Đang tải dữ liệu hệ thống...</div>
      </DashboardShell>
    );
  }

  const stats = dashboard?.stats || {};
  const recentShipments = dashboard?.shipments || [];

  return (
    <DashboardShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Tổng quan hệ thống</h1>
        <p className="mt-1 text-sm text-slate-600">Giám sát đơn hàng, đội xe và hiệu quả ghép tải trong vận tải chuỗi lạnh.</p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Xe hoạt động" value={String(stats.activeTrucks || 0)} icon={Truck} iconClassName="text-emerald-500" caption="Xe đang trực tuyến" />
        <MetricCard title="Tổng đơn hàng" value={String(stats.orders || 0)} icon={Package} iconClassName="text-blue-500" caption="Đơn hàng trên hệ thống" />
        <MetricCard title="Xe còn tải trống" value={String(stats.emptyTrucks || 0)} icon={Zap} iconClassName="text-amber-500" caption="Tải trọng còn trống trên 1 tấn" />
        <MetricCard title="Hiệu suất tối ưu" value={`${stats.loadOptimization || 0}%`} icon={DollarSign} iconClassName="text-green-500" caption={`Tiết kiệm: ${(stats.savings || 0).toLocaleString("vi-VN")} VND`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Thao tác nhanh</h3>
          <div className="space-y-2">
            <Link href="/trucks/register" className="block"><Button className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"><Truck size={18} />Đăng ký xe tải</Button></Link>
            <Link href="/shipments/create" className="block"><Button variant="outline" className="w-full justify-start"><Package size={18} />Tạo đơn hàng</Button></Link>
            <Link href="/matching" className="block"><Button variant="outline" className="w-full justify-start"><Zap size={18} />Tìm xe phù hợp</Button></Link>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Đơn hàng vừa cập nhật</h3>
            <Link href="/shipments" className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">Xem toàn bộ <ArrowRight size={12} /></Link>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {recentShipments.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Chưa có đơn hàng nào được tạo.</div>
            ) : (
              recentShipments.map((shipment: any) => {
                const status = statusLabel[shipment.status] || { label: shipment.status, tone: "slate" as const };
                return (
                  <div key={shipment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{shipment.pickup} -&gt; {shipment.dropoff}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{shipment.cargoType} • {shipment.weightKg.toLocaleString("vi-VN")} kg</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="mb-1 text-xs font-bold text-slate-900">{shipment.proposedPrice.toLocaleString("vi-VN")} VND</p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">Quy tắc tương thích chuỗi lạnh</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Hệ thống tự động hạn chế ghép hàng có mùi mạnh với thực phẩm nhạy mùi, kiểm tra biên độ nhiệt độ và ưu tiên xe còn tải phù hợp theo tuyến.
        </p>
      </Card>
    </DashboardShell>
  );
}
