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
  MessageSquare,
  Loader2,
} from "lucide-react";
import { dealsApi, negotiationApi } from "@/lib/api";
import { useSocket } from "@/lib/hooks/use-socket";
import { useUser } from "@/contexts/user-context";

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
  const socket = useSocket();
  const { user } = useUser();
  const [counterPrice, setCounterPrice] = useState<Record<string, string>>({});

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

  // Initial fetch on mount
  useEffect(() => {
    fetchDeals();
  }, []);

  // Setup WebSocket refresh polling
  useEffect(() => {
    if (!socket || !user) return;

    // Emit request-refresh immediately
    const requestRefresh = () => {
      socket.emit("deals:request-refresh", {
        userId: user.id,
        userRole: user.role,
      });
    };

    // Initial request
    requestRefresh();

    // Setup polling interval (refresh every 3 seconds)
    const interval = setInterval(requestRefresh, 3000);

    return () => clearInterval(interval);
  }, [socket, user]);

  // Socket.IO Real-time listeners
  useEffect(() => {
    if (!socket) return;

    // Subscribe to deals room
    socket.emit("deals:subscribe");

    // Lắng nghe deal mới được tạo
    socket.on("deal:created", (newDeal: Deal) => {
      console.log("Deal mới:", newDeal);
      setDeals((prev) => [newDeal, ...prev]);
    });

    // Lắng nghe deal được cập nhật
    socket.on("deal:updated", (updatedDeal: Deal) => {
      console.log("Deal được cập nhật:", updatedDeal);
      setDeals((prev) =>
        prev.map((deal) => (deal.id === updatedDeal.id ? updatedDeal : deal)),
      );
    });

    // Lắng nghe negotiation round mới
    socket.on(
      "negotiation:new-round",
      ({ dealId, round }: { dealId: string; round: NegotiationRound }) => {
        console.log("Negotiation round mới:", dealId, round);
        setDeals((prev) =>
          prev.map((deal) => {
            if (deal.id !== dealId) return deal;
            return {
              ...deal,
              negotiationRounds: [...(deal.negotiationRounds || []), round],
            };
          }),
        );
      },
    );

    // Lắng nghe trạng thái deal đổi
    socket.on(
      "deal:status-changed",
      ({
        dealId,
        status,
        finalPrice,
      }: {
        dealId: string;
        status: string;
        finalPrice?: number;
      }) => {
        console.log("Trạng thái deal đổi:", dealId, status);
        setDeals((prev) =>
          prev.map((deal) => {
            if (deal.id !== dealId) return deal;
            return {
              ...deal,
              status,
              finalPrice: finalPrice || deal.finalPrice,
            };
          }),
        );
      },
    );

    // Lắng nghe deals list được refresh
    socket.on(
      "deals:refreshed",
      ({ count, deals: refreshedDeals }: { count: number; deals: Deal[] }) => {
        console.log(`Deals refreshed from API: ${count} deals`);
        setDeals(refreshedDeals);
      },
    );

    return () => {
      socket.emit("deals:unsubscribe");
      socket.off("deal:created");
      socket.off("deal:updated");
      socket.off("negotiation:new-round");
      socket.off("deal:status-changed");
      socket.off("deals:refreshed");
    };
  }, [socket]);

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

  const handleCounterPrice = async (deal: Deal) => {
    try {
      setActionLoading(deal.id);

      const rounds = deal.negotiationRounds || [];

      if (rounds.length === 0) {
        throw new Error("Không tìm thấy negotiation round.");
      }

      const latestRound = rounds[rounds.length - 1];
      const roundId = latestRound.id;

      const price = Number(counterPrice[deal.id]);

      if (!price || price <= 0) {
        throw new Error("Vui lòng nhập giá muốn thương lượng.");
      }

      await negotiationApi.respondToRound(deal.id, roundId, price);

      setCounterPrice((prev) => ({
        ...prev,
        [deal.id]: "",
      }));

      await fetchDeals();
    } catch (error: any) {
      console.error(error);
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
                <div className="border-t border-slate-100 pt-4">
                  {isPending ? (
                    <div className="flex flex-col gap-3">
                      {/* Input phản hồi giá */}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Nhập giá phản hồi..."
                          value={counterPrice[deal.id] || ""}
                          onChange={(e) =>
                            setCounterPrice((prev) => ({
                              ...prev,
                              [deal.id]: e.target.value,
                            }))
                          }
                          className="h-9 flex-1 rounded-md border border-slate-200 px-3 text-sm"
                        />

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === `counter-${deal.id}`}
                          onClick={() => handleCounterPrice(deal)}
                        >
                          {actionLoading === `counter-${deal.id}` ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <MessageSquare size={14} className="mr-1" />
                          )}
                          Gửi phản hồi giá
                        </Button>
                      </div>

                      <div className="flex justify-end gap-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-slate-200 text-slate-600"
                          disabled={actionLoading !== null}
                          onClick={() => handleUpdateStatus(deal, "rejected")}
                        >
                          <XCircle size={16} />
                          Từ chối
                        </Button>

                        <Button
                          size="sm"
                          className="gap-2 bg-emerald-600 text-white"
                          disabled={actionLoading !== null}
                          onClick={() => handleUpdateStatus(deal, "accepted")}
                        >
                          <CheckCircle size={16} />
                          Chấp thuận
                        </Button>
                      </div>
                    </div>
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
