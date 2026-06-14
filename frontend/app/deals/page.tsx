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
import { dealsApi, negotiationApi } from "@/lib/api";

// =========================
// TYPES
// =========================
type DealStatus = "PROPOSED" | "COUNTERED" | "ACCEPTED" | "REJECTED";

type NegotiationRound = {
  id: string;
  proposedPrice?: number | null;
  respondedPrice?: number | null;
  proposedBy?: string | null;
  createdAt?: string;
  responseMessage?: string | null;
  status?: string;
  respondedBy?: string | null;
  respondedAt?: string | null;
};

type Deal = {
  id: string;
  status: DealStatus | string;
  finalPrice?: number | null;
  shipment?: {
    pickup?: string;
    dropoff?: string;
    proposedPrice?: number | null;
    cargoType?: string;
  };
  truck?: {
    plateNumber?: string;
  };
  negotiationRounds?: NegotiationRound[];
};

// =========================
// HELPERS
// =========================
const getStatusBadge = (status: string) => {
  const configs: Record<
    string,
    { label: string; tone: "green" | "blue" | "amber" | "red" | "slate" }
  > = {
    PROPOSED: { label: "Đề xuất", tone: "amber" },
    COUNTERED: { label: "Đang thương lượng", tone: "blue" },
    ACCEPTED: { label: "Đã chốt", tone: "green" },
    REJECTED: { label: "Từ chối", tone: "red" },

    proposed: { label: "Đề xuất", tone: "amber" },
    countered: { label: "Đang thương lượng", tone: "blue" },
    accepted: { label: "Đã chốt", tone: "green" },
    rejected: { label: "Từ chối", tone: "red" },
  };

  const config = configs[status] || {
    label: status,
    tone: "slate",
  };

  return <Badge tone={config.tone}>{config.label}</Badge>;
};

const formatPrice = (value?: number | null) => {
  if (!value || value <= 0) return "—";
  return `₫${value.toLocaleString("vi-VN")}`;
};

const getInitialShipmentPrice = (deal: Deal): number | null => {
  return deal.shipment?.proposedPrice || null;
};

const getCurrentNegotiationPrice = (deal: Deal): number | null => {
  if (deal.finalPrice && deal.finalPrice > 0) {
    return deal.finalPrice;
  }

  const rounds = deal.negotiationRounds || [];
  if (rounds.length === 0) {
    return deal.shipment?.proposedPrice || null;
  }

  const lastRound = rounds[rounds.length - 1];
  if (lastRound.respondedPrice && lastRound.respondedPrice > 0) {
    return lastRound.respondedPrice;
  }

  return lastRound.proposedPrice || null;
};

const getCurrentPriceOwner = (deal: Deal) => {
  const rounds = deal.negotiationRounds || [];
  if (rounds.length === 0) {
    return "Chủ hàng";
  }

  const lastRound = rounds[rounds.length - 1];
  if (lastRound.respondedPrice) {
    return lastRound.proposedBy === "SHIPPER" ? "Nhà xe" : "Chủ hàng";
  }

  return lastRound.proposedBy === "SHIPPER" ? "Chủ hàng" : "Nhà xe";
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const data = await dealsApi.getAll();
      setDeals(Array.isArray(data) ? data : data?.deals || []);
    } catch (error) {
      console.error("Lỗi tải deals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleUpdateStatus = async (
    deal: Deal,
    status: "accepted" | "rejected",
  ) => {
    try {
      setActionLoading(deal.id);
      const rounds = deal.negotiationRounds || [];

      if (rounds.length === 0) {
        throw new Error("Không tìm thấy negotiation round.");
      }

      const latestRound = rounds[rounds.length - 1];
      const roundId = latestRound.id;

      if (status === "accepted") {
        const response = await negotiationApi.acceptPrice(deal.id, roundId);
        // Lấy giá trị finalPrice thực tế từ Backend trả về (1500000)
        const backEndFinalPrice =
          response?.finalPrice ||
          response?.deal?.finalPrice ||
          getCurrentNegotiationPrice(deal);

        setDeals((prev) =>
          prev.map((item) => {
            if (item.id !== deal.id) return item;

            // Đồng bộ mảng negotiationRounds bằng cách cập nhật round cuối cùng thành "Accepted"
            const updatedRounds = item.negotiationRounds
              ? [...item.negotiationRounds]
              : [];
            if (updatedRounds.length > 0) {
              updatedRounds[updatedRounds.length - 1] = {
                ...updatedRounds[updatedRounds.length - 1],
                responseMessage: "Accepted",
                status: "ACCEPTED",
              };
            }

            return {
              ...item,
              status: "ACCEPTED",
              finalPrice: backEndFinalPrice,
              negotiationRounds: updatedRounds, // Đổi UI lập tức không cần F5
            };
          }),
        );
      } else {
        await negotiationApi.rejectDeal(deal.id);

        setDeals((prev) =>
          prev.map((item) => {
            if (item.id !== deal.id) return item;

            // Đồng bộ mảng negotiationRounds bằng cách cập nhật round cuối cùng thành "Rejected"
            const updatedRounds = item.negotiationRounds
              ? [...item.negotiationRounds]
              : [];
            if (updatedRounds.length > 0) {
              updatedRounds[updatedRounds.length - 1] = {
                ...updatedRounds[updatedRounds.length - 1],
                responseMessage: "Rejected",
                status: "REJECTED",
              };
            }

            return {
              ...item,
              status: "REJECTED",
              negotiationRounds: updatedRounds, // Đổi UI lập tức không cần F5
            };
          }),
        );
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="animate-pulse text-slate-500">
            Đang tải danh sách thương lượng...
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Hợp đồng & Định giá
          </h1>
          <p className="mt-2 text-slate-600">
            Quản lý các giao dịch thương lượng giá giữa chủ hàng và nhà xe.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDeals}
          className="self-start border-slate-200 text-slate-700 hover:bg-slate-50 sm:self-center"
        >
          <RefreshCw size={14} className="mr-2" />
          Làm mới
        </Button>
      </div>

      {/* EMPTY */}
      {deals.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <DollarSign className="mx-auto mb-3 h-12 w-12 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">
            Không có dữ liệu thương lượng
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Hiện chưa có giao dịch nào.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => {
            const latestRound =
              deal.negotiationRounds?.[deal.negotiationRounds.length - 1];

            // Tối ưu hóa biến kiểm tra trạng thái: Check cả thuộc tính của Deal lẫn của Round để UI nhạy bén
            const isAccepted =
              deal.status === "ACCEPTED" ||
              latestRound?.responseMessage === "Accepted";
            const isRejected =
              deal.status === "REJECTED" ||
              latestRound?.responseMessage === "Rejected";
            const isCompleted = isAccepted || isRejected;
            const isPending = !isCompleted;

            const basePrice = getInitialShipmentPrice(deal);
            const currentPrice = getCurrentNegotiationPrice(deal);
            const currentPriceOwner = getCurrentPriceOwner(deal);

            const priceGap =
              basePrice && currentPrice
                ? Math.abs(currentPrice - basePrice)
                : 0;

            return (
              <Card
                key={deal.id}
                className="border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-slate-200/80"
              >
                {/* HEADER */}
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-600">
                      <FileText size={20} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900">
                        {deal.shipment?.cargoType || "Đơn hàng"}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-slate-600">
                        {deal.shipment?.pickup} → {deal.shipment?.dropoff}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Xe phụ trách:{" "}
                        <span className="font-medium text-slate-600">
                          {deal.truck?.plateNumber || "Chưa xác định"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAccepted
                      ? getStatusBadge("ACCEPTED")
                      : isRejected
                        ? getStatusBadge("REJECTED")
                        : getStatusBadge("COUNTERED")}
                  </div>
                </div>

                {/* PRICE GRID */}
                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* INITIAL PRICE */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Giá chủ hàng đề xuất
                    </p>
                    <p className="text-xl font-extrabold text-slate-900">
                      {formatPrice(basePrice)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Giá khởi tạo đơn hàng
                    </p>
                  </div>

                  {/* CURRENT PRICE */}
                  <div
                    className={`rounded-xl border p-4 ${
                      isAccepted
                        ? "border-emerald-100 bg-emerald-50/40"
                        : "border-blue-100 bg-blue-50/40"
                    }`}
                  >
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isAccepted
                        ? "Giá chốt cuối cùng"
                        : "Giá đang thương lượng"}
                    </p>
                    <p
                      className={`text-xl font-extrabold ${
                        isAccepted ? "text-emerald-600" : "text-blue-600"
                      }`}
                    >
                      {formatPrice(currentPrice)}
                    </p>
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        isAccepted ? "text-emerald-600" : "text-blue-600"
                      }`}
                    >
                      {isAccepted
                        ? "✓ Đã ký kết"
                        : `💬 Đề xuất hiện tại từ: ${currentPriceOwner}`}
                    </p>
                  </div>
                </div>

                {/* GAP */}
                {isPending && (
                  <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-900">
                    <p className="font-medium">
                      ⚠️ Chênh lệch thương lượng:{" "}
                      <span className="font-bold">{formatPrice(priceGap)}</span>
                    </p>
                    <span className="rounded-md border border-amber-200 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Đang đàm phán
                    </span>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                  {isPending ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                        disabled={actionLoading !== null}
                        onClick={() => handleUpdateStatus(deal, "rejected")}
                      >
                        <XCircle size={16} />
                        Từ chối
                      </Button>

                      <Button
                        size="sm"
                        className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={actionLoading !== null}
                        onClick={() => handleUpdateStatus(deal, "accepted")}
                      >
                        <CheckCircle size={16} />
                        Chấp thuận
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-default gap-2 text-slate-500 hover:bg-transparent"
                    >
                      <CheckCircle
                        size={16}
                        className={
                          isAccepted ? "text-emerald-500" : "text-red-400"
                        }
                      />
                      Thương vụ hoàn tất (
                      {isAccepted ? "Đã duyệt" : "Đã từ chối"})
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
