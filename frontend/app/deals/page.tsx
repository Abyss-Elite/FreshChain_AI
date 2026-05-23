"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  XCircle,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { dealsApi } from "@/lib/api";

const getStatusBadge = (status: string) => {
  const configs: Record<
    string,
    { label: string; tone: "green" | "blue" | "amber" | "red" | "slate" }
  > = {
    proposed: { label: "Đề xuất", tone: "amber" },
    countered: { label: "Phản hồi", tone: "blue" },
    accepted: { label: "Đã chốt", tone: "green" },
    rejected: { label: "Từ chối", tone: "red" },
  };

  const config = configs[status] || { label: status, tone: "slate" };
  return <Badge tone={config.tone}>{config.label}</Badge>;
};

export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeals = () => {
    setLoading(true);
    dealsApi
      .getAll() // 💻 Đã đổi từ .getDeals() sang .getAll() khớp với cấu hình API của bạn
      .then((data: any) => {
        setDeals(Array.isArray(data) ? data : data?.deals || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleUpdateStatus = async (
    dealId: string,
    status: "accepted" | "rejected",
  ) => {
    setActionLoading(dealId);
    try {
      // 💻 Đã đổi từ .updateDealStatus() sang .update() sử dụng phương thức PATCH
      await dealsApi.update(dealId, { status });

      setDeals((prevDeals) =>
        prevDeals.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                status,
                finalPrice:
                  status === "accepted" ? deal.carrierPrice : deal.finalPrice,
              }
            : deal,
        ),
      );
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái hợp đồng:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-slate-500 animate-pulse">
            Đang tải danh sách thương lượng...
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Hợp đồng & Định giá
          </h1>
          <p className="mt-2 text-slate-600">
            Quản lý và xét duyệt các giao dịch thương lượng giá giữa Chủ hàng
            (Shipper) và Nhà xe (Carrier).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDeals}
          className="self-start sm:self-center border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} className="mr-2" /> Làm mới
        </Button>
      </div>

      {/* Deals List */}
      <div className="space-y-4">
        {deals.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-white">
            <DollarSign className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">
              Không có dữ liệu thương lượng
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hiện tại không có đề xuất giá nào đang được xử lý trên hệ thống
              chuỗi cung ứng.
            </p>
          </Card>
        ) : (
          deals.map((deal) => {
            const isPending =
              deal.status !== "accepted" && deal.status !== "rejected";
            const priceGap = Math.abs(
              (deal.shipperPrice || 0) - (deal.carrierPrice || 0),
            );

            return (
              <Card
                key={deal.id}
                className="p-6 border border-slate-100 shadow-sm bg-white hover:border-slate-200/80 transition-all"
              >
                {/* Deal Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-base">
                        {deal.id}
                      </p>
                      <p className="text-sm text-slate-600 truncate mt-0.5">
                        {deal.shipment?.pickup ||
                          deal.shipment ||
                          "Đơn hàng hệ thống"}{" "}
                        → {deal.shipment?.dropoff || ""}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Mã xe phụ trách:{" "}
                        <span className="font-medium text-slate-600">
                          {deal.truck?.licensePlate ||
                            deal.truckId ||
                            "Chưa xếp chuyến"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(deal.status)}</div>
                </div>

                {/* Pricing Details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
                  {/* Shipper Price */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Giá chủ hàng muốn trả
                    </p>
                    <p className="text-xl font-extrabold text-slate-900">
                      ₫{(deal.shipperPrice || 0).toLocaleString("vi-VN")}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Đề xuất ban đầu
                    </p>
                  </div>

                  {/* Carrier Price */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Giá nhà xe yêu cầu
                    </p>
                    <p className="text-xl font-extrabold text-slate-900">
                      ₫{(deal.carrierPrice || 0).toLocaleString("vi-VN")}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Bởi:{" "}
                      <span className="capitalize font-medium text-slate-600">
                        {deal.proposedBy || "Nhà xe"}
                      </span>
                    </p>
                  </div>

                  {/* Final Price */}
                  <div
                    className={`p-4 rounded-xl border ${deal.finalPrice ? "bg-emerald-50/40 border-emerald-100" : "bg-slate-50/70 border-slate-100"}`}
                  >
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Chi phí chốt hợp đồng
                    </p>
                    {deal.finalPrice ? (
                      <div>
                        <p className="text-xl font-extrabold text-emerald-600">
                          ₫{deal.finalPrice.toLocaleString("vi-VN")}
                        </p>
                        <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                          ✓ Đã thanh toán / Ký kết
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xl font-bold text-slate-400">—</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Chờ biểu quyết hành động
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Gap Info */}
                {isPending && (
                  <div className="mb-5 p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs text-amber-900 flex justify-between items-center">
                    <p className="font-medium">
                      ⚠️ Khoảng cách thương lượng:{" "}
                      <span className="font-bold">
                        ₫{priceGap.toLocaleString("vi-VN")}
                      </span>
                    </p>
                    <span className="text-[10px] bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md font-semibold text-amber-800">
                      {deal.proposedBy === "shipper"
                        ? "Chủ hàng ép giá"
                        : "Nhà xe tăng giá"}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-4">
                  {isPending ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-slate-600 border-slate-200 hover:bg-slate-50"
                        disabled={actionLoading !== null}
                        onClick={() => handleUpdateStatus(deal.id, "rejected")}
                      >
                        <XCircle size={16} />
                        Bác bỏ đề xuất
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={actionLoading !== null}
                        onClick={() => handleUpdateStatus(deal.id, "accepted")}
                      >
                        <CheckCircle size={16} />
                        Chấp thuận giá
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-slate-500 cursor-default hover:bg-transparent"
                    >
                      <CheckCircle
                        size={16}
                        className={
                          deal.status === "accepted"
                            ? "text-emerald-500"
                            : "text-red-400"
                        }
                      />
                      Thương vụ hoàn tất (
                      {deal.status === "accepted" ? "Đã duyệt" : "Đã đóng"})
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </DashboardShell>
  );
}
