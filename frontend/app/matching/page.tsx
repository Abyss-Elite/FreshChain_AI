"use client";

import React, { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  CheckCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
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
import { useUser } from "@/contexts/user-context";
import { negotiationApi, matchingApi } from "@/lib/api";
import { onlyDigits, vnd } from "@/lib/utils";

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

  const isTruckOwner = context?.role === "SHIPPER";
  const items = isTruckOwner
    ? context?.myTrucks || []
    : context?.myShipments || [];
  const selectedItem = items.find((item: any) => item.id === selectedId);

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
    fallbackPrice?: number,
  ) => {
    const key = priceKey(shipmentId, truckId);
    const priceValue = Number(priceInput[key] || fallbackPrice);

    if (!priceValue || priceValue <= 0) {
      toast.error("Vui lòng nhập giá đề xuất hợp lệ.");
      return;
    }

    const requestKey = `send-${shipmentId}-${truckId}-${status}`;
    setBusyId(requestKey);
    try {
      // 💡 CẬP NHẬT: Truyền thêm tham số truckId vào vị trí thứ 2 theo đúng hàm API mới sửa
      await negotiationApi.createDeal(shipmentId, truckId, priceValue);
      
      toast.success(
        status === "COUNTERED"
          ? "Đã gửi yêu cầu thương lượng."
          : "Đã gửi yêu cầu ghép hàng.",
      );
      if (selectedId) await loadDetail(selectedId);
      await loadContext();
    } catch (error: any) {
      toast.error(error.message || "Không gửi được yêu cầu.");
    } finally {
      setBusyId(null);
    }
  };

  // --- ĐOẠN CODE ĐÃ ĐƯỢC CẬP NHẬT CHUẨN THEO NGHIỆP VỤ ĐÀM PHÁN ---
  const updateDealStatus = async (
    dealId: string,
    status: DealStatus,
    counterPrice?: number,
  ) => {
    setBusyId(dealId);
    try {
      // 1. Lấy thông tin request hiện tại từ danh sách để lấy roundId (Multi-round)
      const currentRequest = detail?.requests?.find(
        (r: any) => r.id === dealId,
      );
      const roundId =
        currentRequest?.currentRoundId || currentRequest?.latestRound?.id;

      // 2. Phân luồng xử lý API chính xác theo cấu trúc Price Negotiation mới
      if (status === "ACCEPTED") {
        if (!roundId)
          throw new Error(
            "Không tìm thấy mã lượt đàm phán (roundId) để chấp nhận giá.",
          );
        await negotiationApi.acceptPrice(dealId, roundId);
        toast.success("Đã chấp nhận mức giá thỏa thuận thành công!");
      } else if (status === "COUNTERED") {
        if (!roundId)
          throw new Error(
            "Không tìm thấy mã lượt đàm phán (roundId) để phản hồi.",
          );
        if (!counterPrice || counterPrice <= 0)
          throw new Error("Vui lòng nhập giá muốn thương lượng.");
        await negotiationApi.respondToRound(dealId, roundId, counterPrice);
        toast.success("Đã gửi mức giá đề xuất mới thành công!");
      } else if (status === "REJECTED") {
        await negotiationApi.rejectDeal(dealId);
        toast.success("Đã từ chối lượt đàm phán này.");
      }

      // 3. Tải lại dữ liệu sau khi cập nhật thành công
      if (selectedId) await loadDetail(selectedId);
      await loadContext();
    } catch (error: any) {
      toast.error(error.message || "Không cập nhật được trạng thái đàm phán.");
    } finally {
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
            <CardLayout
              items={items}
              selectedId={selectedId}
              isTruckOwner={isTruckOwner}
              setDetail={setDetail}
              setSelectedId={setSelectedId}
            />
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
  setDetail,
  setSelectedId,
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
        onClick={() => {
          setDetail(null);
          setSelectedId(item.id);
        }}
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
                      {vnd(request.proposedPrice)}
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
                        className="text-xs text-blue-600 hover:text-blue-700 h-9"
                        onClick={() =>
                          onUpdate(
                            request.id,
                            "COUNTERED",
                            Number(localCounterPrice[request.id]),
                          )
                        }
                        disabled={busyId === request.id}
                      >
                        <MessageSquare size={14} className="mr-1" />
                        Gửi phản hồi giá
                      </Button>
                    </div>

                    <div className="flex justify-end gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => onUpdate(request.id, "REJECTED")}
                        disabled={busyId === request.id}
                      >
                        <XCircle size={14} className="mr-1" /> Từ chối hẳn
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => onUpdate(request.id, "ACCEPTED")}
                        disabled={busyId === request.id}
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

// ==========================================
// 3. COMPONENT MATCHES SECTION
// ==========================================
export function MatchesSection({
  isTruckOwner,
  detail,
  priceInput,
  busyId,
  requestForPair,
  setPriceInput,
  sendMatchRequest,
  priceKey,
}: {
  isTruckOwner: boolean;
  detail: any;
  priceInput: Record<string, string>;
  busyId: string | null;
  requestForPair: (shipmentId: string, truckId: string) => any;
  setPriceInput: Dispatch<SetStateAction<Record<string, string>>>;
  sendMatchRequest: (
    shipmentId: string,
    truckId: string,
    status: "PROPOSED" | "COUNTERED",
    fallbackPrice?: number,
  ) => void;
  priceKey: (shipmentId: string, truckId: string) => string;
}) {
  return (
    <Card className="border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">
          {isTruckOwner ? "Đơn hàng phù hợp thuật toán" : "Xe phù hợp lộ trình"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {isTruckOwner
            ? "Danh sách đơn hàng phù hợp với xe đã chọn, sắp xếp theo tỷ lệ tối ưu. Hỗ trợ ghép nhiều đơn (Multi-drop)."
            : "Danh sách xe phù hợp với đơn hàng đã chọn, sắp xếp theo tải trọng trống khả dụng."}
        </p>
      </div>

      {detail.matches.length === 0 ? (
        <p className="text-sm text-slate-500">
          Không tìm thấy đề xuất phù hợp nào từ thuật toán.
        </p>
      ) : (
        <div className="space-y-3">
          {detail.matches.map((match: any) => {
            const shipment = isTruckOwner ? match.shipment : detail.shipment;
            const truck = isTruckOwner ? detail.truck : match.truck;
            const inputKey = priceKey(shipment.id, truck.id);
            const existingRequest = requestForPair(shipment.id, truck.id);
            const requestKey = `request-${shipment.id}-${truck.id}`;

            const hasConflict = match.warnings && match.warnings.length > 0;
            const remainingCapacityPercent = Math.round(
              (truck.remainingKg / (truck.maxCapacityKg || 1)) * 100,
            );

            return (
              <Card
                key={requestKey}
                className={`border transition p-4 ${
                  hasConflict
                    ? "border-amber-400 bg-amber-50/60"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                {hasConflict && (
                  <div className="mb-3 flex items-start gap-2 bg-amber-100 border border-amber-300 rounded-md p-3 shadow-sm animate-pulse">
                    <AlertTriangle className="text-amber-700 h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 font-medium space-y-1">
                      {match.warnings.map((w: string, idx: number) => (
                        <div key={idx}>{w}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">
                      {isTruckOwner ? shipment.cargoType : truck.plateNumber}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {isTruckOwner
                        ? `${shipment.pickup} → ${shipment.dropoff}`
                        : truck.currentRoute}
                    </p>
                  </div>
                  <Badge tone={match.matchingScore >= 80 ? "green" : "amber"}>
                    {match.matchingScore}% phù hợp
                  </Badge>
                </div>

                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 mb-3">
                  <div className="rounded-md border border-slate-200 bg-white p-2 shadow-xs">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      {isTruckOwner ? "Khối lượng đơn" : "Tải trống thực tế"}
                    </p>
                    <p className="font-bold text-xs text-slate-800 mt-0.5">
                      {(isTruckOwner
                        ? shipment.weightKg
                        : truck.remainingKg
                      ).toLocaleString("vi-VN")}{" "}
                      kg
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2 shadow-xs">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Tải trống %
                    </p>
                    <p className="font-bold text-xs text-slate-800 mt-0.5">
                      {remainingCapacityPercent}%
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2 shadow-xs">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Giá đề xuất gốc
                    </p>
                    <p className="font-bold text-xs text-emerald-600 mt-0.5">
                      {vnd(shipment.proposedPrice)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2 shadow-xs">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Trạng thái ghép
                    </p>
                    <p className="font-bold text-xs text-slate-700 mt-0.5">
                      {existingRequest
                        ? statusLabel[existingRequest.status as DealStatus] ||
                          existingRequest.status
                        : "Sẵn sàng ghép"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mt-4 border-t border-slate-200/60 pt-3">
                  <Input
                    inputMode="numeric"
                    value={priceInput[inputKey] || ""}
                    onChange={(event) =>
                      setPriceInput((prev) => ({
                        ...prev,
                        [inputKey]: onlyDigits(event.target.value),
                      }))
                    }
                    placeholder="Nhập giá muốn thương lượng..."
                    disabled={Boolean(existingRequest)}
                    className="text-xs h-9 bg-white"
                  />
                  <div className="flex gap-2 min-w-[240px]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      disabled={
                        busyId === requestKey || Boolean(existingRequest)
                      }
                      onClick={() =>
                        sendMatchRequest(shipment.id, truck.id, "COUNTERED")
                      }
                    >
                      <MessageSquare size={13} className="mr-1 text-blue-500" />{" "}
                      Đàm phán giá
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs flex-1"
                      disabled={
                        busyId === requestKey || Boolean(existingRequest)
                      }
                      onClick={() =>
                        sendMatchRequest(
                          shipment.id,
                          truck.id,
                          "PROPOSED",
                          shipment.proposedPrice,
                        )
                      }
                    >
                      <CheckCircle size={13} className="mr-1" /> Chốt ghép nhanh
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
