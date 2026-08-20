"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { shipmentsApi } from "@/lib/api";
import { normalizeSearchText, vnd } from "@/lib/utils";

const PAGE_SIZE = 8;

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
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shipmentsApi
      .getAll()
      .then((data) => setShipments(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredShipments = useMemo(() => {
    const query = normalizeSearchText(search.trim());
    return shipments.filter((s) => {
      const matchesStatus = activeFilter === "ALL" || s.status === activeFilter;
      const matchesQuery =
        !query ||
        normalizeSearchText(s.id).includes(query) ||
        normalizeSearchText(s.cargoType).includes(query) ||
        normalizeSearchText(s.pickup).includes(query) ||
        normalizeSearchText(s.dropoff).includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [shipments, activeFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / PAGE_SIZE));
  const paginatedShipments = filteredShipments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilter = (statusKey: string) => {
    setActiveFilter(statusKey);
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
          <div className="relative mb-4 max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn, loại hàng, tuyến đường..."
              className="pl-9"
            />
          </div>

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
              Không tìm thấy đơn hàng phù hợp.
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
                  {paginatedShipments.map((s) => (
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
              <div className="px-4">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredShipments.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
