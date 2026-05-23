"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  AlertTriangle,
  MapPin,
  Snowflake,
  Truck,
  Clock,
  Navigation,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrackingPage() {
  const [temp, setTemp] = useState<number>(2.8);
  const [eta, setEta] = useState<number>(126);

  // 1. Giả lập dữ liệu thời gian thực (Fallback phòng khi không có Socket server)
  useEffect(() => {
    const timer = setInterval(() => {
      setTemp((prev) => {
        // Biến thiên nhẹ quanh mức nhiệt cũ thay vì nhảy ngẫu nhiên quá rộng
        const change = -0.5 + Math.random();
        return Number(Math.min(6, Math.max(-2, prev + change)).toFixed(1));
      });
      setEta((value) => Math.max(98, value - 1));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // 2. Kết nối Socket.io tích hợp cơ chế đóng kết nối an toàn
  useEffect(() => {
    let socket: Socket | null = null;

    try {
      const socketUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      socket = io(socketUrl, {
        transports: ["websocket"],
        autoConnect: true,
        reconnectionAttempts: 5,
      });

      socket.on(
        "tracking:update",
        (event: { temperature: number; etaMinutes: number }) => {
          if (typeof event.temperature === "number") setTemp(event.temperature);
          if (typeof event.etaMinutes === "number") setEta(event.etaMinutes);
        },
      );

      socket.on("connect_error", (err) => {
        console.warn(
          "Socket connection failed, falling back to simulation:",
          err.message,
        );
      });
    } catch (error) {
      console.error("Socket initialization error:", error);
    }

    return () => {
      if (socket) {
        socket.off("tracking:update");
        socket.disconnect();
      }
    };
  }, []);

  // Ngưỡng cảnh báo nhiệt độ an toàn cho chuỗi cung ứng lạnh (Thường là > 4.0°C)
  const isOverheated = temp > 4.0;

  return (
    <AppShell
      title="Bản đồ định vị & Giám sát hành trình"
      subtitle="Hệ thống cập nhật thời gian thực tọa độ GPS, biên độ nhiệt thùng xe và cảnh báo rủi ro chuỗi cung ứng."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Khối giao diện Bản đồ đồ họa */}
        <Card className="overflow-hidden border-slate-100 shadow-sm bg-slate-50">
          <div className="h-[580px] bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(14,165,233,0.08))] p-6 relative select-none">
            <div className="relative h-full rounded-xl border border-slate-200/60 bg-white/60 backdrop-blur-sm shadow-inner overflow-hidden">
              {/* Điểm nhận hàng - Đà Lạt */}
              <div className="absolute left-[15%] top-[20%] flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100">
                <MapPin
                  className="text-emerald-500 fill-emerald-50"
                  size={18}
                />
                <span className="text-sm font-semibold text-slate-700">
                  Đà Lạt
                </span>
              </div>

              {/* Tuyến đường nét đứt mô phỏng */}
              <div className="absolute left-[20%] top-[26%] h-[50%] w-[62%] rounded-br-[120px] border-b-4 border-r-4 border-dashed border-slate-300/80" />

              {/* Icon Xe tải đang di chuyển theo chặng */}
              <div className="absolute left-[48%] top-[50%] grid h-14 w-14 place-items-center rounded-xl bg-white text-emerald-600 shadow-lg border border-slate-100 animate-pulse">
                <Truck size={26} />
              </div>

              {/* Điểm giao hàng - TP.HCM */}
              <div className="absolute bottom-[20%] right-[15%] flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100">
                <span className="text-sm font-semibold text-slate-700">
                  TP. Hồ Chí Minh
                </span>
                <MapPin className="text-sky-500 fill-sky-50" size={18} />
              </div>
            </div>
          </div>
        </Card>

        {/* Khối thông tin chi tiết trạng thái vận chuyển */}
        <div className="space-y-4">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Thiết bị: 51C-780.01
                </CardTitle>
                <Badge
                  tone={isOverheated ? "red" : "blue"}
                  className="animate-pulse"
                >
                  {isOverheated ? "Cảnh báo" : "Đang vận chuyển"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Nhiệt độ hiện tại */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4 bg-white shadow-sm">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Snowflake
                    size={18}
                    className={
                      isOverheated
                        ? "text-red-500 animate-spin"
                        : "text-sky-500"
                    }
                  />
                  Nhiệt độ thùng lạnh
                </span>
                <span
                  className={`text-lg font-bold ${isOverheated ? "text-red-600" : "text-emerald-600"}`}
                >
                  {temp} °C
                </span>
              </div>

              {/* Thời gian dự kiến đến nơi */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4 bg-white shadow-sm">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Clock size={18} className="text-slate-400" />
                  Thời gian dự kiến (ETA)
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {eta} phút
                </span>
              </div>

              {/* Lộ trình tuyến đường */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4 bg-white shadow-sm">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Navigation size={18} className="text-slate-400" />
                  Tuyến đường chính
                </span>
                <span className="text-sm font-bold text-slate-800">
                  QL20 → Cao tốc hành trình
                </span>
              </div>

              {/* Box hiển thị trạng thái Alert */}
              {isOverheated ? (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3.5 text-sm text-red-700">
                  <AlertTriangle
                    className="text-red-500 shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <p className="font-semibold">
                      Nhiệt độ vượt ngưỡng an toàn!
                    </p>
                    <p className="text-xs text-red-600/90 mt-0.5">
                      Hệ thống đang tự động gửi tín hiệu nhắc nhở tài xế kiểm
                      tra lại máy lạnh.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-sm text-emerald-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-ping" />
                  <div>
                    <p className="font-semibold">
                      Nhiệt độ chuỗi cung ứng ổn định
                    </p>
                    <p className="text-xs text-emerald-600/90 mt-0.5">
                      Hàng hóa nông sản được bảo quản đúng tiêu chuẩn kỹ thuật.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
