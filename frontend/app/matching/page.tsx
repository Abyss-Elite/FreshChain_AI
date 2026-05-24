"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CheckCircle, Loader2, MessageSquare, RefreshCw, Scale, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/user-context";
import { dealsApi, matchingApi } from "@/lib/api";
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
  const items = isTruckOwner ? context?.myTrucks || [] : context?.myShipments || [];
  const selectedItem = items.find((item: any) => item.id === selectedId);

  const priceKey = (shipmentId: string, truckId: string) => `${shipmentId}:${truckId}`;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!context) return;
    if (!selectedId) return;
    if (!items.some((item: any) => item.id === selectedId)) {
      setSelectedId(items[0]?.id || null);
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, selectedId]);

  const requestForPair = (shipmentId: string, truckId: string) =>
    detail?.requests?.find(
      (request: any) => request.shipmentId === shipmentId && request.truckId === truckId,
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
      await dealsApi.create({ shipmentId, truckId, proposedPrice: priceValue, status });
      toast.success(status === "COUNTERED" ? "Đã gửi yêu cầu thương lượng." : "Đã gửi yêu cầu ghép hàng.");
      if (selectedId) await loadDetail(selectedId);
      await loadContext();
    } catch (error: any) {
      toast.error(error.message || "Không gửi được yêu cầu.");
    } finally {
      setBusyId(null);
    }
  };

  const updateDealStatus = async (dealId: string, status: DealStatus, counterPrice?: number) => {
    setBusyId(dealId);
    try {
      await dealsApi.update(dealId, {
        status,
        ...(counterPrice ? { counterPrice } : {}),
      });
      toast.success(statusLabel[status]);
      if (selectedId) await loadDetail(selectedId);
      await loadContext();
    } catch (error: any) {
      toast.error(error.message || "Không cập nhật được yêu cầu.");
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
        <Button variant="outline" size="sm" onClick={loadContext} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {isTruckOwner ? "Danh sách xe của tôi" : "Đơn hàng chưa ghép của tôi"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isTruckOwner
                ? "Chọn một xe để xem chi tiết ghép hàng."
                : "Chọn một đơn hàng để xem xe phù hợp và yêu cầu từ nhà xe."}
            </p>
          </Card>

          {items.length === 0 ? (
            <Card className="border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              {isTruckOwner
                ? "Bạn chưa có xe nào để ghép hàng."
                : "Bạn chưa có đơn hàng nào đang chờ ghép."}
            </Card>
          ) : (
            items.map((item: any) => {
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
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {isTruckOwner ? item.currentRoute : `${item.pickup} → ${item.dropoff}`}
                      </p>
                    </div>
                    <Badge tone={active ? "green" : "slate"}>{isTruckOwner ? "Xe" : "Đơn"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {isTruckOwner ? (
                      <>
                        <span>{item.remainingKg.toLocaleString("vi-VN")} kg còn lại</span>
                        <span>{item.active ? "Đang hoạt động" : "Tạm dừng"}</span>
                      </>
                    ) : (
                      <>
                        <span>{item.weightKg.toLocaleString("vi-VN")} kg</span>
                        <span>{vnd(item.proposedPrice)}</span>
                      </>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isTruckOwner ? "Chi tiết xe" : "Chi tiết đơn hàng"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedItem
                    ? "Xem yêu cầu hiện có trước, sau đó chọn đề xuất phù hợp để gửi thương lượng."
                    : "Chọn một mục bên trái để bắt đầu."}
                </p>
              </div>
              {detailLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
            </div>
          </Card>

          {!selectedItem ? (
            <Card className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Vui lòng chọn xe hoặc đơn hàng để tiếp tục.
            </Card>
          ) : detail ? (
            <>
              <Card className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-white p-3 text-slate-700">
                    {isTruckOwner ? <Truck size={20} /> : <Scale size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {isTruckOwner ? detail.truck.plateNumber : detail.shipment.cargoType}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {isTruckOwner
                        ? detail.truck.currentRoute
                        : `${detail.shipment.pickup} → ${detail.shipment.dropoff}`}
                    </p>
                  </div>
                  <Badge tone={isTruckOwner ? "blue" : "green"}>
                    {isTruckOwner ? "Xe" : "Đơn hàng"}
                  </Badge>
                </div>
              </Card>

              <RequestsSection
                isTruckOwner={isTruckOwner}
                requests={detail.requests || []}
                userId={user?.id}
                busyId={busyId}
                onUpdate={updateDealStatus}
              />

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
  return (
    <Card className="border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">
          {isTruckOwner ? "Yêu cầu gửi vào xe này" : "Yêu cầu từ nhà xe"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isTruckOwner
            ? "Các đơn hàng đã gửi yêu cầu ghép tới xe bạn đang chọn."
            : "Các xe đã gửi yêu cầu ghép tới đơn hàng bạn đang chọn."}
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-slate-500">
          {isTruckOwner ? "Chưa có đơn hàng nào gửi yêu cầu tới xe này." : "Chưa có xe nào gửi yêu cầu tới đơn hàng này."}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const canRespond = request.status !== "ACCEPTED" && request.status !== "REJECTED" && request.owner?.id !== userId;
            return (
              <Card key={request.id} className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {isTruckOwner
                        ? request.shipment?.cargoType || "Đơn hàng"
                        : `Xe ${request.truck?.plateNumber || "chưa xác định"}`}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {isTruckOwner
                        ? `${request.shipment?.pickup || ""} → ${request.shipment?.dropoff || ""}`
                        : request.truck?.currentRoute || "Chưa có tuyến"}
                    </p>
                  </div>
                  <Badge tone={statusTone[request.status as DealStatus] || "slate"}>
                    {statusLabel[request.status as DealStatus] || request.status}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase text-slate-400">Giá đề xuất</p>
                    <p className="mt-1 font-semibold text-slate-900">{vnd(request.proposedPrice)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase text-slate-400">Bên gửi</p>
                    <p className="mt-1 font-semibold text-slate-900">{request.owner?.name || "Đối tác"}</p>
                  </div>
                </div>

                {canRespond && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onUpdate(request.id, "REJECTED")} disabled={busyId === request.id}>
                      <XCircle size={14} />
                      Từ chối
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onUpdate(request.id, "COUNTERED", request.proposedPrice)} disabled={busyId === request.id}>
                      <MessageSquare size={14} />
                      Thương lượng
                    </Button>
                    <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onUpdate(request.id, "ACCEPTED")} disabled={busyId === request.id}>
                      <CheckCircle size={14} />
                      Chấp nhận
                    </Button>
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

function MatchesSection({
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
          {isTruckOwner ? "Đơn hàng phù hợp" : "Xe phù hợp"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isTruckOwner
            ? "Danh sách đơn hàng phù hợp với xe đã chọn, sắp xếp theo điểm cao nhất."
            : "Danh sách xe phù hợp với đơn hàng đã chọn, sắp xếp theo điểm cao nhất."}
        </p>
      </div>

      {detail.matches.length === 0 ? (
        <p className="text-sm text-slate-500">Không tìm thấy đề xuất phù hợp.</p>
      ) : (
        <div className="space-y-3">
          {detail.matches.map((match: any) => {
            const shipment = isTruckOwner ? match.shipment : detail.shipment;
            const truck = isTruckOwner ? detail.truck : match.truck;
            const inputKey = priceKey(shipment.id, truck.id);
            const existingRequest = requestForPair(shipment.id, truck.id);
            const requestKey = `request-${shipment.id}-${truck.id}`;

            return (
              <Card key={requestKey} className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {isTruckOwner ? shipment.cargoType : truck.plateNumber}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {isTruckOwner ? `${shipment.pickup} → ${shipment.dropoff}` : truck.currentRoute}
                    </p>
                  </div>
                  <Badge tone={match.matchingScore >= 80 ? "green" : "amber"}>
                    {match.matchingScore}% phù hợp
                  </Badge>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase text-slate-400">
                      {isTruckOwner ? "Khối lượng đơn" : "Tải còn trống"}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {(isTruckOwner ? shipment.weightKg : truck.remainingKg).toLocaleString("vi-VN")} kg
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase text-slate-400">Giá đơn hàng</p>
                    <p className="mt-1 font-semibold text-slate-900">{vnd(shipment.proposedPrice)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase text-slate-400">Trạng thái</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {existingRequest ? statusLabel[existingRequest.status as DealStatus] || existingRequest.status : "Có thể gửi yêu cầu"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    inputMode="numeric"
                    value={priceInput[inputKey] || ""}
                    onChange={(event) =>
                      setPriceInput((prev) => ({
                        ...prev,
                        [inputKey]: onlyDigits(event.target.value),
                      }))
                    }
                    placeholder="Giá thương lượng"
                    disabled={Boolean(existingRequest)}
                  />
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={busyId === requestKey || Boolean(existingRequest)}
                    onClick={() => sendMatchRequest(shipment.id, truck.id, "PROPOSED", shipment.proposedPrice)}
                  >
                    <CheckCircle size={14} />
                    {existingRequest ? "Đã có yêu cầu" : "Gửi yêu cầu"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busyId === requestKey || Boolean(existingRequest)}
                    onClick={() => sendMatchRequest(shipment.id, truck.id, "COUNTERED")}
                  >
                    <MessageSquare size={14} />
                    Thương lượng
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
