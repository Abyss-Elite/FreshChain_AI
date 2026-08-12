"use client";

import React from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  CheckCircle,
  Loader2,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { onlyDigits, vnd } from "@/lib/utils";

type DealStatus = "PROPOSED" | "COUNTERED" | "ACCEPTED" | "REJECTED";

const statusLabel: Record<DealStatus, string> = {
  PROPOSED: "Đang chờ",
  COUNTERED: "Thương lượng",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
};

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
                      {busyId === requestKey ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <MessageSquare
                          size={13}
                          className="mr-1 text-blue-500"
                        />
                      )}
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
                      {busyId === requestKey ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle size={13} className="mr-1" />
                      )}
                      Chốt ghép nhanh
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
