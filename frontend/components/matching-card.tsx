"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Snowflake,
  Truck,
  AlertCircle,
  ThermometerSun,
  Weight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { scoreMatch } from "@/lib/demo-data";
import { vnd } from "@/lib/utils";
import { useState } from "react";

interface MatchingCardProps {
  shipment: any;
  truck: any;
  index: number;
  onAccept?: (truckId: string, shipmentId: string) => void;
  onNegotiate?: (truckId: string, shipmentId: string) => void;
}

export function MatchingCard({
  shipment,
  truck,
  index,
  onAccept,
  onNegotiate,
}: MatchingCardProps) {
  const score = scoreMatch(shipment, truck);
  const [showNegotiateInput, setShowNegotiateInput] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  const hasConflict =
    score.warnings?.some((w: string) => w.includes("Cảnh báo:")) || false;
  const remainingCapacityPercent = Math.round(
    (truck.remainingKg / truck.maxCapacityKg) * 100,
  );
  const priceMatch =
    Math.abs(
      shipment.proposedPrice - truck.expectedPrice || shipment.proposedPrice,
    ) < 100000;

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setPriceInput(value);
  };

  const formatPriceDisplay = (value: string) => {
    if (!value) return "";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(Number(value));
  };

  const handleConfirmNegotiate = () => {
    const price = Number(priceInput);
    if (!price || price <= 0) {
      alert("Vui lòng nhập giá hợp lệ");
      return;
    }
    onNegotiate?.(truck.id, shipment.id);
    setShowNegotiateInput(false);
    setPriceInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="w-full"
    >
      <Card
        className={`overflow-hidden p-4 sm:p-5 ${hasConflict ? "border-yellow-400" : "border-slate-200"}`}
      >
        {/* Conflict Warning Banner */}
        {hasConflict && (
          <div className="mb-4 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 rounded-t-lg bg-yellow-50 border-b border-yellow-200 p-3 sm:p-4">
            <div className="flex gap-2 sm:gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-yellow-900">
                  ⚠️ Cảnh báo xung đột hàng hóa
                </p>
                {score.warnings
                  ?.filter((w: string) => w.includes("Cảnh báo:"))
                  .map((w: string, idx: number) => (
                    <p
                      key={idx}
                      className="text-xs sm:text-sm text-yellow-800 mt-1"
                    >
                      {w}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Mobile First Responsive */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left Section - Vehicle & Score Info */}
          <div className="min-w-0 flex-1">
            {/* Score Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge
                tone={
                  score.matchingScore >= 82
                    ? "green"
                    : score.matchingScore >= 70
                      ? "amber"
                      : "red"
                }
              >
                {score.matchingScore}% phù hợp
              </Badge>
              {truck.refrigerated && (
                <Badge tone="blue">
                  <Snowflake size={12} className="mr-1" /> Xe lạnh
                </Badge>
              )}
              {!truck.refrigerated && <Badge tone="slate">Xe thường</Badge>}
            </div>

            {/* Vehicle Info */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {truck.type} - {truck.plateNumber}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
              {truck.owner} | {truck.currentRoute}
            </p>

            {/* Detailed Specs Grid - Compact for Mobile */}
            <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 text-xs sm:text-sm">
              {/* Capacity */}
              <div className="bg-slate-50 rounded-md p-2">
                <div className="flex items-center gap-1 text-slate-600 font-medium">
                  <Weight size={14} />
                  <span>Tải còn lại</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                  {truck.remainingKg.toLocaleString("vi-VN")} kg
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 mt-1">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${remainingCapacityPercent}%` }}
                  />
                </div>
              </div>

              {/* Temperature if refrigerated */}
              {truck.refrigerated && (
                <div className="bg-blue-50 rounded-md p-2">
                  <div className="flex items-center gap-1 text-blue-600 font-medium">
                    <ThermometerSun size={14} />
                    <span>Nhiệt độ</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-blue-900 mt-1">
                    {truck.tempMin}°C ~ {truck.tempMax}°C
                  </div>
                </div>
              )}

              {/* Matching Score Breakdown */}
              <div className="bg-slate-50 rounded-md p-2">
                <div className="text-slate-600 font-medium text-xs mb-1">
                  Tương thích
                </div>
                <div className="text-sm sm:text-base font-bold text-emerald-600">
                  {score.compatibility}%
                </div>
              </div>

              {/* Time Score */}
              <div className="bg-slate-50 rounded-md p-2">
                <div className="text-slate-600 font-medium text-xs mb-1">
                  Thời gian
                </div>
                <div className="text-sm sm:text-base font-bold text-emerald-600">
                  {score.timeScore}%
                </div>
              </div>
            </div>

            {/* Route Progress */}
            <div className="mt-3 sm:mt-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                <Truck size={14} />
                <span>Tuyến dự kiến</span>
              </div>
              <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-600" />
              <div className="mt-2 flex justify-between text-xs text-slate-600">
                <span className="truncate">{shipment.pickup}</span>
                <span className="truncate text-right">{shipment.dropoff}</span>
              </div>
            </div>
          </div>

          {/* Right Section - Price & Actions */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 lg:w-64 flex-shrink-0">
            <div className="text-xs sm:text-sm text-slate-600 font-medium">
              Chi phí tiết kiệm
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
              {vnd(score.estimatedSavings)}
            </p>

            {/* Price Comparison */}
            <div className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Giá đề xuất:</span>
                <span className="font-semibold">
                  {vnd(shipment.proposedPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Giá xe:</span>
                <span className="font-semibold">
                  {vnd(truck.expectedPrice || shipment.proposedPrice)}
                </span>
              </div>
              {!priceMatch && (
                <div className="flex items-center gap-1 text-yellow-700 bg-yellow-50 p-2 rounded">
                  <AlertCircle size={14} />
                  <span>Giá chênh lệch</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              {!showNegotiateInput ? (
                <>
                  <Button
                    onClick={() => onAccept?.(truck.id, shipment.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base h-9 sm:h-10"
                  >
                    ✓ Chấp nhận ghép
                  </Button>
                  <Button
                    onClick={() => setShowNegotiateInput(true)}
                    variant="outline"
                    className="w-full text-sm sm:text-base h-9 sm:h-10"
                  >
                    💬 Thương lượng giá
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Nhập giá (VND)"
                      value={priceInput}
                      onChange={handlePriceChange}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    {priceInput && (
                      <div className="text-xs text-slate-500 mt-1 text-right">
                        {formatPriceDisplay(priceInput)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleConfirmNegotiate}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm h-8 sm:h-9"
                    >
                      Gửi
                    </Button>
                    <Button
                      onClick={() => {
                        setShowNegotiateInput(false);
                        setPriceInput("");
                      }}
                      variant="outline"
                      className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
