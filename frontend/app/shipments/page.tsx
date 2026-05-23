"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Plus,
  Eye,
  Loader2,
  ArrowRight,
  ThermometerSnowflake,
  MapPin,
  CircleDollarSign,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { shipmentsApi } from "@/lib/api";
import { vnd } from "@/lib/utils";

// Chuẩn hóa Badge Trạng thái theo variant của shadcn/ui kết hợp Custom Color
const getStatusBadge = (status: string) => {
  const configs: Record<
    string,
    {
      label: string;
      tone: "blue" | "green" | "amber" | "slate" | "red";
      className: string;
    }
  > = {
    MATCHING: {
      label: "Chờ điều xe",
      tone: "blue",
      className: "bg-blue-50 text-blue-700 border-blue-200/80",
    },
    BOOKED: {
      label: "Đã chốt xe",
      tone: "green",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    },
    IN_TRANSIT: {
      label: "Đang vận chuyển",
      tone: "amber",
      className: "bg-amber-50 text-amber-700 border-amber-200/80",
    },
    DELIVERED: {
      label: "Đã hoàn tất",
      tone: "slate",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    CANCELLED: {
      label: "Đã hủy đơn",
      tone: "red",
      className: "bg-rose-50 text-rose-700 border-rose-200/80",
    },
  };

  const config = configs[status] || {
    label: status,
    tone: "slate",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <Badge
      tone={config.tone}
      className={`font-medium rounded-md px-2.5 py-0.5 border ${config.className}`}
    >
      {config.label}
    </Badge>
  );
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shipmentsApi
      .getAll()
      .then((data) => {
        setShipments(data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Quản lý lô hàng đi
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-2xl leading-relaxed">
            Danh sách các đơn hàng nông sản, thực phẩm cần điều phối xe ghép
            chặng thuộc chuỗi cung ứng lạnh thời gian thực.
          </p>
        </div>
        <Link
          href="/shipments/create"
          className="self-start sm:self-center shrink-0"
        >
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium transition-all">
            <Plus size={16} strokeWidth={2.5} />
            Tạo đơn hàng mới
          </Button>
        </Link>
      </div>

      {/* Table Card Container */}
      <Card className="border border-slate-200/80 shadow-sm overflow-hidden bg-white rounded-xl">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-3 text-slate-500">
            <Loader2 className="animate-spin text-emerald-600 h-7 w-7" />
            <p className="text-sm font-medium text-slate-600">
              Đang đồng bộ dữ liệu vận tải thực tế...
            </p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-20 px-4 m-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="inline-flex p-4 bg-white border border-slate-200 shadow-sm rounded-2xl mb-4 text-slate-400">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Chưa có đơn hàng nào
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Hệ thống chưa ghi nhận lô hàng cần điều phối nào của bạn tại thời
              điểm này.
            </p>
            <div className="mt-4">
              <Link href="/shipments/create">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Tạo đơn hàng đầu tiên
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Thông tin hàng hóa
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Scale size={13} /> Tải trọng
                    </span>
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} /> Lộ trình & Nhiệt độ
                    </span>
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <CircleDollarSign size={13} /> Chi phí đề xuất
                    </span>
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="hover:bg-slate-50/40 transition-colors group"
                  >
                    {/* Hàng hóa */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-lg border border-slate-200/60 group-hover:bg-white group-hover:border-slate-300 shadow-sm transition-colors">
                          <Package size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-tight">
                            {shipment.cargoType}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            {shipment.id.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Khối lượng */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900 text-sm">
                        {shipment.weightKg?.toLocaleString("vi-VN")}
                      </span>
                      <span className="text-xs text-slate-400 font-normal ml-1">
                        kg
                      </span>
                    </td>

                    {/* Lộ trình & Nhiệt độ */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                          <span>{shipment.pickup}</span>
                          <ArrowRight
                            size={13}
                            className="text-slate-400 group-hover:translate-x-0.5 transition-transform"
                          />
                          <span>{shipment.dropoff}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100/60 font-medium">
                          <ThermometerSnowflake
                            size={12}
                            className="shrink-0"
                          />
                          <span>
                            {shipment.requiredTempMin}°C đến{" "}
                            {shipment.requiredTempMax}°C
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Chi phí */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">
                        {vnd(shipment.proposedPrice)}
                      </p>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(shipment.status)}
                    </td>

                    {/* Thao tác */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link href={`/matching?shipmentId=${shipment.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 rounded-lg gap-1.5 text-xs font-medium shadow-xs bg-white"
                        >
                          <Eye size={13} strokeWidth={2} />
                          Điều xe AI
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
