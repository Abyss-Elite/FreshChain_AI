"use client";

import { useEffect, useState } from "react";
import { Boxes, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shipmentsApi, aggregationApi } from "@/lib/api";
import { vnd } from "@/lib/utils";

export default function AggregationPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");
  const [neededTrucks, setNeededTrucks] = useState<number>(3);

  const [aggregationResult, setAggregationResult] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    shipmentsApi
      .getAll()
      .then((data) => {
        // Chỉ lọc các đơn hàng đang ở trạng thái gom xe (MATCHING)
        const activeShipments = data.filter(
          (s: any) => s.status === "MATCHING",
        );
        setShipments(activeShipments.length > 0 ? activeShipments : data);

        if (data.length > 0) {
          setSelectedShipmentId(
            activeShipments.length > 0 ? activeShipments[0].id : data[0].id,
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, []);

  const handleAggregate = async () => {
    if (!selectedShipmentId) return;
    setCalculating(true);
    try {
      // Khớp chính xác với hàm: aggregationApi.aggregate(shipmentId, neededTrucks)
      const res = await aggregationApi.aggregate(
        selectedShipmentId,
        Number(neededTrucks),
      );
      setAggregationResult(res);
    } catch (error) {
      console.error("Lỗi khi gom xe:", error);
    } finally {
      setCalculating(false);
    }
  };

  const currentShipment = shipments.find((s) => s.id === selectedShipmentId);

  return (
    <AppShell
      title="Multi-truck Aggregation"
      subtitle="Hệ thống tự động gom phối nhiều xe phù hợp khi một lô hàng lớn vượt quá tải trọng của một xe đơn lẻ."
    >
      {loadingData ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" size={18} /> Đang tải dữ liệu đơn
          hàng...
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          {/* CẤU HÌNH ĐẦU VÀO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="text-sky-500" /> Cấu hình đơn hàng gom
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Chọn lô hàng cần vận chuyển:
                </label>
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={selectedShipmentId}
                  onChange={(e) => {
                    setSelectedShipmentId(e.target.value);
                    setAggregationResult(null);
                  }}
                >
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.cargoType} ({s.pickup} → {s.dropoff})
                    </option>
                  ))}
                </select>
              </div>

              {currentShipment && (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tuyến đường:</span>
                    <span className="font-medium">
                      {currentShipment.pickup} → {currentShipment.dropoff}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tổng khối lượng:
                    </span>
                    <span className="font-bold text-sky-600">
                      {currentShipment.weightKg?.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Nhiệt độ bảo quản:
                    </span>
                    <span>
                      {currentShipment.requiredTempMin}°C đến{" "}
                      {currentShipment.requiredTempMax}°C
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Giới hạn số lượng xe tối đa:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={neededTrucks}
                  onChange={(e) => setNeededTrucks(Number(e.target.value))}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAggregate}
                disabled={calculating || !selectedShipmentId}
              >
                {calculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tối
                    ưu hóa...
                  </>
                ) : (
                  "Tự động gom xe tối ưu"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* HIỂN THỊ KẾT QUẢ ĐỘI XE GOM */}
          <Card>
            <CardHeader>
              <CardTitle>Kết quả Aggregation từ FreshChain AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!aggregationResult ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-card">
                  Vui lòng chọn đơn hàng bên trái và nhấn nút để chạy thuật toán
                  phân tích gom xe từ hệ thống.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border p-4 bg-background">
                      <p className="text-sm text-muted-foreground">
                        Số xe huy động
                      </p>
                      <b className="text-2xl text-sky-600">
                        {aggregationResult.trucksUsed?.length || 0} xe
                      </b>
                    </div>
                    <div className="rounded-md border p-4 bg-background">
                      <p className="text-sm text-muted-foreground">
                        Tổng tải trọng gom được
                      </p>
                      <b className="text-2xl text-emerald-600">
                        {aggregationResult.totalCapacityKg?.toLocaleString() ||
                          0}{" "}
                        kg
                      </b>
                    </div>
                    <div className="rounded-md border p-4 bg-background">
                      <p className="text-sm text-muted-foreground">
                        Ước tính chi phí chặng
                      </p>
                      <b className="text-2xl">
                        {vnd(
                          aggregationResult.estimatedCost ||
                            currentShipment?.proposedPrice ||
                            0,
                        )}
                      </b>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Chi tiết đội xe được chỉ định gom:
                    </p>
                    {aggregationResult.trucksUsed?.map((truck: any) => (
                      <div
                        key={truck.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between bg-card hover:shadow-sm transition-shadow"
                      >
                        <div>
                          <b className="text-base text-foreground">
                            {truck.plateNumber}
                          </b>
                          <p className="text-sm text-muted-foreground mt-1">
                            Loại xe: {truck.type} | Dung tích trống:{" "}
                            <span className="font-semibold text-foreground">
                              {truck.remainingKg?.toLocaleString()} kg
                            </span>{" "}
                            | Dự kiến đến (ETA):{" "}
                            {new Date(truck.eta).toLocaleTimeString("vi-VN")}
                          </p>
                        </div>
                        <Badge tone="green" className="w-fit">
                          <CheckCircle2 size={12} className="mr-1" /> Thỏa điều
                          kiện lanh
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {aggregationResult.recommendationNote && (
                    <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                      💡 <b>Khuyến nghị tối ưu:</b>{" "}
                      {aggregationResult.recommendationNote}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
