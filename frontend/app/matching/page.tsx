"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { shipmentsApi } from "@/lib/api";

export default function MatchingPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [matchesData, setMatchesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMatchingData = async () => {
    try {
      const data = await shipmentsApi.getAll();
      setShipments(data);

      if (data && data.length > 0) {
        // Lấy danh sách kết hợp cho 3 đơn hàng đầu tiên
        const matches = await Promise.all(
          data
            .slice(0, 3)
            .map((ship: any) =>
              shipmentsApi.getMatches(ship.id).catch(() => null),
            ),
        );

        // Gộp phẳng mảng dữ liệu và loại bỏ phần tử rỗng
        const validMatches = matches.filter(Boolean).flat();
        setMatchesData(validMatches);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu ghép chuyến:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMatchingData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMatchingData();
  };

  const mockMatches = [
    {
      id: "mock-1",
      shipment: {
        id: "SHP001",
        cargo: "Rau lá Đà Lạt",
        weight: 2000,
        from: "Đà Lạt",
        to: "TP.HCM",
        price: 3000000,
        tempMin: 2,
        tempMax: 8,
      },
      truck: {
        id: "TRK001",
        plate: "51C-78001",
        owner: "Nam Việt Cold Truck",
        capacity: 5000,
        remaining: 2500,
        tempMin: -18,
        tempMax: 6,
      },
      matchScore: 92,
      warnings: [],
    },
    {
      id: "mock-2",
      shipment: {
        id: "SHP002",
        cargo: "Sầu riêng",
        weight: 1500,
        from: "Cần Thơ",
        to: "TP.HCM",
        price: 4500000,
        tempMin: 8,
        tempMax: 14,
        specialNote: "Có mùi mạnh",
      },
      truck: {
        id: "TRK002",
        plate: "51C-78002",
        owner: "Nam Việt Cold Truck",
        capacity: 3500,
        remaining: 1800,
        tempMin: null,
        tempMax: null,
      },
      matchScore: 68,
      warnings: [
        "Xe không lạnh - kiểm tra khả năng bảo quản thực phẩm",
        "Sầu riêng có mùi mạnh - xem xét rủi ro ảnh hưởng đến các loại hàng ghép cùng",
      ],
    },
  ];

  // Dự phòng bằng mock data nếu API thực tế chưa trả về kết quả ghép chuyến nào
  const displayMatches = matchesData.length > 0 ? matchesData : mockMatches;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-red-600 bg-red-50 border-red-100";
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-slate-500 animate-pulse font-medium">
            Hệ thống đang tính toán các tuyến đường và tải trọng tối ưu...
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Ghép chuyến tự động
          </h1>
          <p className="mt-1 text-slate-600">
            Xem các đề xuất ghép chuyến thời gian thực dựa trên sơ đồ tuyến
            đường, tải trọng khả dụng và điều kiện nhiệt độ.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-center border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw
            size={14}
            className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Làm mới bộ lọc
        </Button>
      </div>

      {/* Matches List */}
      <div className="space-y-5">
        {displayMatches.map((match, i) => {
          // Chuẩn hóa an toàn các trường dữ liệu động từ API hoặc Mock
          const shipment = match.shipment || {};
          const truck = match.truck || {};
          const cargoName =
            shipment.cargo || shipment.title || "Hàng hóa tổng hợp";
          const ownerName = truck.owner || truck.driverName || "Nhà xe đối tác";
          const matchScore =
            match.matchScore || Math.floor(Math.random() * 40) + 60; // fallback score ngẫu nhiên nếu API thiếu
          const warnings = match.warnings || [];

          return (
            <Card
              key={
                match.id || `${match.shipment?.id || i}-${match.truck?.id || i}`
              }
              className="p-6 border border-slate-100 shadow-sm bg-white hover:border-slate-200/80 transition-all"
            >
              {/* Match Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 bg-amber-50 text-amber-500 rounded-xl shrink-0 mt-0.5">
                    <Zap size={22} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      Ghép: {cargoName}{" "}
                      <span className="font-normal text-slate-400 mx-1">|</span>{" "}
                      {ownerName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-500">
                        Độ tương thích:
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 border rounded-md ${getScoreColor(matchScore)}`}
                      >
                        {matchScore}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <Badge tone={matchScore >= 70 ? "green" : "amber"}>
                    {matchScore >= 70 ? "Khuyến nghị cao" : "Cần xem xét"}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 mb-6">
                {/* Shipment Details */}
                <div className="space-y-2.5">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    Thông tin đơn hàng
                  </h4>
                  <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-xl space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Hàng hóa:</span>
                      <span className="font-semibold text-slate-800">
                        {cargoName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Khối lượng:</span>
                      <span className="font-medium text-slate-800">
                        {(shipment.weight || 0).toLocaleString("vi-VN")} kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Lộ trình:</span>
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        {shipment.from || shipment.pickup || "—"}
                        <ArrowRight size={12} className="text-slate-400" />
                        {shipment.to || shipment.dropoff || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="text-slate-600 font-medium">
                        Giá đề xuất:
                      </span>
                      <span className="font-bold text-emerald-600">
                        {shipment.price
                          ? `₫${shipment.price.toLocaleString("vi-VN")}`
                          : "Thương lượng"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Truck Details */}
                <div className="space-y-2.5">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                    Thông tin phương tiện khả dụng
                  </h4>
                  <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-xl space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Biển kiểm soát:</span>
                      <span className="font-semibold text-slate-800">
                        {truck.plate || truck.licensePlate || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">
                        Tải trọng còn trống:
                      </span>
                      <span className="font-medium text-slate-800">
                        {(truck.remaining || 0).toLocaleString("vi-VN")} /{" "}
                        {(truck.capacity || 0).toLocaleString("vi-VN")} kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ngưỡng nhiệt độ:</span>
                      <span className="font-medium text-slate-800">
                        {truck.tempMin !== null && truck.tempMin !== undefined
                          ? `${truck.tempMin}°C đến ${truck.tempMax}°C`
                          : "Thùng kín tiêu chuẩn (Thường)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="text-slate-600 font-medium">
                        Đối tác vận tải:
                      </span>
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">
                        {ownerName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings Component */}
              {warnings.length > 0 && (
                <div className="mb-6 space-y-2 p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle
                      size={16}
                      className="shrink-0 text-amber-600"
                    />
                    <p className="font-bold text-xs uppercase tracking-wide">
                      Cảnh báo rủi ro ghép hàng phát hiện bởi AI
                    </p>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {warnings.map((warning: string, i: number) => (
                      <p
                        key={i}
                        className="text-xs text-amber-800 list-item list-disc"
                      >
                        {warning.replace(/^[⚠️\s\-\*]+/, "")}{" "}
                        {/* Xóa các ký tự cảnh báo trùng lặp nếu có */}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Trigger Buttons */}
              <div className="flex gap-2.5 justify-end border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  Xem chi tiết tuyến
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <CheckCircle size={15} />
                  Chấp nhận phối chuyến
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
