"use client";

import React, { useEffect, useState, useCallback } from "react";
import { negotiationApi } from "@/lib/api";
import { useUser } from "@/contexts/user-context";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  ShieldCheck,
  Truck,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Loader2,
  ArrowRight,
  Package,
  Phone,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NegotiationRound {
  id: string;
  roundNumber: number;
  proposedPrice: number;
  respondedPrice: number | null;
  status: string;
  responseMessage?: string;
  message?: string;
  createdAt: string;
  respondedAt?: string;
}

interface SignedDeal {
  id: string;
  status: string;
  finalPrice: number;
  createdAt: string;
  updatedAt: string;
  shipment: {
    id: string;
    cargoType: string;
    weightKg: number;
    pickup: string;
    dropoff: string;
    proposedPrice: number;
    owner: {
      id: string;
      name: string;
      phoneNumber?: string;
    } | null;
  };
  truck: {
    id: string;
    plateNumber: string;
    type: string;
    owner: {
      id: string;
      name: string;
      phoneNumber?: string;
    } | null;
  } | null;
  negotiationRounds: NegotiationRound[];
  latestRound: NegotiationRound | null;
  deal_initiator: any;
}

interface ApiResponse {
  success: boolean;
  count: number;
  total: number;
  deals: SignedDeal[];
}

export default function SignedDealsPage() {
  return (
    <DashboardShell>
      <SignedDealsContent />
    </DashboardShell>
  );
}

function SignedDealsContent() {
  const { user, loading: userLoading } = useUser();
  const [deals, setDeals] = useState<SignedDeal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch danh sách hợp đồng đã ký kết thành công
   */
  const fetchSignedDeals = useCallback(async () => {
    try {
      setError(null);

      // 🔍 DEBUG: Ensure token exists
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        throw new Error("❌ Token không tồn tại! Hãy login trước.");
      }
      console.log(`[SignedDeals] Token found: ${token.substring(0, 20)}...`);

      const response = (await negotiationApi.getSignedDeals(
        20,
        0,
      )) as ApiResponse;

      if (response.success && response.deals) {
        setDeals(response.deals);
      } else {
        throw new Error("Không thể tải dữ liệu hợp đồng");
      }
    } catch (err: any) {
      console.error("Lỗi fetch signed deals:", err);
      setError(
        err.message || "Đã xảy ra lỗi khi tải danh sách hợp đồng ký kết.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh data - bấm lại từ UI
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSignedDeals();
    setIsRefreshing(false);
  };

  // Load data trên mount
  useEffect(() => {
    if (!userLoading) {
      fetchSignedDeals();
    }
  }, [fetchSignedDeals, userLoading]);

  /**
   * Định dạng hiển thị tiền tệ VNĐ
   * VD: 1500000 → "1.500.000 ₫"
   */
  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Định dạng ngày tháng
   */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============ RENDER STATES ============

  // 1. Trạng thái Loading
  if (loading || userLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-muted-foreground font-medium animate-pulse">
          Đang tải danh sách hợp đồng ký kết...
        </p>
      </div>
    );
  }

  // 2. Trạng thái Error
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-green-600" />
            Hợp Đồng Đã Ký Kết Thành Công
          </h1>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Lỗi tải dữ liệu
            </CardTitle>
            <CardDescription className="text-red-600 mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Trạng thái Empty (Chưa có hợp đồng nào)
  if (deals.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-green-600" />
            Hợp Đồng Đã Ký Kết Thành Công
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý toàn bộ các chuyến vận chuyển đã hoàn tất thương lượng giá
            cả.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-xl min-h-[350px] bg-muted/10">
          <div className="p-4 bg-blue-100 rounded-full mb-4">
            <Package className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-slate-900">
            Chưa có hợp đồng nào được ký kết
          </h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Các giao dịch được hoàn thành (cả hai bên chấp nhận giá) sẽ hiển thị
            toàn bộ tại đây.
          </p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Làm mới
          </Button>
        </div>
      </div>
    );
  }

  // 4. Render Danh Sách Hợp Đồng Ký Kết Thành Công
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-green-600" />
            Hợp Đồng Đã Ký Kết Thành Công
          </h1>
          <p className="text-muted-foreground mt-1">
            Tổng cộng:{" "}
            <span className="font-semibold text-slate-900">{deals.length}</span>{" "}
            hợp đồng
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={isRefreshing}
          size="sm"
          className="gap-2"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Làm mới
        </Button>
      </div>

      {/* Grid Card Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {deals.map((deal) => {
          const isCarrier = user?.role === "CARRIER";
          const isShipper = user?.role === "SHIPPER";
          const isAdmin = user?.role === "ADMIN";

          return (
            <Card
              key={deal.id}
              className="overflow-hidden border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {/* ===== Card Header ===== */}
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground bg-slate-200 px-2 py-0.5 rounded font-medium">
                      #{deal.id.substring(0, 8).toUpperCase()}
                    </span>
                    <Badge className="bg-green-100 text-green-700 font-semibold border border-green-200">
                      ✓ ĐÃ KÝ KẾT
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap ml-2">
                    <Calendar className="h-3 w-3" />
                    {formatDate(deal.updatedAt)}
                  </span>
                </div>

                {/* Tiêu đề động theo Role */}
                <CardTitle className="text-base mt-3 font-semibold">
                  {isCarrier && (
                    <span className="text-blue-700 flex items-center gap-1.5">
                      <Truck className="h-4 w-4 flex-shrink-0" />
                      Xe của bạn đã nhận chở đơn hàng
                    </span>
                  )}
                  {isShipper && (
                    <span className="text-orange-700 flex items-center gap-1.5">
                      <Package className="h-4 w-4 flex-shrink-0" />
                      Đơn hàng của bạn đã được vận chuyển
                    </span>
                  )}
                  {isAdmin && (
                    <span className="text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                      Liên kết thành công
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              {/* ===== Card Content ===== */}
              <CardContent className="pt-4 space-y-4">
                {/* Route Info */}
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg text-sm font-medium border border-blue-100">
                  <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                    <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="truncate">{deal.shipment?.pickup}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mx-1 animate-pulse" />
                  <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                    <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">{deal.shipment?.dropoff}</span>
                  </div>
                </div>

                {/* Two-Column Info Grid */}
                <div className="grid grid-cols-2 gap-4 pt-1 text-sm border-b pb-4">
                  {/* Left Column: Shipment Info */}
                  <div className="space-y-3 border-r pr-3">
                    <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      📦 Thông tin hàng hóa
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Loại hàng:
                      </div>
                      <div className="font-medium text-slate-900 text-sm">
                        {deal.shipment?.cargoType || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">
                        Khối lượng:
                      </div>
                      <div className="font-medium text-slate-900 text-sm">
                        {deal.shipment?.weightKg || 0} kg
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="text-xs text-muted-foreground mb-1">
                        Chủ hàng:
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-slate-900 text-xs truncate">
                          {deal.shipment?.owner?.name || "N/A"}
                        </span>
                      </div>
                      {deal.shipment?.owner?.phoneNumber && (
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-blue-600 font-medium">
                            {deal.shipment.owner.phoneNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Truck Info */}
                  <div className="space-y-3 pl-3">
                    <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      🚚 Thông tin vận chuyển
                    </div>

                    {deal.truck ? (
                      <>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Biển số xe:
                          </div>
                          <div className="font-bold text-blue-600 text-sm tracking-wide">
                            {deal.truck.plateNumber}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">
                            Loại xe:
                          </div>
                          <div className="font-medium text-slate-900 text-sm">
                            {deal.truck.type || "—"}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="text-xs text-muted-foreground mb-1">
                            Chủ xe:
                          </div>
                          <div className="flex items-center gap-1">
                            <Truck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-slate-900 text-xs truncate">
                              {deal.truck.owner?.name || "N/A"}
                            </span>
                          </div>
                          {deal.truck.owner?.phoneNumber && (
                            <div className="flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-blue-600 font-medium">
                                {deal.truck.owner.phoneNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-xs italic text-center py-8 text-slate-500">
                        ⚠️ Chưa chỉ định xe cụ thể
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Price Section - Bottom */}
                <div className="flex items-center justify-between pt-2 px-2 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="text-xs text-muted-foreground font-medium">
                    Giá chốt cuối cùng:
                  </div>
                  <div className="text-lg font-bold text-green-600 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatVND(deal.finalPrice || 0)}</span>
                  </div>
                </div>

                {/* Additional Metadata (optional) */}
                {deal.latestRound && (
                  <div className="text-xs text-muted-foreground pt-1 px-1 pb-0">
                    <div>
                      Vòng đàm phán:{" "}
                      <span className="font-semibold text-slate-700">
                        #{deal.latestRound.roundNumber}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
