"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shipmentsApi } from "@/lib/api";
import { vnd } from "@/lib/utils";

// Định nghĩa chuẩn hóa mảng trạng thái viết hoa từ Prisma Backend
const statuses = [
  { key: "ALL", label: "Tất cả" },
  { key: "MATCHING", label: "Đang ghép xe" },
  { key: "BOOKED", label: "Đã chốt xe" },
  { key: "IN_TRANSIT", label: "Đang vận chuyển" },
  { key: "DELIVERED", label: "Đã giao hàng" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const getStatusBadge = (status: string) => {
  const configs: Record<
    string,
    { label: string; tone: "blue" | "green" | "amber" | "slate" | "red" }
  > = {
    MATCHING: { label: "Đang ghép xe", tone: "blue" },
    BOOKED: { label: "Đã chốt xe", tone: "green" },
    IN_TRANSIT: { label: "Đang vận chuyển", tone: "amber" },
    DELIVERED: { label: "Đã giao hàng", tone: "slate" },
    CANCELLED: { label: "Đã hủy", tone: "red" },
  };
  const config = configs[status] || { label: status, tone: "slate" };
  return <Badge tone={config.tone}>{config.label}</Badge>;
};

export default function OrdersPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shipmentsApi
      .getAll()
      .then((data) => {
        setShipments(data || []);
        setFilteredShipments(data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Bộ lọc Client-side tương tác mượt mà
  const handleFilter = (statusKey: string) => {
    setActiveFilter(statusKey);
    if (statusKey === "ALL") {
      setFilteredShipments(shipments);
    } else {
      setFilteredShipments(shipments.filter((s) => s.status === statusKey));
    }
  };

  return (
    <AppShell
      title="Order Management"
      subtitle="Quản lý vòng đời đơn hàng chuỗi cung ứng từ chặng Matching đến Delivered hoặc Cancelled."
    >
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-slate-800">
            Danh sách đơn hàng vận hành
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bộ lọc trạng thái thông minh */}
          <div className="mb-6 flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s.key}
                onClick={() => handleFilter(s.key)}
                className="focus:outline-none transition-transform active:scale-95"
              >
                <Badge
                  tone={activeFilter === s.key ? "blue" : "slate"}
                  className={`cursor-pointer px-3 py-1 text-xs font-medium border ${
                    activeFilter === s.key
                      ? "border-blue-300 shadow-sm"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </Badge>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-slate-500 animate-pulse">
              Đang đồng bộ dữ liệu đơn hàng...
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 border border-dashed rounded-lg">
              Không tìm thấy đơn hàng nào thuộc trạng thái này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left">
                <thead className="text-xs font-semibold text-slate-400 uppercase bg-slate-50/70 border-b">
                  <tr>
                    <th className="py-3 px-4">Mã đơn</th>
                    <th className="py-3 px-4">Loại hàng</th>
                    <th className="py-3 px-4">Tuyến đường</th>
                    <th className="py-3 px-4">Khối lượng</th>
                    <th className="py-3 px-4">Giá đề xuất</th>
                    <th className="py-3 px-4">An toàn chuỗi lạnh</th>
                    <th className="py-3 px-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShipments.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {s.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {s.cargoType}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {s.pickup} → {s.dropoff}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {s.weightKg?.toLocaleString("vi-VN")} kg
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {vnd(s.proposedPrice)}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.strongSmell ? (
                          <Badge tone="red">Cảnh báo nhiễm mùi</Badge>
                        ) : s.fragile ? (
                          <Badge tone="amber">Hàng dễ vỡ / dập</Badge>
                        ) : (
                          <Badge tone="green">Tương thích tốt</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(s.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
