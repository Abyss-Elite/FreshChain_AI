import { prisma } from "../utils/prisma.js";
import { vietnamLogisticsLocations } from "./orderAssistant.js";

export type CopilotIntent = "CREATE_TRUCK" | "CREATE_SHIPMENT" | "UNKNOWN";
export type CopilotStatus =
  | "COLLECTING_DATA"
  | "VALIDATING"
  | "AWAITING_APPROVAL"
  | "EXECUTING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export interface CopilotContext {
  intent: CopilotIntent;
  status: CopilotStatus;
  api: "/api/trucks" | "/api/shipments" | null;
  method: "POST";
  data: Record<string, any>;
  missingFields: string[];
  validationErrors: string[];
  confirmationMessage: string | null;
  approved: boolean;
}

export interface CreateTruckDraft {
  type?: string;
  plateNumber?: string;
  maxCapacityKg?: number;
  remainingKg?: number;
  refrigerated?: boolean;
  tempMin?: number | null;
  tempMax?: number | null;
  currentRoute?: string;
  eta?: Date;
  currentLat?: number | null;
  currentLng?: number | null;
}

export interface CreateShipmentDraft {
  cargoType?: string;
  category?: string;
  weightKg?: number;
  requiredTempMin?: number;
  requiredTempMax?: number;
  pickup?: string;
  dropoff?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  deliveryTime?: Date;
  proposedPrice?: number;
  notes?: string;
  strongSmell?: boolean;
  fragile?: boolean;
  frozenRequired?: boolean;
  specialTemperature?: boolean;
  allowCombine?: boolean;
  compatibilityNote?: string;
}

export function normalizeWeightToKg(
  value: string | number | undefined,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;

  const cleaned = value.toString().trim().toLowerCase();
  const matched = cleaned.match(
    /([0-9]+([.,][0-9]+)?)\s*(tấn|ton|kg|kilogram|kilograms)?/,
  );
  if (!matched) return undefined;

  const raw = Number(matched[1].replace(",", "."));
  if (cleaned.includes("tấn") || cleaned.includes("ton"))
    return Math.round(raw * 1000);
  return Math.round(raw);
}

export function normalizeMoneyToVnd(
  value: string | number | undefined,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;

  const cleaned = value.toString().trim().toLowerCase();
  const matched = cleaned.match(
    /([0-9]+([.,][0-9]+)?)\s*(triệu|nghin|vnd|đồng)?/,
  );
  if (!matched) return undefined;

  const raw = Number(matched[1].replace(",", "."));
  if (cleaned.includes("triệu")) return Math.round(raw * 1000000);
  if (cleaned.includes("nghin") || cleaned.includes("k"))
    return Math.round(raw * 1000);
  return Math.round(raw);
}

export function normalizePlateNumber(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  return value.replace(/\s+/g, "").toUpperCase();
}

export function parseRelativeDate(
  value: string | undefined,
  baseDate = new Date(),
): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const base = new Date(baseDate);

  if (normalized === "hôm nay") return base.toISOString();
  if (
    normalized === "ngày mai" ||
    normalized === "sáng mai" ||
    normalized === "chiều mai"
  ) {
    base.setDate(base.getDate() + 1);
    return base.toISOString();
  }
  if (
    normalized === "ngày mốt" ||
    normalized === "ngày kia" ||
    normalized === "mai kia"
  ) {
    base.setDate(base.getDate() + 2);
    return base.toISOString();
  }
  if (normalized === "tối nay") return base.toISOString();
  if (normalized === "tuần sau") {
    base.setDate(base.getDate() + 7);
    return base.toISOString();
  }

  return undefined;
}

/**
 * Normalize location string by extracting the valid city name from the text.
 * Handles cases like "Cảng cá Thọ Quang, Đà Nẵng" → "Đà Nẵng"
 * or "Kho lạnh Hòa Khánh, Huế" → "Huế"
 */
function normalizeLocationToCity(
  locationText: string | undefined,
): string | undefined {
  if (!locationText) return undefined;

  const normalized = locationText.trim();

  // Check if the location text contains any valid Vietnamese city
  for (const city of vietnamLogisticsLocations) {
    if (normalized.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }

  // If no valid city found, return the original text (it might be used as is or validated later)
  return normalized;
}

function inferIntent(input: string): CopilotIntent {
  const text = input.toLowerCase();
  if (text.includes("xe") || text.includes("truck")) return "CREATE_TRUCK";
  if (
    text.includes("hàng") ||
    text.includes("shipment") ||
    text.includes("cargo")
  )
    return "CREATE_SHIPMENT";
  return "UNKNOWN";
}

function inferBoolean(
  text: string,
  positiveKeywords: string[],
  negativeKeywords: string[],
): boolean | undefined {
  const normalized = text.toLowerCase();
  const hasPositive = positiveKeywords.some((keyword) =>
    normalized.includes(keyword),
  );
  const hasNegative = negativeKeywords.some((keyword) =>
    normalized.includes(keyword),
  );
  if (hasPositive && !hasNegative) return true;
  if (hasNegative && !hasPositive) return false;
  return undefined;
}

export function buildCopilotContext(
  input: string,
  userRole: string,
  currentDateTime?: string,
): CopilotContext {
  const intent = inferIntent(input);
  const data: Record<string, any> = {};

  if (intent === "CREATE_TRUCK") {
    const normalizedPlate = normalizePlateNumber(
      input.match(/biển số\s*([^,]+)/i)?.[1],
    );
    const maxCapacity = normalizeWeightToKg(
      input.match(/tải trọng\s*([0-9,\.]+\s*(tấn|ton|kg)?)/i)?.[1],
    );
    const remaining = normalizeWeightToKg(
      input.match(/còn trống\s*([0-9,\.]+\s*(tấn|ton|kg)?)/i)?.[1],
    );
    const refrigerated = inferBoolean(
      input,
      ["lạnh", "đông lạnh", "có làm lạnh"],
      ["không lạnh", "không có làm lạnh", "thường"],
    );
    const routeMatch = input.match(/tuyến\s*([^,]+)/i)?.[1];
    const eta = parseRelativeDate(
      input.match(/dự kiến đến\s*(.+)$/i)?.[1] ||
        input.match(/lúc\s*(.+)$/i)?.[1],
      currentDateTime ? new Date(currentDateTime) : new Date(),
    );

    if (normalizedPlate) data.plateNumber = normalizedPlate;
    if (maxCapacity) data.maxCapacityKg = maxCapacity;
    if (remaining) data.remainingKg = remaining;
    if (refrigerated !== undefined) data.refrigerated = refrigerated;
    if (routeMatch) data.currentRoute = routeMatch.trim();
    if (eta) data.eta = eta;
    data.type = "Xe tải";

    const missingFields = [
      "type",
      "plateNumber",
      "maxCapacityKg",
      "remainingKg",
      "refrigerated",
      "currentRoute",
      "eta",
    ].filter((field) => !data[field]);
    const validationErrors = [] as string[];
    if (
      data.maxCapacityKg &&
      data.remainingKg &&
      data.remainingKg > data.maxCapacityKg
    )
      validationErrors.push("remainingKg không được lớn hơn maxCapacityKg");
    if (data.refrigerated && (!data.tempMin || !data.tempMax))
      validationErrors.push("Xe lạnh cần tempMin và tempMax");

    return {
      intent,
      status:
        missingFields.length > 0 ? "COLLECTING_DATA" : "AWAITING_APPROVAL",
      api: "/api/trucks",
      method: "POST",
      data,
      missingFields,
      validationErrors,
      confirmationMessage:
        missingFields.length === 0
          ? "Thông tin xe sắp được tạo. Bạn có xác nhận không?"
          : null,
      approved: false,
    };
  }

  if (intent === "CREATE_SHIPMENT") {
    const cargoType =
      input.match(/gồm\s+(.+?),/i)?.[1] || input.match(/hàng\s+(.+?),/i)?.[1];
    // Capture everything from "lấy tại" until "giao đến", then normalize to city
    const pickupRaw = input.match(/lấy tại\s+(.+?)(?=\s*,?\s*giao đến)/i)?.[1];
    // Capture everything from "giao đến" until comma/lúc/end of string
    const dropoffRaw = input.match(
      /giao đến\s+(.+?)(?:,(?=\s+giao lúc)|$)/i,
    )?.[1];
    const pickup = normalizeLocationToCity(pickupRaw);
    const dropoff = normalizeLocationToCity(dropoffRaw);
    const weight = normalizeWeightToKg(
      input.match(/([0-9,\.]+\s*(tấn|ton|kg)?)(?=\s+kg)/i)?.[0],
    );
    const price = normalizeMoneyToVnd(
      input.match(/([0-9,\.]+\s*(triệu|nghin|đồng|vnd|k)?)/i)?.[1],
    );
    const frozen = inferBoolean(
      input,
      ["đông lạnh", "lạnh"],
      ["không đông lạnh", "không lạnh"],
    );
    const fragile = inferBoolean(input, ["dễ vỡ", "fragile"], ["không dễ vỡ"]);
    const strongSmell = inferBoolean(input, ["mùi mạnh", "mùi"], ["không mùi"]);
    const allowCombine = inferBoolean(
      input,
      ["không ghép", "không được ghép"],
      ["ghép"],
    );
    const deliveryTime = parseRelativeDate(
      input.match(/lúc\s*(.+)$/i)?.[1] || input.match(/ngày\s*(.+)$/i)?.[1],
      currentDateTime ? new Date(currentDateTime) : new Date(),
    );

    if (cargoType) data.cargoType = cargoType.trim();
    if (pickup) data.pickup = pickup.trim();
    if (dropoff) data.dropoff = dropoff.trim();
    if (weight) data.weightKg = weight;
    if (price) data.proposedPrice = price;
    if (frozen !== undefined) data.frozenRequired = frozen;
    if (fragile !== undefined) data.fragile = fragile;
    if (strongSmell !== undefined) data.strongSmell = strongSmell;
    if (allowCombine !== undefined) data.allowCombine = allowCombine;
    if (deliveryTime) data.deliveryTime = deliveryTime;
    data.category = "Khác";

    const missingFields = [
      "cargoType",
      "category",
      "weightKg",
      "pickup",
      "dropoff",
      "deliveryTime",
      "proposedPrice",
    ].filter((field) => !data[field]);
    const validationErrors = [] as string[];
    if (data.weightKg && data.weightKg <= 0)
      validationErrors.push("weightKg phải > 0");
    if (data.proposedPrice && data.proposedPrice <= 0)
      validationErrors.push("proposedPrice phải > 0");

    return {
      intent,
      status:
        missingFields.length > 0 ? "COLLECTING_DATA" : "AWAITING_APPROVAL",
      api: "/api/shipments",
      method: "POST",
      data,
      missingFields,
      validationErrors,
      confirmationMessage:
        missingFields.length === 0
          ? "Thông tin hàng hóa sắp được tạo. Bạn có xác nhận không?"
          : null,
      approved: false,
    };
  }

  return {
    intent,
    status: "COLLECTING_DATA",
    api: null,
    method: "POST",
    data: {},
    missingFields: ["intent"],
    validationErrors: [],
    confirmationMessage: "Bạn muốn tạo mới xe chở hàng hay tạo mới hàng hóa?",
    approved: false,
  };
}

export async function createTruckFromCopilotDraft(
  userId: string,
  draft: CreateTruckDraft,
) {
  const validationErrors: string[] = [];
  if (!draft.type || draft.type.trim().length < 2)
    validationErrors.push("type phải có ít nhất 2 ký tự");
  if (!draft.plateNumber || draft.plateNumber.trim().length < 5)
    validationErrors.push("plateNumber phải có ít nhất 5 ký tự");
  if (!draft.maxCapacityKg || draft.maxCapacityKg <= 0)
    validationErrors.push("maxCapacityKg phải > 0");
  if (draft.remainingKg === undefined || draft.remainingKg < 0)
    validationErrors.push("remainingKg phải >= 0");
  if (
    draft.remainingKg !== undefined &&
    draft.maxCapacityKg !== undefined &&
    draft.remainingKg > draft.maxCapacityKg
  )
    validationErrors.push("remainingKg không được lớn hơn maxCapacityKg");
  if (draft.refrigerated && (draft.tempMin == null || draft.tempMax == null))
    validationErrors.push("Xe lạnh cần tempMin và tempMax");
  if (
    draft.refrigerated &&
    draft.tempMin !== null &&
    draft.tempMax !== null &&
    draft.tempMin !== undefined &&
    draft.tempMax !== undefined &&
    draft.tempMin > draft.tempMax
  )
    validationErrors.push("tempMin không được lớn hơn tempMax");
  if (!draft.currentRoute || draft.currentRoute.trim().length < 2)
    validationErrors.push("currentRoute phải có ít nhất 2 ký tự");
  if (!draft.eta) validationErrors.push("eta là bắt buộc");

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("; "));
  }

  return prisma.truck.create({
    data: {
      ownerId: userId,
      type: draft.type!,
      plateNumber: normalizePlateNumber(draft.plateNumber!)!,
      maxCapacityKg: draft.maxCapacityKg!,
      remainingKg: draft.remainingKg!,
      refrigerated: Boolean(draft.refrigerated),
      tempMin: draft.refrigerated ? (draft.tempMin ?? null) : null,
      tempMax: draft.refrigerated ? (draft.tempMax ?? null) : null,
      currentRoute: draft.currentRoute!,
      currentLat: draft.currentLat ?? 11.94,
      currentLng: draft.currentLng ?? 108.45,
      eta: draft.eta!,
      active: true,
    },
  });
}

export async function createShipmentFromCopilotDraft(
  userId: string,
  draft: CreateShipmentDraft,
) {
  const validationErrors: string[] = [];
  if (!draft.cargoType || draft.cargoType.trim().length < 2)
    validationErrors.push("cargoType là bắt buộc");
  if (!draft.category || draft.category.trim().length < 2)
    validationErrors.push("category là bắt buộc");
  if (!draft.weightKg || draft.weightKg <= 0)
    validationErrors.push("weightKg phải > 0");
  if (!draft.pickup || draft.pickup.trim().length < 2)
    validationErrors.push("pickup là bắt buộc");
  if (!draft.dropoff || draft.dropoff.trim().length < 2)
    validationErrors.push("dropoff là bắt buộc");
  if (!draft.deliveryTime) validationErrors.push("deliveryTime là bắt buộc");
  if (!draft.proposedPrice || draft.proposedPrice <= 0)
    validationErrors.push("proposedPrice phải > 0");
  if (
    draft.requiredTempMin !== undefined &&
    draft.requiredTempMax !== undefined &&
    draft.requiredTempMin > draft.requiredTempMax
  )
    validationErrors.push("requiredTempMin không được lớn hơn requiredTempMax");

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("; "));
  }

  return prisma.shipment.create({
    data: {
      ownerId: userId,
      cargoType: draft.cargoType!,
      category: draft.category!,
      weightKg: draft.weightKg!,
      requiredTempMin: draft.requiredTempMin ?? 0,
      requiredTempMax: draft.requiredTempMax ?? 0,
      pickup: draft.pickup!,
      dropoff: draft.dropoff!,
      pickupLat: draft.pickupLat ?? 11.94,
      pickupLng: draft.pickupLng ?? 108.45,
      dropoffLat: draft.dropoffLat ?? 10.82,
      dropoffLng: draft.dropoffLng ?? 106.63,
      deliveryTime: draft.deliveryTime!,
      proposedPrice: draft.proposedPrice!,
      notes: draft.notes || undefined,
      strongSmell: Boolean(draft.strongSmell),
      fragile: Boolean(draft.fragile),
      frozenRequired: Boolean(draft.frozenRequired),
      specialTemperature: Boolean(draft.specialTemperature),
      allowCombine: draft.allowCombine ?? true,
      compatibilityNote: draft.compatibilityNote || undefined,
      status: "MATCHING",
    },
  });
}
