"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shipmentsApi } from "@/lib/api";

export default function CompatibilityPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");
  const [matchingData, setMatchingData] = useState<any>(null);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    shipmentsApi
      .getAll()
      .then((data) => {
        setShipments(data);
        if (data.length > 0) {
          setSelectedShipmentId(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingShipments(false));
  }, []);

  useEffect(() => {
    if (!selectedShipmentId) return;

    setLoadingMatches(true);
    // Khớp chính xác với hàm: shipmentsApi.getMatches(shipmentId)
    shipmentsApi
      .getMatches(selectedShipmentId)
      .then((res) => {
        setMatchingData(res);
      })
      .catch(console.error)
      .finally(() => setLoadingMatches(false));
  }, [selectedShipmentId]);

  const getScoreMeta = (score: number) => {
    if (score >= 80)
      return {
        tone: "green" as const,
        status: "Tương thích cao",
        icon: CheckCircle2,
        colorClass: "bg-emerald-500",
      };
    if (score >= 50)
      return {
        tone: "amber" as const,
        status: "Hạn chế / Cảnh báo",
        icon: AlertTriangle,
        colorClass: "bg-amber-500",
      };
    return {
      tone: "red" as const,
      status: "Xung đột thuộc tính",
      icon: ShieldAlert,
      colorClass: "bg-red-500",
    };
  };

  return (
    <AppShell
      title="FreshChain Compatibility Engine"
      subtitle="Quét rủi ro tương thích dựa trên danh mục hàng, dải nhiệt độ, và cảnh báo nhiễm mùi chéo chặng."
    >
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        {/* THANH ĐIỀU HƯỚNG VÀ LUẬT HỆ THỐNG */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Chọn mặt hàng kiểm thử
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingShipments ? (
                <p className="text-sm text-muted-foreground">
                  Đang tải danh mục hàng...
                </p>
              ) : (
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={selectedShipmentId}
                  onChange={(e) => setSelectedShipmentId(e.target.value)}
                >
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.cargoType} ({s.weightKg} kg)
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="text-amber-500" size={18} /> Bộ quy tắc
                FreshChain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="rounded-md border p-2 bg-background">
                🚫 Không xếp chung hàng tỏa mùi nặng (sầu riêng, mít) với nông
                sản nhạy cảm.
              </div>
              <div className="rounded-md border p-2 bg-background">
                ❄️ Đơn đông lạnh yêu cầu thùng xe giữ vững biên độ nhiệt âm suốt
                hành trình.
              </div>
              <div className="rounded-md border p-2 bg-background">
                📦 Hàng dễ vỡ, dập (hoa quả mềm) luôn được ưu tiên xếp tầng trên
                cùng.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DANH SÁCH XE VÀ ĐIỂM SỐ TƯƠNG THÍCH THEO CHUYẾN THỰC TẾ */}
        <div className="space-y-4">
          {loadingMatches ? (
            <div className="flex justify-center items-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="animate-spin" /> Động cơ AI đang tính điểm
              tương thích...
            </div>
          ) : !matchingData ||
            !matchingData.matches ||
            matchingData.matches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-card">
              Không tìm thấy đội xe nào trong khu vực để so khớp thông số tương
              thích.
            </div>
          ) : (
            <>
              {matchingData.combineSuggestion && (
                <div className="rounded-md bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-300 font-medium">
                  💡 <b>Phương án tối ưu tải trọng:</b>{" "}
                  {matchingData.combineSuggestion}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {matchingData.matches.map((matchItem: any) => {
                  const { truck, matchingScore, reasons, compatibilityType } =
                    matchItem;
                  const meta = getScoreMeta(matchingScore);
                  const IconComponent = meta.icon;

                  return (
                    <Card
                      key={truck.id}
                      className="p-5 flex flex-col justify-between bg-card hover:shadow-sm transition-shadow"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Biển kiểm soát
                            </p>
                            <h3 className="text-lg font-bold">
                              {truck.plateNumber}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {truck.type}
                            </p>
                          </div>
                          <IconComponent
                            className={
                              matchingScore >= 50
                                ? matchingScore >= 80
                                  ? "text-emerald-500"
                                  : "text-amber-500"
                                : "text-red-500"
                            }
                            size={22}
                          />
                        </div>

                        <div className="mt-4 text-xs space-y-1 text-muted-foreground">
                          <p>
                            • Tải trọng khả dụng:{" "}
                            {truck.remainingKg?.toLocaleString()} kg
                          </p>
                          <p>
                            • Nhiệt độ thùng xe: {truck.tempMin ?? "N/A"}°C đến{" "}
                            {truck.tempMax ?? "N/A"}°C
                          </p>
                          {reasons &&
                            reasons.map((reason: string, idx: number) => (
                              <p
                                key={idx}
                                className="text-amber-600 dark:text-amber-400 font-medium"
                              >
                                • {reason}
                              </p>
                            ))}
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <Badge tone={meta.tone}>
                            {compatibilityType || meta.status}
                          </Badge>
                          <Badge tone={meta.tone}>
                            Độ khớp: {matchingScore}%
                          </Badge>
                        </div>

                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className={`h-1.5 rounded-full ${meta.colorClass}`}
                            style={{ width: `${matchingScore}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
