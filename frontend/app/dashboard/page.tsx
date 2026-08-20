"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, DollarSign, Package, Truck, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api";
import { useUser } from "@/contexts/user-context";

const shipmentStatusLabel: Record<string, { label: string; tone: "green" | "blue" | "amber" | "red" | "slate" }> = {
  PENDING: { label: "Chờ xử lý", tone: "slate" },
  MATCHING: { label: "Đang ghép xe", tone: "blue" },
  NEGOTIATING: { label: "Đang thương lượng", tone: "amber" },
  IN_TRANSIT: { label: "Đang vận chuyển", tone: "green" },
  DELIVERED: { label: "Đã giao", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

export default function DashboardPage() {
  const { user } = useUser();
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

  const role = dashboard?.role || user?.role;
  const stats = dashboard?.stats || {};
  const isShipper = role === "SHIPPER"; // Chủ xe
  const isCarrier = role === "CARRIER"; // Chủ hàng

  return (
    <DashboardShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {isShipper ? "Tổng quan đội xe" : isCarrier ? "Tổng quan đơn hàng" : "Tổng quan hệ thống"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {isShipper
            ? "Giám sát đội xe, tải trọng còn trống và các đơn đã nhận của bạn."
            : isCarrier
              ? "Giám sát đơn hàng của bạn và tiến độ ghép xe, vận chuyển."
              : "Giám sát đơn hàng, đội xe và hiệu quả ghép tải trong vận tải chuỗi lạnh."}
        </p>
      </div>

      {isShipper ? (
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Tổng số xe" value={String(stats.totalTrucks || 0)} icon={Truck} iconClassName="text-blue-500" caption="Xe bạn đã đăng ký" href="/trucks" />
          <MetricCard title="Xe hoạt động" value={String(stats.activeTrucks || 0)} icon={Zap} iconClassName="text-emerald-500" caption="Xe đang trực tuyến" href="/trucks?status=active" />
          <MetricCard title="Xe còn tải trống" value={String(stats.emptyTrucks || 0)} icon={Package} iconClassName="text-amber-500" caption="Tải trọng còn trống trên 1 tấn" href="/trucks?capacity=empty" />
          <MetricCard title="Đơn đã nhận" value={String(stats.acceptedDeals || 0)} icon={CheckCircle2} iconClassName="text-green-500" caption="Deal đã chốt trên đội xe của bạn" href="/signed-deals" />
        </div>
      ) : isCarrier ? (
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Tổng đơn hàng" value={String(stats.totalOrders || 0)} icon={Package} iconClassName="text-blue-500" caption="Đơn hàng bạn đã tạo" href="/shipments" />
          <MetricCard title="Đang ghép xe" value={String(stats.matchingOrders || 0)} icon={Zap} iconClassName="text-amber-500" caption="Đơn đang tìm xe phù hợp" href="/shipments?status=MATCHING" />
          <MetricCard title="Đang thương lượng" value={String(stats.negotiatingOrders || 0)} icon={Truck} iconClassName="text-orange-500" caption="Đơn đang đàm phán giá với chủ xe" href="/shipments?status=NEGOTIATING" />
          <MetricCard title="Đã ký kết" value={String(stats.signedDeals || 0)} icon={CheckCircle2} iconClassName="text-green-500" caption="Hàng hóa đã ký kết hợp đồng vận chuyển" href="/signed-deals" />
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Xe hoạt động" value={String(stats.activeTrucks || 0)} icon={Truck} iconClassName="text-emerald-500" caption="Xe đang trực tuyến" href="/trucks?status=active" />
          <MetricCard title="Tổng đơn hàng" value={String(stats.orders || 0)} icon={Package} iconClassName="text-blue-500" caption="Đơn hàng trên hệ thống" href="/shipments" />
          <MetricCard title="Xe còn tải trống" value={String(stats.emptyTrucks || 0)} icon={Zap} iconClassName="text-amber-500" caption="Tải trọng còn trống trên 1 tấn" href="/trucks?capacity=empty" />
          <MetricCard title="Hiệu suất tối ưu" value={`${stats.loadOptimization || 0}%`} icon={DollarSign} iconClassName="text-green-500" caption={`Tiết kiệm: ${(stats.savings || 0).toLocaleString("vi-VN")} VND`} href="/admin" />
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <Card className="flex h-full flex-col border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Thao tác nhanh</h3>
          <div className="space-y-2">
            {isShipper ? (
              <>
                <Link href="/trucks/register" className="block"><Button className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"><Truck size={18} />Đăng ký xe tải</Button></Link>
                <Link href="/matching" className="block"><Button variant="outline" className="w-full justify-start"><Zap size={18} />Tìm hàng phù hợp</Button></Link>
              </>
            ) : isCarrier ? (
              <>
                <Link href="/shipments/create" className="block"><Button className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"><Package size={18} />Tạo đơn hàng</Button></Link>
                <Link href="/matching" className="block"><Button variant="outline" className="w-full justify-start"><Zap size={18} />Tìm xe phù hợp</Button></Link>
              </>
            ) : (
              <>
                <Link href="/trucks/register" className="block"><Button className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"><Truck size={18} />Đăng ký xe tải</Button></Link>
                <Link href="/shipments/create" className="block"><Button variant="outline" className="w-full justify-start"><Package size={18} />Tạo đơn hàng</Button></Link>
                <Link href="/matching" className="block"><Button variant="outline" className="w-full justify-start"><Zap size={18} />Tìm xe phù hợp</Button></Link>
              </>
            )}
          </div>
        </Card>

        {isShipper ? (
          <Card className="flex h-full flex-col border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Xe của bạn</h3>
              <Link href="/trucks" className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">Xem toàn bộ <ArrowRight size={12} /></Link>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {(dashboard?.trucks || []).length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">Bạn chưa đăng ký xe nào.</div>
              ) : (
                (dashboard?.trucks || []).map((truck: any) => (
                  <div key={truck.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{truck.plateNumber} • {truck.type}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{truck.currentRoute}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="mb-1 text-xs font-bold text-slate-900">{truck.remainingKg.toLocaleString("vi-VN")} / {truck.maxCapacityKg.toLocaleString("vi-VN")} kg</p>
                      <Badge tone={truck.active ? "green" : "slate"}>{truck.active ? "Hoạt động" : "Ngừng hoạt động"}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ) : (
          <Card className="flex h-full flex-col border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{isCarrier ? "Đơn hàng của bạn" : "Đơn hàng vừa cập nhật"}</h3>
              <Link href="/shipments" className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">Xem toàn bộ <ArrowRight size={12} /></Link>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {(dashboard?.shipments || []).length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">Chưa có đơn hàng nào được tạo.</div>
              ) : (
                (dashboard?.shipments || []).map((shipment: any) => {
                  const status = shipmentStatusLabel[shipment.status] || { label: shipment.status, tone: "slate" as const };
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
        )}
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
