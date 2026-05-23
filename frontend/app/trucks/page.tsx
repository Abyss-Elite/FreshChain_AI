"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  Plus,
  Edit2,
  MoreVertical,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { trucksApi } from "@/lib/api";

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trucksApi
      .getAll()
      .then(setTrucks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const mockTrucks = [
    {
      id: "1",
      plate: "51C-78001",
      type: "Xe lạnh 5 tấn",
      owner: "Nam Việt Cold Truck",
      capacity: 5000,
      remaining: 2500,
      tempMin: -18,
      tempMax: -5,
      currentRoute: "Đà Lạt → TP.HCM",
      status: "active",
    },
    {
      id: "2",
      plate: "51C-78002",
      type: "Xe tải thùng kín",
      owner: "Nam Việt Cold Truck",
      capacity: 3500,
      remaining: 1800,
      tempMin: null,
      tempMax: null,
      currentRoute: "Cần Thơ → TP.HCM",
      status: "active",
    },
    {
      id: "3",
      plate: "51C-78003",
      type: "Xe lạnh 5 tấn",
      owner: "Nam Việt Cold Truck",
      capacity: 5000,
      remaining: 5000,
      tempMin: -22,
      tempMax: -12,
      currentRoute: "Chờ đơn",
      status: "idle",
    },
  ];

  const handleDelete = (id: string, plate: string) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa xe ${plate} khỏi hệ thống?`,
    );
    if (confirmDelete) {
      console.log(`Đang xóa xe có ID: ${id}`);
      // Gọi API xóa ở đây: trucksApi.delete(id)...
    }
  };

  if (loading)
    return (
      <DashboardShell>
        <div className="flex items-center gap-2 text-slate-500 py-10">
          <Loader2 className="animate-spin h-5 w-5 text-emerald-500" />
          <span>Đang tải dữ liệu đội xe lạnh...</span>
        </div>
      </DashboardShell>
    );

  const displayTrucks = trucks.length > 0 ? trucks : mockTrucks;

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Quản lý xe
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Danh sách xe còn tải trống và trạng thái vận hành trong chuỗi cung
            ứng
          </p>
        </div>
        <Link href="/trucks/register">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus size={18} />
            Thêm xe mới
          </Button>
        </Link>
      </div>

      {/* Trucks List */}
      <div className="space-y-4">
        {displayTrucks.map((truck) => {
          const currentPlate = truck.plateNumber || truck.plate;
          const currentOwner = truck.owner?.name || truck.owner;
          const maxCap = truck.maxCapacityKg || truck.capacity || 1;
          const remCap = truck.remainingKg || truck.remaining;

          const usedWeight = maxCap - remCap;
          const usedPercentage = Math.min(
            Math.max((usedWeight / maxCap) * 100, 0),
            100,
          );

          return (
            <Card
              key={truck.id}
              className="p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all bg-white rounded-xl"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                {/* Truck Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck size={18} className="text-emerald-500" />
                    <p className="font-bold text-slate-900">{currentPlate}</p>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">
                    {truck.type}
                  </p>
                  <p className="text-xs text-slate-400">{currentOwner}</p>
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tải trống / Tổng tải
                  </p>
                  <p className="font-bold text-slate-900 text-sm">
                    {remCap.toLocaleString()} / {maxCap.toLocaleString()} kg
                  </p>
                  <div
                    className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
                    title={`Đã xếp hàng: ${usedPercentage.toFixed(0)}%`}
                  >
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${usedPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Đã dùng {usedPercentage.toFixed(0)}% công suất
                  </p>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Nhiệt độ bảo quản
                  </p>
                  {truck.tempMin !== null && truck.tempMin !== undefined ? (
                    <p className="font-bold text-slate-900 text-sm">
                      {truck.tempMin}°C ~ {truck.tempMax}°C
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-slate-400">
                      Không yêu cầu lạnh
                    </p>
                  )}
                </div>

                {/* Route */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tuyến đường hiện tại
                  </p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {truck.currentRoute || "Chưa xếp tuyến"}
                  </p>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end justify-between min-h-[80px]">
                  <Badge tone={truck.status === "active" ? "green" : "slate"}>
                    {truck.status === "active" ? "Hoạt động" : "Chờ đơn"}
                  </Badge>

                  {/* Cụm Action Đã Được Sửa Đổi */}
                  <div className="flex gap-1">
                    {/* CÁCH 1: Nút Edit được bọc Link điều hướng chính xác theo truck.id */}
                    <Link href={`/trucks/${truck.id}/edit`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        title="Chỉnh sửa xe"
                      >
                        <Edit2 size={15} />
                      </Button>
                    </Link>

                    {/* CÁCH 2: Dấu 3 chấm được chuyển thành Dropdown Menu hoàn chỉnh */}
                    {/* Dấu 3 chấm được chuyển thành Dropdown Menu hoàn chỉnh */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        >
                          <MoreVertical size={15} />
                        </Button>
                      </DropdownMenuTrigger>

                      {/* Thêm Portal bọc ngoài để giải phóng menu ra khỏi cấu trúc Card */}
                      <DropdownMenuPortal>
                        <DropdownMenuContent
                          align="end"
                          // Thêm class z-50 vào đây để đảm bảo tuyệt đối nổi lên trên
                          className="w-48 rounded-xl shadow-md border-slate-200 bg-white z-50"
                        >
                          <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-3 py-1.5">
                            Tùy chọn xe {currentPlate}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-slate-700 cursor-pointer text-sm focus:bg-slate-50">
                            <Eye size={14} />
                            Xem chi tiết hành trình
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-slate-700 cursor-pointer text-sm focus:bg-slate-50">
                            <RefreshCw size={14} />
                            Cập nhật trạng thái tải
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 font-medium cursor-pointer text-sm"
                            onClick={() => handleDelete(truck.id, currentPlate)}
                          >
                            <Trash2 size={14} />
                            Xóa xe khỏi hệ thống
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
