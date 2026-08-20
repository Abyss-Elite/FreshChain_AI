/**
 * EXAMPLE: MatchesSection Component
 * Shows how the new multi-drop matching system works on the frontend
 * with goods conflict warnings and price negotiation
 *
 * Tính năng:
 * ✅ Hiển thị từng matching với điểm số
 * ✅ Cảnh báo xung đột hàng hóa (Banner vàng)
 * ✅ Nhập giá (chỉ số, format VND thực tế)
 * ✅ Hai nút: "Chấp nhận ghép" vs "Thương lượng giá"
 * ✅ Mobile-first responsive design
 */

import React from "react";
import { AlertTriangle, CheckCircle, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { vnd } from "@/lib/utils";

interface MatchesSectionExampleProps {
  isTruckOwner: boolean;
  detail: {
    truck?: any;
    shipment?: any;
    matches: Array<{
      shipment: any;
      truck: any;
      matchingScore: number;
      compatibilityScore: number;
      distanceScore: number;
      capacityScore: number;
      timeScore: number;
      estimatedSavings: number;
      warnings: string[];
      conflicts: Array<{
        type: string;
        conflictingWith: string[];
      }>;
    }>;
  };
  priceInput: Record<string, string>;
  busyId: string | null;
  requestForPair: (shipmentId: string, truckId: string) => any;
  setPriceInput: (value: any) => void;
  sendMatchRequest: (
    shipmentId: string,
    truckId: string,
    status: "PROPOSED" | "COUNTERED",
    fallbackPrice?: number,
  ) => void;
  priceKey: (shipmentId: string, truckId: string) => string;
}

const statusLabel: Record<string, string> = {
  PROPOSED: "Đang chờ",
  COUNTERED: "Thương lượng",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
};

export function MatchesSectionExample({
  isTruckOwner,
  detail,
  priceInput,
  busyId,
  requestForPair,
  setPriceInput,
  sendMatchRequest,
  priceKey,
}: MatchesSectionExampleProps) {
  const onlyDigits = (value: string) => value.replace(/\D/g, "");

  return (
    <Card className="border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">
          {isTruckOwner ? "Đơn hàng phù hợp" : "Xe phù hợp"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isTruckOwner
            ? "Danh sách đơn hàng phù hợp với xe đã chọn, sắp xếp theo điểm cao nhất. Hỗ trợ ghép nhiều đơn trên cùng một xe (Multi-drop)."
            : "Danh sách xe phù hợp với đơn hàng đã chọn, sắp xếp theo điểm cao nhất."}
        </p>
      </div>

      {/* Matches List */}
      {detail.matches.length === 0 ? (
        <p className="text-sm text-slate-500">
          Không tìm thấy đề xuất phù hợp.
        </p>
      ) : (
        <div className="space-y-3">
          {detail.matches.map((match, index) => {
            const shipment = isTruckOwner ? match.shipment : detail.shipment;
            const truck = isTruckOwner ? detail.truck : match.truck;
            const inputKey = priceKey(shipment.id, truck.id);
            const existingRequest = requestForPair(shipment.id, truck.id);

            // ✨ Kiểm tra xung đột hàng hóa
            const hasConflict = match.conflicts && match.conflicts.length > 0;
            const conflictWarnings =
              match.warnings?.filter((w: string) => w.includes("Cảnh báo:")) ||
              [];
            const remainingCapacityPercent = Math.round(
              (truck.remainingKg / truck.maxCapacityKg) * 100,
            );

            return (
              <Card
                key={`${shipment.id}-${truck.id}`}
                className={`border transition ${
                  hasConflict
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-slate-200 bg-slate-50"
                } p-4`}
              >
                {/* ⚠️ CẢNH BÁO XUNG ĐỘT - Hiển thị tại trên cùng */}
                {hasConflict && (
                  <div className="mb-3 flex gap-2 bg-yellow-100 border border-yellow-300 rounded-md p-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0" />
                    <div className="text-xs sm:text-sm text-yellow-800">
                      {conflictWarnings.map((warning, idx) => (
                        <div key={idx} className="font-semibold">
                          {warning}
                        </div>
                      ))}
                      <div className="text-xs mt-1 opacity-90">
                        Bạn vẫn có thể chấp nhận nếu muốn tiếp tục.
                      </div>
                    </div>
                  </div>
                )}

                {/* Thông tin Cơ Bản - Responsive */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 text-base">
                      {isTruckOwner
                        ? shipment.cargoType
                        : `${truck.type} - ${truck.plateNumber}`}
                    </p>
                    <p className="mt-1 truncate text-xs sm:text-sm text-slate-500">
                      {isTruckOwner
                        ? `📍 ${shipment.pickup} → ${shipment.dropoff}`
                        : `📍 ${truck.currentRoute}`}
                    </p>
                  </div>
                  <Badge
                    tone={
                      match.matchingScore >= 80
                        ? "green"
                        : match.matchingScore >= 70
                          ? "amber"
                          : "red"
                    }
                  >
                    {match.matchingScore}% phù hợp
                  </Badge>
                </div>

                {/* Chi Tiết Grid - Mobile First (2-4 cột) */}
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 mb-3">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-xs text-slate-500 font-medium">
                      {isTruckOwner ? "Khối lượng" : "Tải còn lại"}
                    </p>
                    <p className="font-semibold text-sm mt-1">
                      {(isTruckOwner
                        ? shipment.weightKg
                        : truck.remainingKg
                      ).toLocaleString("vi-VN")}{" "}
                      kg
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-xs text-slate-500 font-medium">Tải %</p>
                    <p className="font-semibold text-sm mt-1 text-emerald-600">
                      {remainingCapacityPercent}%
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Giá đơn
                    </p>
                    <p className="font-semibold text-sm mt-1">
                      {vnd(shipment.proposedPrice)}
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Trạng thái
                    </p>
                    <p className="font-semibold text-sm mt-1">
                      {existingRequest
                        ? statusLabel[existingRequest.status] ||
                          existingRequest.status
                        : "Sẵn sàng"}
                    </p>
                  </div>
                </div>

                {/* Chi Tiết Matching Scores */}
                <div className="mb-3 grid gap-2 grid-cols-2 sm:grid-cols-4 text-xs">
                  {[
                    ["Tương thích", match.compatibilityScore],
                    ["Tuyến đường", match.distanceScore],
                    ["Tải trọng", match.capacityScore],
                    ["Thời gian", match.timeScore],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">{label}</span>
                        <b>{value}%</b>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hành động: Nhập giá + Nút */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Ô nhập giá */}
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={priceInput[inputKey] || ""}
                      onChange={(event) =>
                        setPriceInput((prev: any) => ({
                          ...prev,
                          [inputKey]: onlyDigits(event.target.value),
                        }))
                      }
                      placeholder="Giá thương lượng (VND)"
                      disabled={Boolean(existingRequest)}
                      className="text-sm h-9 sm:h-10"
                    />
                    {/* Hiển thị định dạng VND thực tế */}
                    {priceInput[inputKey] && (
                      <div className="text-xs text-slate-500 mt-1">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                          minimumFractionDigits: 0,
                        }).format(Number(priceInput[inputKey]))}
                      </div>
                    )}
                  </div>

                  {/* Nút Hành Động */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      onClick={() =>
                        sendMatchRequest(
                          shipment.id,
                          truck.id,
                          "PROPOSED",
                          shipment.proposedPrice,
                        )
                      }
                      disabled={
                        busyId === `${shipment.id}-${truck.id}` ||
                        Boolean(existingRequest)
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-auto"
                    >
                      <CheckCircle size={14} className="mr-1" />
                      Chấp nhận
                    </Button>
                    <Button
                      onClick={() =>
                        sendMatchRequest(shipment.id, truck.id, "COUNTERED")
                      }
                      disabled={
                        busyId === `${shipment.id}-${truck.id}` ||
                        Boolean(existingRequest)
                      }
                      variant="outline"
                      className="text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-auto"
                    >
                      <MessageSquare size={14} className="mr-1" />
                      Thương lượng
                    </Button>
                  </div>
                </div>

                {/* Lưu ý về xung đột */}
                {hasConflict && !existingRequest && (
                  <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                    ℹ️ Nếu bạn chấp nhận ghép, cũng sẽ cảnh báo người nhận.
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

/**
 * EXAMPLE USAGE in /app/matching/page.tsx:
 *
 * <MatchesSectionExample
 *   isTruckOwner={isTruckOwner}
 *   detail={detail}  // {matches: [{shipment, truck, matchingScore, warnings, conflicts, ...}]}
 *   priceInput={priceInput}
 *   busyId={busyId}
 *   requestForPair={requestForPair}
 *   setPriceInput={setPriceInput}
 *   sendMatchRequest={sendMatchRequest}
 *   priceKey={priceKey}
 * />
 *
 *
 * EXAMPLE BACKEND RESPONSE (detail.matches[0]):
 *
 * {
 *   "shipment": {
 *     "id": "ship_123",
 *     "cargoType": "Rau xanh",
 *     "category": "Nông sản",
 *     "weightKg": 500,
 *     "requiredTempMin": 5,
 *     "requiredTempMax": 15,
 *     "pickup": "Đà Lạt",
 *     "dropoff": "TP.HCM",
 *     "proposedPrice": 1700000
 *   },
 *   "truck": {
 *     "id": "truck_456",
 *     "type": "Xe lạnh",
 *     "plateNumber": "51A-123.45",
 *     "maxCapacityKg": 1500,
 *     "remainingKg": 800,  // Sau khi nhận sầu riêng (700kg)
 *     "refrigerated": true,
 *     "tempMin": 2,
 *     "tempMax": 18,
 *     "currentRoute": "Đà Lạt → TP.HCM"
 *   },
 *   "matchingScore": 72,
 *   "compatibilityScore": 65,  // Giảm vì xung đột
 *   "distanceScore": 95,
 *   "capacityScore": 53,
 *   "timeScore": 78,
 *   "estimatedSavings": 380000,
 *   "warnings": [
 *     "⚠️ Cảnh báo: Xe đang chở sầu riêng. Việc ghép thêm rau xanh có thể gây ám mùi, hư hỏng hàng hóa!"
 *   ],
 *   "conflicts": [
 *     {
 *       "type": "goods_odor_conflict",
 *       "conflictingWith": ["sầu riêng"]
 *     }
 *   ]
 * }
 */
