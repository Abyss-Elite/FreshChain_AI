import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";

// Chuẩn hóa biển số về một định dạng duy nhất (VD: "43A-780.01" cho seri 5 số,
// "43A-7800" cho seri 4 số) để copilot và form truyền thống luôn lưu cùng 1 kiểu,
// bất kể người dùng nhập có gạch ngang/dấu chấm hay không.
export function normalizePlate(value: string) {
  const upper = value.replace(/\s+/g, "").toUpperCase();

  const fiveDigit = upper.match(/^(\d{2}[A-Z])-?(\d{3})\.?(\d{2})$/);
  if (fiveDigit) {
    return `${fiveDigit[1]}-${fiveDigit[2]}.${fiveDigit[3]}`;
  }

  const fourDigit = upper.match(/^(\d{2}[A-Z])-?(\d{4})$/);
  if (fourDigit) {
    return `${fourDigit[1]}-${fourDigit[2]}`;
  }

  return upper;
}

export async function assertTruckPlateNotDuplicate(
  plateNumber: string,
  excludeId?: string,
) {
  const normalizedPlate = normalizePlate(plateNumber);
  const existing = await prisma.truck.findUnique({
    where: { plateNumber: normalizedPlate },
    select: { id: true },
  });
  if (existing && existing.id !== excludeId) {
    throw new HttpError(
      409,
      "Biển số xe đã tồn tại trong hệ thống. Vui lòng kiểm tra lại thông tin.",
    );
  }
}

export interface ShipmentDuplicateCheckInput {
  ownerId: string;
  cargoType: string;
  category: string;
  weightKg: number;
  requiredTempMin: number;
  requiredTempMax: number;
  pickup: string;
  dropoff: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  deliveryTime: Date;
  proposedPrice: number;
  notes?: string | null;
  strongSmell: boolean;
  fragile: boolean;
  frozenRequired: boolean;
  specialTemperature: boolean;
  allowCombine: boolean;
  compatibilityNote?: string | null;
}

// Coi là trùng khi TẤT CẢ các trường do người dùng nhập đều khớp với một đơn hàng đã có của cùng chủ đơn.
export async function assertShipmentNotDuplicate(
  data: ShipmentDuplicateCheckInput,
) {
  const existing = await prisma.shipment.findFirst({
    where: {
      ownerId: data.ownerId,
      cargoType: data.cargoType,
      category: data.category,
      weightKg: data.weightKg,
      requiredTempMin: data.requiredTempMin,
      requiredTempMax: data.requiredTempMax,
      pickup: data.pickup,
      dropoff: data.dropoff,
      pickupLat: data.pickupLat,
      pickupLng: data.pickupLng,
      dropoffLat: data.dropoffLat,
      dropoffLng: data.dropoffLng,
      deliveryTime: data.deliveryTime,
      proposedPrice: data.proposedPrice,
      notes: data.notes ?? null,
      strongSmell: data.strongSmell,
      fragile: data.fragile,
      frozenRequired: data.frozenRequired,
      specialTemperature: data.specialTemperature,
      allowCombine: data.allowCombine,
      compatibilityNote: data.compatibilityNote ?? null,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(
      409,
      "Đơn hàng với đầy đủ thông tin này đã tồn tại. Vui lòng kiểm tra lại hoặc chỉnh sửa thông tin trước khi tạo mới.",
    );
  }
}
