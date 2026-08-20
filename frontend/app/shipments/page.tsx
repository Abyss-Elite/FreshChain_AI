"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Edit2, Loader2, Package, Plus, Search, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { shipmentsApi } from "@/lib/api";
import { normalizeSearchText, onlyDigits, vnd } from "@/lib/utils";
import { vietnamLogisticsLocations } from "@/lib/vietnam-locations";

const PAGE_SIZE = 6;

type ShipmentForm = {
  cargoType: string;
  category: string;
  weightKg: string;
  requiredTempMin: string;
  requiredTempMax: string;
  pickup: string;
  dropoff: string;
  deliveryTime: string;
  proposedPrice: string;
  notes: string;
  fragile: boolean;
  strongSmell: boolean;
  frozenRequired: boolean;
  allowCombine: boolean;
};

const emptyForm: ShipmentForm = {
  cargoType: "",
  category: "Thực phẩm tươi sống",
  weightKg: "",
  requiredTempMin: "0",
  requiredTempMax: "8",
  pickup: "",
  dropoff: "",
  deliveryTime: "",
  proposedPrice: "",
  notes: "",
  fragile: false,
  strongSmell: false,
  frozenRequired: false,
  allowCombine: true,
};

const statusLabel: Record<
  string,
  { label: string; tone: "blue" | "green" | "amber" | "red" | "slate" }
> = {
  PENDING: { label: "Chờ xử lý", tone: "slate" },
  MATCHING: { label: "Đang ghép xe", tone: "blue" },
  NEGOTIATING: { label: "Đang thương lượng", tone: "amber" },
  IN_TRANSIT: { label: "Đang vận chuyển", tone: "green" },
  DELIVERED: { label: "Đã giao", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

function toLocalInput(date?: string) {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function ShipmentsPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            Đang tải dữ liệu đơn hàng...
          </div>
        </DashboardShell>
      }
    >
      <ShipmentsContent />
    </Suspense>
  );
}

function ShipmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<ShipmentForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [page, setPage] = useState(1);

  const loadShipments = async () => {
    try {
      setLoading(true);
      setShipments(await shipmentsApi.getAll());
    } catch (error: any) {
      toast.error(error.message || "Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const filteredShipments = useMemo(() => {
    const query = normalizeSearchText(search.trim());
    return shipments.filter((shipment) => {
      const matchesQuery =
        !query ||
        normalizeSearchText(shipment.cargoType).includes(query) ||
        normalizeSearchText(shipment.pickup).includes(query) ||
        normalizeSearchText(shipment.dropoff).includes(query);
      const matchesStatus =
        statusFilter === "all" || shipment.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [shipments, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / PAGE_SIZE));
  const paginatedShipments = filteredShipments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (shipment: any) => {
    setEditing(shipment);
    setForm({
      cargoType: shipment.cargoType || "",
      category: shipment.category || "Thực phẩm tươi sống",
      weightKg: String(shipment.weightKg || ""),
      requiredTempMin: String(shipment.requiredTempMin ?? "0"),
      requiredTempMax: String(shipment.requiredTempMax ?? "8"),
      pickup: shipment.pickup || "",
      dropoff: shipment.dropoff || "",
      deliveryTime: toLocalInput(shipment.deliveryTime),
      proposedPrice: String(shipment.proposedPrice || ""),
      notes: shipment.notes || "",
      fragile: Boolean(shipment.fragile),
      strongSmell: Boolean(shipment.strongSmell),
      frozenRequired: Boolean(shipment.frozenRequired),
      allowCombine: shipment.allowCombine !== false,
    });
    setSheetOpen(true);
  };

  const validationError = useMemo(() => {
    if (form.cargoType.trim().length < 2) return "Tên hàng hóa quá ngắn";
    if (Number(form.weightKg) <= 0) return "Khối lượng đơn hàng phải lớn hơn 0";
    if (!form.pickup || !form.dropoff)
      return "Vui lòng chọn điểm đi và điểm đến";
    if (form.pickup === form.dropoff)
      return "Điểm đi và điểm đến phải khác nhau";
    if (Number(form.proposedPrice) <= 0) return "Giá đề xuất phải là số dương";
    if (Number(form.requiredTempMin) > Number(form.requiredTempMax))
      return "Nhiệt độ tối thiểu không được lớn hơn tối đa";
    return "";
  }, [form]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) return toast.error(validationError);

    const payload = {
      cargoType: form.cargoType.trim(),
      category: form.category.trim() || "Hàng tổng hợp",
      weightKg: Number(form.weightKg),
      requiredTempMin: Number(form.requiredTempMin),
      requiredTempMax: Number(form.requiredTempMax),
      pickup: form.pickup,
      dropoff: form.dropoff,
      pickupLat: 11.94,
      pickupLng: 108.45,
      dropoffLat: 10.82,
      dropoffLng: 106.63,
      deliveryTime: form.deliveryTime
        ? new Date(form.deliveryTime).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      proposedPrice: Number(form.proposedPrice),
      notes: form.notes.trim() || undefined,
      fragile: form.fragile,
      strongSmell: form.strongSmell,
      frozenRequired: form.frozenRequired,
      specialTemperature: true,
      allowCombine: form.allowCombine,
    };

    try {
      setBusy(true);
      const saved = editing
        ? await shipmentsApi.update(editing.id, payload)
        : await shipmentsApi.create(payload);
      setShipments((prev) =>
        editing
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev],
      );
      toast.success(editing ? "Đã cập nhật đơn hàng" : "Đã tạo đơn hàng");
      setSheetOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Không lưu được đơn hàng");
    } finally {
      setBusy(false);
    }
  };

  const removeShipment = async () => {
    if (!deleteTarget) return;
    try {
      setBusy(true);
      await shipmentsApi.delete(deleteTarget.id);
      setShipments((prev) =>
        prev.filter((item) => item.id !== deleteTarget.id),
      );
      toast.success("Đã xóa đơn hàng");
      setDeleteTarget(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Không xóa được đơn hàng");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Khu vực Chủ doanh nghiệp / Chủ hàng
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
          Nguồn hàng cần vận chuyển
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Quản lý đơn hàng, tuyến vận chuyển, nhiệt độ bảo quản và ngân sách
          ghép xe.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm loại hàng, điểm đi, điểm đến..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(statusLabel).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={openCreate}
        >
          <Plus size={16} />
          Tạo đơn
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Đang tải đơn hàng...
        </div>
      ) : shipments.length === 0 ? (
        <Card className="border border-dashed border-slate-300 bg-white p-8 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="font-semibold text-slate-900">Chưa có đơn hàng</p>
          <Button
            className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={openCreate}
          >
            Tạo đơn đầu tiên
          </Button>
        </Card>
      ) : filteredShipments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedShipments.map((shipment) => {
            const status = statusLabel[shipment.status] || {
              label: shipment.status,
              tone: "slate" as const,
            };
            return (
              <Card
                key={shipment.id}
                className="overflow-hidden border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Package
                        size={17}
                        className="shrink-0 text-emerald-600"
                      />
                      <h2
                        className="truncate text-base font-bold text-slate-900"
                        title={shipment.cargoType}
                      >
                        {shipment.cargoType}
                      </h2>
                    </div>
                    <p
                      className="mt-1 truncate text-sm text-slate-500"
                      title={`${shipment.pickup} -> ${shipment.dropoff}`}
                    >
                      {shipment.pickup} -&gt; {shipment.dropoff}
                    </p>
                  </div>
                  <Badge tone={status.tone} className="shrink-0">
                    {status.label}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      Khối lượng
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-bold text-slate-900"
                      title={`${shipment.weightKg} kg`}
                    >
                      {(shipment.weightKg || 0).toLocaleString("vi-VN")} kg
                    </p>
                    <p
                      className="mt-2 truncate text-xs text-slate-500"
                      title={`${shipment.requiredTempMin}°C đến ${shipment.requiredTempMax}°C`}
                    >
                      {shipment.requiredTempMin}°C đến{" "}
                      {shipment.requiredTempMax}°C
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      Lộ trình
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-bold text-slate-900"
                      title={shipment.pickup}
                    >
                      {shipment.pickup}
                    </p>
                    <p
                      className="mt-2 truncate text-xs text-slate-500"
                      title={shipment.dropoff}
                    >
                      {shipment.dropoff}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span
                    className="truncate font-semibold text-emerald-700"
                    title={vnd(shipment.proposedPrice)}
                  >
                    {vnd(shipment.proposedPrice)}
                  </span>
                  <span
                    className="truncate text-xs text-slate-500"
                    title={shipment.notes || "Không ghi chú"}
                  >
                    {shipment.notes || "Không ghi chú"}
                  </span>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(shipment)}
                  >
                    <Edit2 size={14} />
                    Sửa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => setDeleteTarget(shipment)}
                  >
                    <Trash2 size={14} />
                    Xóa
                  </Button>
                </div>
              </Card>
            );
          })}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredShipments.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Chỉnh sửa đơn hàng" : "Tạo đơn hàng"}
            </SheetTitle>
            <SheetDescription>
              Nhập thông tin vận chuyển để hệ thống tự động ghép xe phù hợp.
            </SheetDescription>
          </SheetHeader>

          <form
            id="shipment-form"
            onSubmit={submit}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {/* Tên hàng hóa */}
            <div className="space-y-2">
              <Label>Tên hàng hóa *</Label>
              <Input
                value={form.cargoType}
                onChange={(e) =>
                  setForm({ ...form, cargoType: e.target.value })
                }
                placeholder="Rau Đà Lạt"
              />
            </div>

            {/* Nhóm hàng */}
            <div className="space-y-2">
              <Label>Nhóm hàng</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            {/* Khối lượng */}
            <div className="space-y-2">
              <Label>Khối lượng (kg) *</Label>
              <Input
                inputMode="numeric"
                value={form.weightKg}
                onChange={(e) =>
                  setForm({ ...form, weightKg: onlyDigits(e.target.value) })
                }
                placeholder="1000"
              />
            </div>

            {/* Nhiệt độ */}
            <div className="space-y-2">
              <Label>Yêu cầu nhiệt độ</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">
                    Tối thiểu (°C)
                  </Label>
                  <Input
                    type="number"
                    value={form.requiredTempMin}
                    onChange={(e) =>
                      setForm({ ...form, requiredTempMin: e.target.value })
                    }
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Tối đa (°C)</Label>
                  <Input
                    type="number"
                    value={form.requiredTempMax}
                    onChange={(e) =>
                      setForm({ ...form, requiredTempMax: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Điểm đi */}
            <div className="space-y-2 relative z-50">
              <Label>Điểm đi *</Label>
              <Select
                value={form.pickup}
                onValueChange={(value) => setForm({ ...form, pickup: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn tỉnh/thành phố" />
                </SelectTrigger>
                <SelectContent>
                  {vietnamLogisticsLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Điểm đến */}
            <div className="space-y-2 relative z-50">
              <Label>Điểm đến *</Label>
              <Select
                value={form.dropoff}
                onValueChange={(value) => setForm({ ...form, dropoff: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn tỉnh/thành phố" />
                </SelectTrigger>
                <SelectContent>
                  {vietnamLogisticsLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hạn giao */}
            <div className="space-y-2">
              <Label>Hạn giao hàng</Label>
              <Input
                type="datetime-local"
                value={form.deliveryTime}
                onChange={(e) =>
                  setForm({ ...form, deliveryTime: e.target.value })
                }
              />
            </div>

            {/* Giá đề xuất */}
            <div className="space-y-2">
              <Label>Giá đề xuất (VND) *</Label>
              <Input
                inputMode="numeric"
                value={
                  form.proposedPrice
                    ? Number(form.proposedPrice).toLocaleString("vi-VN")
                    : ""
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    proposedPrice: onlyDigits(e.target.value),
                  })
                }
                placeholder="1,500,000"
              />
            </div>

            {/* Ghi chú */}
            <div className="space-y-2">
              <Label>Ghi chú bảo quản</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Yêu cầu đặc biệt..."
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.fragile}
                  onChange={(e) =>
                    setForm({ ...form, fragile: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-slate-700">
                  Hàng dễ vỡ
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.strongSmell}
                  onChange={(e) =>
                    setForm({ ...form, strongSmell: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-slate-700">
                  Hàng có mùi mạnh
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.frozenRequired}
                  onChange={(e) =>
                    setForm({ ...form, frozenRequired: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-slate-700">
                  Cần đông lạnh
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowCombine}
                  onChange={(e) =>
                    setForm({ ...form, allowCombine: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-slate-700">
                  Cho phép ghép hàng
                </span>
              </label>
            </div>
          </form>

          <SheetFooter className="mt-auto pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setSheetOpen(false)}
              disabled={busy}
            >
              Hủy
            </Button>
            <Button
              form="shipment-form"
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={busy}
            >
              {busy ? "Đang lưu..." : "Lưu"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa đơn hàng?"
        description={`Đơn ${deleteTarget?.cargoType || ""} sẽ bị xóa khỏi hệ thống.`}
        confirmText="Xóa đơn"
        loading={busy}
        onConfirm={removeShipment}
      />
    </DashboardShell>
  );
}
