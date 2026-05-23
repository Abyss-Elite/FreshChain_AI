"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Loader2,
  RefreshCw,
  Scale,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dealsApi, matchingApi, trucksApi } from "@/lib/api";
import { onlyDigits, vnd } from "@/lib/utils";

export default function MatchingPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setRefreshing(true);
      const contextData = await matchingApi.getContext();
      setData(contextData);

      // Nếu là Chủ xe (SHIPPER), auto-select xe đầu tiên
      if (
        contextData?.role === "SHIPPER" &&
        contextData?.myTrucks?.length > 0
      ) {
        setSelectedTruckId(contextData.myTrucks[0].id);
      }
    } catch (error: any) {
      toast.error(error.message || "Không tải được dữ liệu ghép hàng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * Khi người dùng chọn xe khác, cập nhật matches tương ứng
   */
  const handleTruckChange = (truckId: string) => {
    setSelectedTruckId(truckId);

    // Nếu có myTrucks, tìm xe được chọn và tái tính toán matches
    if (data?.myTrucks && data?.role === "SHIPPER") {
      const selectedTruck = data.myTrucks.find((t: any) => t.id === truckId);
      if (selectedTruck && data.myShipments) {
        const newMatches = data.myShipments
          .map((shipment: any) => ({
            shipment,
            truck: selectedTruck,
            // Tái tính điểm ghép đơn giản dựa trên tải trọng
            matchingScore:
              selectedTruck.remainingKg >= shipment.weightKg ? 85 : 40,
            estimatedSavings: Math.round(shipment.proposedPrice * 0.1),
            warnings: [],
          }))
          .filter(
            (item: any) => item.shipment.weightKg <= selectedTruck.remainingKg,
          )
          .sort((a: any, b: any) => b.matchingScore - a.matchingScore);

        setData((prev: any) => ({
          ...prev,
          target: selectedTruck,
          matches: newMatches,
        }));
      }
    }
  };

  const createDeal = async (match: any, accepted: boolean) => {
    // Lấy giá từ offer nếu thương lượng, hoặc từ proposedPrice nếu chấp nhận
    const price = accepted
      ? Number(match.shipment.proposedPrice)
      : Number(offer);

    if (!price || price <= 0) {
      return toast.error("Giá thương lượng phải là số dương");
    }

    if (!selectedTruckId) {
      return toast.error("Vui lòng chọn xe vận chuyển");
    }

    try {
      const key = `${match.shipment.id}-${selectedTruckId}`;
      setBusy(key);

      await dealsApi.create({
        shipmentId: match.shipment.id,
        truckId: selectedTruckId,
        proposedPrice: price,
        status: accepted ? "ACCEPTED" : "PROPOSED",
      });

      toast.success(
        accepted ? "Đã chấp nhận ghép hàng" : "Đã gửi giá thương lượng",
      );
      setOfferFor(null);
      setOffer("");
      load();
    } catch (error: any) {
      console.error("Lỗi tạo đề xuất:", error);
      toast.error(error.message || "Không tạo được đề xuất");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Đang tính toán ghép hàng...
        </div>
      </DashboardShell>
    );
  }

  const isCarrier = data?.role === "SHIPPER";
  const target = data?.target;
  const matches = data?.matches || [];
  const myTrucks = data?.myTrucks || [];

  return (
    <DashboardShell>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Ghép hàng thông minh
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isCarrier
              ? "Chủ xe xem đơn hàng đang chờ ghép phù hợp với đội xe."
              : "Chủ hàng xem xe phù hợp nhất với đơn vận chuyển."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      <div
        className={`mb-4 rounded-lg border px-4 py-3 ${
          isCarrier
            ? "border-sky-200 bg-sky-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <p
          className={`text-xs font-bold uppercase tracking-wide ${
            isCarrier ? "text-sky-700" : "text-emerald-700"
          }`}
        >
          {isCarrier
            ? "Khu vực Chủ xe / Nhà xe"
            : "Khu vực Chủ doanh nghiệp / Chủ hàng"}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          {isCarrier
            ? "Tìm các đơn hàng tối ưu theo tải trọng khả dụng và tuyến xe hiện tại."
            : "Tìm xe phù hợp nhất theo tuyến, nhiệt độ và tải trọng yêu cầu."}
        </p>
      </div>

      {/* CHỌN XE - CHỈ HIỂN THỊ CHO CHỦ XE (SHIPPER) */}
      {isCarrier && myTrucks.length > 0 && (
        <Card className="mb-4 border border-sky-200 bg-white p-4">
          <Label className="text-sm font-semibold text-slate-900">
            Chọn xe vận chuyển *
          </Label>
          <div className="relative z-10 mt-2">
            <Select
              value={selectedTruckId || ""}
              onValueChange={handleTruckChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn một chiếc xe từ đội của bạn" />
              </SelectTrigger>
              <SelectContent>
                {myTrucks.map((truck: any) => (
                  <SelectItem key={truck.id} value={truck.id}>
                    <span className="flex items-center gap-2">
                      <Truck size={14} />
                      {truck.plateNumber} -{" "}
                      {truck.remainingKg.toLocaleString("vi-VN")} kg
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Danh sách đơn hàng sẽ tự động cập nhật theo xe bạn chọn
          </p>
        </Card>
      )}

      {/* HIỂN THỊ XE/ĐƠN Đang XÉT */}
      {target ? (
        <Card className="mb-4 border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-white p-2 text-emerald-700">
              {isCarrier ? <Truck size={18} /> : <Scale size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                {isCarrier ? "Xe đang xét" : "Đơn hàng đang xét"}
              </p>
              <h2
                className="mt-1 truncate text-base font-bold text-slate-900"
                title={isCarrier ? target.plateNumber : target.cargoType}
              >
                {isCarrier ? target.plateNumber : target.cargoType}
              </h2>
              <p
                className="mt-1 truncate text-sm text-slate-600"
                title={
                  isCarrier
                    ? target.currentRoute
                    : `${target.pickup} -> ${target.dropoff}`
                }
              >
                {isCarrier
                  ? target.currentRoute
                  : `${target.pickup} -> ${target.dropoff}`}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {isCarrier
            ? "Bạn chưa có xe nào để ghép đơn."
            : "Bạn chưa có đơn hàng nào để ghép xe."}
        </Card>
      )}

      {/* DANH SÁCH GHÉP HÀNG */}
      <div className="space-y-3">
        {matches.length === 0 ? (
          <Card className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Không có đơn hàng phù hợp với lựa chọn hiện tại
          </Card>
        ) : (
          matches.map((match: any, index: number) => {
            const key = `${match.shipment.id}-${match.truck?.id || selectedTruckId || index}`;
            const primary = isCarrier
              ? match.shipment.cargoType
              : match.truck.plateNumber;
            const secondary = isCarrier
              ? `${match.shipment.pickup} -> ${match.shipment.dropoff}`
              : match.truck.currentRoute;
            const weight = isCarrier
              ? match.shipment.weightKg
              : match.truck.remainingKg;
            const route = isCarrier
              ? `${match.shipment.pickup} -> ${match.shipment.dropoff}`
              : match.truck.currentRoute;
            const temp = match.truck.refrigerated
              ? `${match.truck.tempMin}°C đến ${match.truck.tempMax}°C`
              : "Không yêu cầu làm lạnh";
            const price = isCarrier
              ? match.shipment.proposedPrice
              : match.estimatedSavings;

            return (
              <Card
                key={key}
                className="border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Zap size={17} className="shrink-0 text-amber-500" />
                      <h2
                        className="truncate text-base font-bold text-slate-900"
                        title={primary}
                      >
                        {primary}
                      </h2>
                    </div>
                    <p
                      className="mt-1 truncate text-sm text-slate-500"
                      title={secondary}
                    >
                      {secondary}
                    </p>
                  </div>
                  <Badge
                    tone={match.matchingScore >= 80 ? "green" : "amber"}
                    className="shrink-0"
                  >
                    {match.matchingScore}%
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      {isCarrier ? "Khối lượng" : "Tải còn trống"}
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-bold text-slate-900"
                      title={`${weight} kg`}
                    >
                      {Number(weight || 0).toLocaleString("vi-VN")} kg
                    </p>
                    <p
                      className="mt-2 truncate text-xs text-slate-500"
                      title={temp}
                    >
                      {temp}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      Lộ trình
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-bold text-slate-900"
                      title={route}
                    >
                      {route}
                    </p>
                    <p
                      className="mt-2 truncate text-xs text-slate-500"
                      title={vnd(Number(price) || 0)}
                    >
                      {vnd(Number(price) || 0)}
                    </p>
                  </div>
                </div>

                {match.warnings?.length > 0 && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                    {match.warnings
                      .slice(0, 2)
                      .map((warning: string, index: number) => (
                        <p
                          key={index}
                          className="truncate text-xs text-amber-800"
                          title={warning}
                        >
                          {warning}
                        </p>
                      ))}
                  </div>
                )}

                {offerFor === key && (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Giá đề xuất
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <Input
                        inputMode="numeric"
                        value={
                          offer ? Number(offer).toLocaleString("vi-VN") : ""
                        }
                        onChange={(event) =>
                          setOffer(onlyDigits(event.target.value))
                        }
                        placeholder="1,500,000 VND"
                        className="flex-1"
                      />
                      <Button
                        className="bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                        disabled={busy === key}
                        onClick={() => createDeal(match, false)}
                      >
                        Gửi
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {offer
                        ? `${vnd(Number(offer))} đang chờ xác nhận`
                        : "Chỉ nhập chữ số"}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOfferFor(offerFor === key ? null : key)}
                  >
                    <Wallet size={14} />
                    Thương lượng giá
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={busy === key}
                    onClick={() => createDeal(match, true)}
                  >
                    <CheckCircle size={14} />
                    Chấp nhận ghép
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </DashboardShell>
  );
}
