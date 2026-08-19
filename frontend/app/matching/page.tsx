"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  CheckCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
  Search,
  Truck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/contexts/user-context";
import { negotiationApi, matchingApi } from "@/lib/api";
import { normalizeSearchText, onlyDigits, vnd } from "@/lib/utils";
import { MatchesSection } from "@/components/matches-section";

const SIDEBAR_PAGE_SIZE = 5;

const shipmentStatusLabel: Record<string, string> = {
  PENDING: "Chờ xử lý",
  MATCHING: "Đang tìm xe",
};

type DealStatus = "PROPOSED" | "COUNTERED" | "ACCEPTED" | "REJECTED";

const statusTone: Record<DealStatus, "green" | "blue" | "amber" | "red"> = {
  PROPOSED: "amber",
  COUNTERED: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
};

const statusLabel: Record<DealStatus, string> = {
  PROPOSED: "Đang chờ",
  COUNTERED: "Thương lượng",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
};

// ==========================================
// 1. COMPONENT TRANG CHÍNH (EXPORT DEFAULT)
// ==========================================
export default function MatchingPage() {
  const { user } = useUser();
  const [context, setContext] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarStatusFilter, setSidebarStatusFilter] = useState("all");
  const [sidebarPage, setSidebarPage] = useState(1);

  const isTruckOwner = context?.role === "SHIPPER";
  const items = isTruckOwner
    ? context?.myTrucks || []
    : context?.myShipments || [];
  const selectedItem = items.find((item: any) => item.id === selectedId);

  const filteredItems = useMemo(() => {
    const query = normalizeSearchText(sidebarSearch.trim());
    const queryCompact = query.replace(/[\s\-.]/g, "");
    return items.filter((item: any) => {
      const plateCompact = normalizeSearchText(item.plateNumber).replace(/[\s\-.]/g, "");
      const matchesQuery = isTruckOwner
        ? !query ||
          normalizeSearchText(item.plateNumber).includes(query) ||
          (queryCompact && plateCompact.includes(queryCompact)) ||
          normalizeSearchText(item.type).includes(query) ||
          normalizeSearchText(item.currentRoute).includes(query)
        : !query ||
          normalizeSearchText(item.cargoType).includes(query) ||
          normalizeSearchText(item.pickup).includes(query) ||
          normalizeSearchText(item.dropoff).includes(query);

      const matchesStatus = isTruckOwner
        ? sidebarStatusFilter === "all" ||
          (sidebarStatusFilter === "active"
            ? item.active !== false
            : item.active === false)
        : sidebarStatusFilter === "all" || item.status === sidebarStatusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [items, sidebarSearch, sidebarStatusFilter, isTruckOwner]);

  useEffect(() => {
    setSidebarPage(1);
  }, [sidebarSearch, sidebarStatusFilter, isTruckOwner]);

  const sidebarTotalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / SIDEBAR_PAGE_SIZE),
  );
  const paginatedItems = filteredItems.slice(
    (sidebarPage - 1) * SIDEBAR_PAGE_SIZE,
    sidebarPage * SIDEBAR_PAGE_SIZE,
  );

  const priceKey = (shipmentId: string, truckId: string) =>
    `${shipmentId}:${truckId}`;

  const loadContext = async () => {
    try {
      setRefreshing(true);
      const contextData = await matchingApi.getContext();
      const nextItems =
        contextData.role === "SHIPPER"
          ? contextData.myTrucks || []
          : contextData.myShipments || [];

      setContext(contextData);
      setDetail(null);
      setSelectedId((current) =>
        current && nextItems.some((item: any) => item.id === current)
          ? current
          : contextData.target?.id || nextItems[0]?.id || null,
      );
    } catch (error: any) {
      toast.error(error.message || "Không tải được dữ liệu ghép hàng.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const payload = isTruckOwner
        ? await matchingApi.getTruckDetail(id)
        : await matchingApi.getShipmentDetail(id);
      setDetail(payload);
      setPriceInput({});
    } catch (error: any) {
      setDetail(null);
      toast.error(error.message || "Không tải được chi tiết ghép hàng.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    if (!context || !selectedId) return;
    if (!items.some((item: any) => item.id === selectedId)) {
      setSelectedId(items[0]?.id || null);
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
  }, [context, selectedId]);

  const requestForPair = (shipmentId: string, truckId: string) =>
    detail?.requests?.find(
      (request: any) =>
        request.shipmentId === shipmentId && request.truckId === truckId,
    );

  const sendMatchRequest = async (
    shipmentId: string,
    truckId: string,
    status: "PROPOSED" | "COUNTERED",
    shipmentProposedPrice?: number,
  ) => {
    const inputKey = priceKey(shipmentId, truckId);

    const requestKey = `request-${shipmentId}-${truckId}`;

    let priceValue: number;

    // =========================
    // QUICK MATCH
    // =========================
    if (status === "PROPOSED") {
      priceValue = Number(shipmentProposedPrice);

      if (!priceValue || priceValue <= 0) {
        toast.error("Không tìm thấy giá gốc của chủ hàng.");
        return;
      }
    }

    // =========================
    // NEGOTIATION
    // =========================
    else {
      priceValue = Number(priceInput[inputKey]);

      if (!priceValue || priceValue <= 0) {
        toast.error("Vui lòng nhập giá muốn thương lượng.");
        return;
      }
    }

    setBusyId(requestKey);

    try {
      await negotiationApi.createDeal(shipmentId, truckId, priceValue);

      toast.success(
        status === "COUNTERED"
          ? "Đã gửi phản hồi giá thành công!"
          : "Đã chốt ghép nhanh thành công!",
      );

      // clear input cũ
      setPriceInput((prev) => {
        const next = { ...prev };
        delete next[inputKey];
        return next;
      });

      // auto refresh
      if (selectedId) {
        await loadDetail(selectedId);
      }

      await loadContext();
    } catch (error: any) {
      toast.error(error.message || "Không gửi được yêu cầu.");
    } finally {
      setBusyId(null);
    }
  };

  const updateDealStatus = async (
    dealId: string,
    status: DealStatus,
    counterPrice?: number,
  ) => {
    const requestKey = `deal-${dealId}-${status}`;
    setBusyId(requestKey);

    try {
      const currentRequest = detail?.requests?.find(
        (r: any) => r.id === dealId,
      );

      // =============================================================
      // 💥 SỬA ĐOẠN NÀY: Lấy roundId chuẩn từ mảng negotiationRounds
      // =============================================================
      const rounds = currentRequest?.negotiationRounds || [];
      const latestRound = rounds[rounds.length - 1]; // Lấy phần tử cuối cùng của mảng
      const roundId = currentRequest?.currentRoundId || latestRound?.id;
      // =============================================================

      if (status === "ACCEPTED") {
        if (!roundId) {
          throw new Error("Không tìm thấy vòng đàm phán (roundId).");
        }

        await negotiationApi.acceptPrice(dealId, roundId);
        toast.success("Đã chốt giá thành công!");
      } else if (status === "COUNTERED") {
        if (!roundId) {
          throw new Error("Không tìm thấy vòng đàm phán (roundId).");
        }

        if (!counterPrice || counterPrice <= 0) {
          throw new Error("Vui lòng nhập giá muốn thương lượng.");
        }

        await negotiationApi.respondToRound(dealId, roundId, counterPrice);
        toast.success("Đã gửi phản hồi giá thành công!");
      } else if (status === "REJECTED") {
        await negotiationApi.rejectDeal(dealId);
        toast.success("Đã từ chối đàm phán.");
      }

      // clear counter input
      setPriceInput({});

      // auto refresh
      if (selectedId) {
        await loadDetail(selectedId);
      }
      await loadContext();
    } catch (error: any) {
      toast.error(error.message || "Không cập nhật được trạng thái.");
    }
    {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Đang tải dữ liệu ghép hàng...
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Ghép hàng thông minh
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isTruckOwner
              ? "Chủ xe chọn từng xe để xem yêu cầu gửi vào xe và các đơn hàng phù hợp."
              : "Chủ hàng chọn từng đơn chưa ghép để xem yêu cầu từ xe và danh sách xe phù hợp."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadContext}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {/* SIDEBAR: DANH SÁCH XE HOẶC ĐƠN HÀNG CỦA TÔI */}
        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {isTruckOwner
                ? "Danh sách xe của tôi"
                : "Đơn hàng chưa ghép của tôi"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isTruckOwner
                ? "Chọn một xe để xem chi tiết ghép hàng lũy kế."
                : "Chọn một đơn hàng để xem xe phù hợp tuyến đường."}
            </p>
          </Card>

          {items.length === 0 ? (
            <Card className="border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              {isTruckOwner
                ? "Bạn chưa có xe nào để ghép hàng."
                : "Bạn chưa có đơn hàng nào đang chờ ghép."}
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder={
                      isTruckOwner
                        ? "Tìm biển số, loại xe, tuyến..."
                        : "Tìm loại hàng, điểm đi, điểm đến..."
                    }
                    className="pl-9"
                  />
                </div>
                <Select
                  value={sidebarStatusFilter}
                  onValueChange={setSidebarStatusFilter}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {isTruckOwner ? (
                      <>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="paused">Tạm dừng</SelectItem>
                      </>
                    ) : (
                      Object.entries(shipmentStatusLabel).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ),
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {filteredItems.length === 0 ? (
                <Card className="border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                  Không tìm thấy {isTruckOwner ? "xe" : "đơn hàng"} phù hợp
                  với bộ lọc hiện tại.
                </Card>
              ) : (
                <>
                  <CardLayout
                    items={paginatedItems}
                    selectedId={selectedId}
                    isTruckOwner={isTruckOwner}
                    onSelect={(id: string) => {
                      setSelectedId(id);
                      loadDetail(id);
                    }}
                  />
                  <Pagination
                    page={sidebarPage}
                    totalPages={sidebarTotalPages}
                    onPageChange={setSidebarPage}
                    totalItems={filteredItems.length}
                    pageSize={SIDEBAR_PAGE_SIZE}
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* CHI TIẾT VÀ DANH SÁCH GHÉP KHỚP (MATCHES) */}
        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isTruckOwner
                    ? "Chi tiết xe & Quản lý tải"
                    : "Chi tiết đơn hàng"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedItem
                    ? "Hệ thống tự động chấm điểm và cảnh báo kỵ hàng dựa trên các đơn đã xếp trên xe."
                    : "Chọn một mục bên trái để bắt đầu tính toán."}
                </p>
              </div>
              {detailLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              )}
            </div>
          </Card>

          {!selectedItem ? (
            <Card className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Vui lòng chọn xe hoặc đơn hàng để tiếp tục.
            </Card>
          ) : detail ? (
            <>
              {/* Thẻ thông tin tổng quan mục tiêu đang chọn */}
              <Card className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-white p-3 text-slate-700 border border-slate-200 shadow-sm">
                    {isTruckOwner ? <Truck size={20} /> : <Scale size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {isTruckOwner
                        ? detail.truck.plateNumber
                        : detail.shipment.cargoType}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {isTruckOwner
                        ? detail.truck.currentRoute
                        : `${detail.shipment.pickup} → ${detail.shipment.dropoff}`}
                    </p>
                  </div>
                  <Badge tone={isTruckOwner ? "blue" : "green"}>
                    {isTruckOwner ? "Xe mục tiêu" : "Đơn mục tiêu"}
                  </Badge>
                </div>
              </Card>

              {/* Khu vực xử lý các yêu cầu thương lượng ĐÃ GỬI ĐẾN */}
              <RequestsSection
                isTruckOwner={isTruckOwner}
                requests={detail.requests || []}
                userId={user?.id}
                busyId={busyId}
                onUpdate={updateDealStatus}
              />

              {/* Khu vực hiển thị đề xuất thuật toán thông minh (Multi-drop & Warnings) */}
              <MatchesSection
                isTruckOwner={isTruckOwner}
                detail={detail}
                priceInput={priceInput}
                busyId={busyId}
                requestForPair={requestForPair}
                setPriceInput={setPriceInput}
                sendMatchRequest={sendMatchRequest}
                priceKey={priceKey}
              />
            </>
          ) : (
            <Card className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Đang tải chi tiết ghép hàng...
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

// Helper component tách biệt cho việc render danh sách Item ở Sidebar tránh duplicate
function CardLayout({
  items,
  selectedId,
  isTruckOwner,
  onSelect,
}: any) {
  return items.map((item: any) => {
    const active = item.id === selectedId;
    return (
      <Card
        key={item.id}
        className={`cursor-pointer border p-4 transition ${
          active
            ? "border-emerald-400 bg-emerald-50"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
        onClick={() => onSelect(item.id)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {isTruckOwner ? item.plateNumber : item.cargoType}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {isTruckOwner
                ? item.currentRoute
                : `${item.pickup} → ${item.dropoff}`}
            </p>
          </div>
          <Badge tone={active ? "green" : "slate"}>
            {isTruckOwner ? "Xe" : "Đơn"}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {isTruckOwner ? (
            <>
              <span className="font-medium text-emerald-700">
                {item.remainingKg?.toLocaleString("vi-VN")} kg trống
              </span>
              <span>•</span>
              <span>{item.active ? "Sẵn sàng" : "Tạm dừng"}</span>
            </>
          ) : (
            <>
              <span className="font-medium text-slate-700">
                {item.weightKg?.toLocaleString("vi-VN")} kg
              </span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">
                {vnd(item.proposedPrice)}
              </span>
            </>
          )}
        </div>
      </Card>
    );
  });
}

// ==========================================
// 2. COMPONENT REQUESTS SECTION
// ==========================================
function RequestsSection({
  isTruckOwner,
  requests,
  userId,
  busyId,
  onUpdate,
}: {
  isTruckOwner: boolean;
  requests: any[];
  userId?: string;
  busyId: string | null;
  onUpdate: (dealId: string, status: DealStatus, counterPrice?: number) => void;
}) {
  const [localCounterPrice, setLocalCounterPrice] = useState<
    Record<string, string>
  >({});

  return (
    <Card className="border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">
          {isTruckOwner ? "Yêu cầu gửi vào xe này" : "Yêu cầu từ các nhà xe"}
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-slate-500">
          Chưa có yêu cầu thương lượng nào.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const canRespond =
              request.status !== "ACCEPTED" &&
              request.status !== "REJECTED" &&
              request.owner?.id !== userId;

            return (
              <Card
                key={request.id}
                className="border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm text-slate-900">
                      {isTruckOwner
                        ? request.shipment?.cargoType || "Đơn hàng"
                        : `Xe ${request.truck?.plateNumber || ""}`}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {isTruckOwner
                        ? `${request.shipment?.pickup || ""} → ${request.shipment?.dropoff || ""}`
                        : request.truck?.currentRoute || ""}
                    </p>
                  </div>
                  <Badge
                    tone={statusTone[request.status as DealStatus] || "slate"}
                  >
                    {statusLabel[request.status as DealStatus] ||
                      request.status}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-3 grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">
                      Giá đề xuất hiện tại
                    </p>
                    <p className="mt-0.5 font-semibold text-sm text-emerald-600">
                      {(() => {
                        const latestRound =
                          request.negotiationRounds?.[
                            request.negotiationRounds.length - 1
                          ];

                        const currentPrice =
                          request.finalPrice ||
                          latestRound?.respondedPrice ||
                          latestRound?.proposedPrice;

                        return currentPrice ? vnd(currentPrice) : "Chưa có giá";
                      })()}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">
                      Đối tác gửi
                    </p>
                    <p className="mt-0.5 font-semibold text-sm text-slate-800 truncate">
                      {request.owner?.name || "Đối tác"}
                    </p>
                  </div>
                </div>

                {canRespond && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/60 pt-3">
                    <div className="flex gap-2 items-center">
                      <Input
                        inputMode="numeric"
                        placeholder="Nhập giá muốn trả lại đối tác..."
                        value={localCounterPrice[request.id] || ""}
                        onChange={(e) =>
                          setLocalCounterPrice((prev) => ({
                            ...prev,
                            [request.id]: onlyDigits(e.target.value),
                          }))
                        }
                        className="text-xs h-9 bg-white flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === `deal-${request.id}-COUNTERED`}
                        onClick={() =>
                          onUpdate(
                            request.id,
                            "COUNTERED",
                            Number(localCounterPrice[request.id]),
                          )
                        }
                      >
                        {busyId === `deal-${request.id}-COUNTERED` ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <MessageSquare size={14} className="mr-1" />
                        )}
                        Gửi phản hồi giá
                      </Button>
                    </div>

                    <div className="flex justify-end gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => onUpdate(request.id, "REJECTED")}
                        disabled={busyId === `deal-${request.id}-REJECTED`}
                      >
                        <XCircle size={14} className="mr-1" /> Từ chối hẳn
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => onUpdate(request.id, "ACCEPTED")}
                        disabled={busyId === `deal-${request.id}-ACCEPTED`}
                      >
                        <CheckCircle size={14} className="mr-1" /> Chấp nhận giá
                        này
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
