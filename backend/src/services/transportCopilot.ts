import { AssistantSessionStatus, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { vietnamLogisticsLocations } from "./orderAssistant.js";
import {
  assertTruckPlateNotDuplicate,
  assertShipmentNotDuplicate,
} from "./duplicateCheck.js";

export function canCreateTruck(role: string) {
  return ["SHIPPER", "ADMIN"].includes(role);
}

export function canCreateShipment(role: string) {
  return ["CARRIER", "ADMIN"].includes(role);
}

async function resolveCurrentUserRole(userId: string, fallbackRole: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role ?? fallbackRole;
}

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

export interface CopilotParseResult {
  sessionId: string;
  context: CopilotContext;
  message: string;
  rawInput: string;
}

export interface TruckDraft {
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

export interface ShipmentDraft {
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

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeText(value: string) {
  return stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toSentenceCase(value: string) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toLocaleUpperCase("vi-VN")}${trimmed.slice(1)}`;
}

function normalizeTruckType(value: string | undefined) {
  if (!value) return undefined;

  const normalized = normalizeText(value);
  if (normalized.includes("cho trai cay") || normalized.includes("trai cay")) {
    return "Chở trái cây";
  }
  if (normalized.includes("dong lanh")) {
    return "Xe tải đông lạnh";
  }
  if (normalized.includes("xe thuong")) {
    return "Xe thường";
  }

  return toSentenceCase(value);
}

export function isTruckTemperatureSensitive(draft: Pick<TruckDraft, "type">) {
  if (!draft.type) return false;
  const normalized = normalizeText(draft.type);
  return (
    normalized.includes("trai cay") ||
    normalized.includes("hoa qua") ||
    normalized.includes("fruit") ||
    normalized.includes("nong san") ||
    normalized.includes("rau")
  );
}

function friendlyFieldLabel(field: string) {
  switch (field) {
    case "type":
      return "loại xe";
    case "plateNumber":
      return "biển số xe";
    case "maxCapacityKg":
      return "tải trọng tối đa";
    case "remainingKg":
      return "tải trọng còn trống";
    case "refrigerated":
      return "xe lạnh";
    case "tempMin":
      return "nhiệt độ tối thiểu";
    case "tempMax":
      return "nhiệt độ tối đa";
    case "currentRoute":
      return "tuyến hiện tại";
    case "eta":
      return "thời gian";
    case "cargoType":
      return "loại hàng";
    case "category":
      return "nhóm hàng";
    case "weightKg":
      return "khối lượng";
    case "requiredTempMin":
      return "nhiệt độ yêu cầu tối thiểu";
    case "requiredTempMax":
      return "nhiệt độ yêu cầu tối đa";
    case "pickup":
      return "điểm lấy hàng";
    case "dropoff":
      return "điểm giao hàng";
    case "deliveryTime":
      return "thời gian giao";
    case "proposedPrice":
      return "giá đề xuất";
    case "intent":
      return "ý định";
    default:
      return field;
  }
}

function buildMissingFieldsMessage(missingFields: string[]) {
  if (missingFields.length === 0) return "Đã nhận thông tin của bạn.";

  const rawLabels = missingFields.map((field) => {
    if (field === "tempMin" || field === "tempMax") {
      return "nhiệt độ";
    }
    return friendlyFieldLabel(field);
  });
  const labels = Array.from(new Set(rawLabels));
  if (labels.length === 1) {
    return `Cần thêm ${labels[0]}.`;
  }

  return `Cần thêm: ${labels.join(", ")}.`;
}

function friendlyValidationError(error: string) {
  const normalized = normalizeText(error);

  if (normalized === "eta") return "Cần thêm thời gian.";
  if (normalized === "deliverytime") return "Cần thêm thời gian giao.";
  if (normalized === "platenumber") return "Cần thêm biển số xe.";
  if (normalized === "currentroute") return "Cần thêm tuyến hiện tại.";
  if (normalized === "cargotype") return "Cần thêm loại hàng.";
  if (normalized === "category") return "Cần thêm nhóm hàng.";
  if (normalized === "pickup") return "Cần thêm điểm lấy hàng.";
  if (normalized === "dropoff") return "Cần thêm điểm giao hàng.";
  if (normalized.includes("remainingkg > maxcapacitykg")) {
    return "Tải trọng còn trống không được lớn hơn tải trọng tối đa.";
  }
  if (normalized.includes("maxcapacitykg")) {
    return "Tải trọng tối đa phải lớn hơn 0.";
  }
  if (normalized.includes("remainingkg")) {
    return "Tải trọng còn trống phải lớn hơn hoặc bằng 0.";
  }
  if (normalized.includes("weightkg")) {
    return "Khối lượng phải lớn hơn 0.";
  }
  if (normalized.includes("proposedprice")) {
    return "Giá đề xuất phải lớn hơn 0.";
  }
  if (normalized.includes("requiredtempmin > requiredtempmax")) {
    return "Nhiệt độ yêu cầu tối thiểu không được lớn hơn nhiệt độ tối đa.";
  }
  if (normalized.includes("tempmin > tempmax")) {
    return "Nhiệt độ tối thiểu không được lớn hơn nhiệt độ tối đa.";
  }

  return error;
}

export function normalizePlateNumber(value?: string) {
  if (!value) return undefined;
  return value.replace(/\s+/g, "").toUpperCase();
}

function extractPlateNumberFromSpeech(input: string): string | undefined {
  const normalized = normalizeText(input);

  const explicitMatch = normalized.match(
    /\b(?:bien so|bsx)\s*[:\-]?\s*(.+?)(?=,|;|\.|\b(?:tai trong|con trong|tuyen|du kien|nhiet do)\b|$)/i,
  );

  const candidates = [
    explicitMatch?.[1],
    normalized.match(/\b(\d{2})\s*([a-z])\s*-\s*(\d{5})\b/i)?.[0],
    normalized.match(/\b(\d{2})\s*([a-z])\s*-\s*(\d{3})\s*\.\s*(\d{2})\b/i)?.[0],
    normalized.match(/\b(\d{2})\s*(?:xe|x|c)\s*(\d{5})\b/i)?.[0],
    normalized.match(/\b(\d{2})\s*(\d{3})\s*(\d{2})\b/i)?.[0],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const cleaned = normalizeText(candidate)
      .replace(/\b(xe|tai|xetai|xe tai|chu|chung|moi)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const explicitPlate = cleaned.match(/^(\d{2})\s*([a-z])\s*-\s*(\d{3})\s*\.\s*(\d{2})$/i);
    if (explicitPlate) {
      return `${explicitPlate[1]}${explicitPlate[2].toUpperCase()}-${explicitPlate[3]}.${explicitPlate[4]}`;
    }

    const compactPlate = cleaned.match(/^(\d{2})\s*([a-z])\s*-\s*(\d{5})$/i);
    if (compactPlate) {
      const serial = compactPlate[3];
      return `${compactPlate[1]}${compactPlate[2].toUpperCase()}-${serial.slice(0, 3)}.${serial.slice(3)}`;
    }

    const groupedPlate = cleaned.match(/^(\d{2})\s*(\d{5})$/i);
    if (groupedPlate) {
      const serial = groupedPlate[2];
      return `${groupedPlate[1]}C-${serial.slice(0, 3)}.${serial.slice(3)}`;
    }

    const mixedPlate = cleaned.match(/^(\d{2})\s*([a-z])\s*(\d{3})\s*(\d{2})$/i);
    if (mixedPlate) {
      return `${mixedPlate[1]}${mixedPlate[2].toUpperCase()}-${mixedPlate[3]}.${mixedPlate[4]}`;
    }
  }

  return undefined;
}

function extractTruckRouteFromSpeech(input: string): string | undefined {
  const normalized = normalizeText(input);
  const patterns = [
    /\b(?:di tu|tu)\s+(.+?)\s+\b(?:den|toi)\s+(.+?)(?=,|;|\.|\b(?:nhiet do|du kien|luc|sang mai|chieu mai|toi nay|ngay mai|ngay moi|ngay kia|mai kia)\b|$)/i,
    /\b(?:di|di den)\s+(.+?)\s+\bden\s+(.+?)(?=,|;|\.|\b(?:nhiet do|du kien|luc|sang mai|chieu mai|toi nay|ngay mai|ngay moi|ngay kia|mai kia)\b|$)/i,
    /\btuyen\s+(.+?)\s+\b(?:di|den|toi)\s+(.+?)(?=,|;|\.|\b(?:nhiet do|du kien|luc|sang mai|chieu mai|toi nay|ngay mai|ngay moi|ngay kia|mai kia)\b|$)/i,
    /\btuyen\s+(.+?)(?=,|;|\.|\bnhiet do\b|\bdu kien\b|\bluc\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match?.[1]) continue;

    if (match[2]) {
      const originSource = normalizeWhitespace(match[1]);
      const destinationSource = normalizeWhitespace(match[2]);
      const origin = normalizeLocationToCity(match[1]);
      const destination = normalizeLocationToCity(match[2]);
      if (origin === originSource || destination === destinationSource) continue;
      if (!origin || !destination) continue;
      return `${origin} đi ${destination}`;
    }

    const route = formatTruckRouteFromText(match[1]);
    if (route) return route;
  }

  return undefined;
}

function formatTruckRouteFromText(routeText: string) {
  const normalized = normalizeWhitespace(routeText);
  const connectorMatch = normalized.match(/^(.+?)\s+\b(?:di|den|toi)\s+(.+)$/i);
  if (connectorMatch?.[1] && connectorMatch[2]) {
    const origin = normalizeLocationToCity(connectorMatch[1]);
    const destination = normalizeLocationToCity(connectorMatch[2]);
    if (origin && destination) {
      return `${origin} đi ${destination}`;
    }
  }

  return normalizeLocationToCity(routeText);
}


export function normalizeQuantityToKg(value?: string) {
  if (!value) return undefined;
  const normalized = normalizeText(value).replace(/,/g, ".");
  const match = normalized.match(
    /(-?\d+(?:\.\d+)?)\s*(tan|ton|kg|kilogram|kilograms)?/,
  );
  if (!match) return undefined;

  const number = Number(match[1]);
  if (Number.isNaN(number)) return undefined;

  const unit = match[2];
  if (unit === "tan" || unit === "ton") {
    return Math.round(number * 1000);
  }
  return Math.round(number);
}

export function normalizeMoneyToVnd(value?: string) {
  if (!value) return undefined;
  const normalized = normalizeText(value).replace(/,/g, ".");
  const match = normalized.match(
    /(-?\d+(?:\.\d+)?)\s*(trieu|nghin|k|vnd|dong)?/,
  );
  if (!match) return undefined;

  const number = Number(match[1]);
  if (Number.isNaN(number)) return undefined;

  const unit = match[2];
  if (unit === "trieu") return Math.round(number * 1_000_000);
  if (unit === "nghin" || unit === "k") return Math.round(number * 1_000);
  return Math.round(number);
}

function parseSignedNumber(value?: string) {
  if (!value) return undefined;
  const normalized = normalizeText(value)
    .replace(/,/g, ".")
    .replace(/do\b/g, "")
    .replace(/d?o\b/g, "")
    .replace(/\b(am|minus)\b\s*/g, "-")
    .replace(/-\s+/g, "-");
  const match = normalized.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const number = Number(match[1]);
  if (Number.isNaN(number)) return undefined;
  return number;
}

function parseBoolean(
  text: string,
  positiveKeywords: string[],
  negativeKeywords: string[],
) {
  const normalized = normalizeText(text);
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

function parseExplicitClockTime(text: string) {
  const normalized = normalizeText(text);

  const hourMinuteMatch =
    normalized.match(
      /\b(?:luc|vao luc|vao khoang|vao|at)\s+(\d{1,2})(?:[:h](\d{2})|h|\s*(?:gio|g))?\b/,
    ) || normalized.match(/\b(\d{1,2})(?:[:h](\d{2})|h|\s*(?:gio|g))\b/);

  if (!hourMinuteMatch) return null;

  const hour = Number(hourMinuteMatch[1]);
  const minute = hourMinuteMatch[2] ? Number(hourMinuteMatch[2]) : 0;
  const hasMorning = /\b(sang|buoi sang)\b/.test(normalized);
  const hasAfternoon = /\b(chieu|buoi chieu)\b/.test(normalized);
  const hasEvening = /\b(toi|buoi toi)\b/.test(normalized);
  const hasNoon = /\b(trua|buoi trua)\b/.test(normalized);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  let adjustedHour = hour;
  if (hasNoon) {
    adjustedHour = 12;
  } else if (hasAfternoon || hasEvening) {
    if (adjustedHour >= 1 && adjustedHour <= 11) {
      adjustedHour += 12;
    }
  } else if (hasMorning && adjustedHour === 12) {
    adjustedHour = 0;
  }

  return { hour: adjustedHour, minute };
}

function getVietnamParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function buildVietnamDate(
  base: Date,
  dayOffset: number,
  hour: number,
  minute = 0,
) {
  const parts = getVietnamParts(base);
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + dayOffset,
      hour - 7,
      minute,
      0,
      0,
    ),
  );
}

function formatTruckBoolean(val: any) {
  if (val === true || val === "true") return "Có";
  if (val === false || val === "false") return "Không";
  return "Không";
}

function formatTruckTemperature(val: any) {
  if (val === null || val === undefined) return "null";
  return `${val}`;
}

function formatVietnamDateTimeDisplay(val: any) {
  if (!val) return "null";
  const dateObj = typeof val === "string" ? new Date(val) : val;
  if (Number.isNaN(dateObj.getTime())) return "null";

  const parts = getVietnamParts(dateObj);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(parts.hour)}:${pad(parts.minute)} ${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}


function parseExplicitDate(text: string, currentDateTime: Date) {
  const normalized = normalizeText(text);
  const match = normalized.match(
    /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/,
  );
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const currentParts = getVietnamParts(currentDateTime);
  let year = match[3] ? Number(match[3]) : currentParts.year;
  if (year < 100) year += 2000;

  if (!match[3]) {
    const candidate = Date.UTC(year, month - 1, day);
    const today = Date.UTC(
      currentParts.year,
      currentParts.month - 1,
      currentParts.day,
    );
    if (candidate < today) year += 1;
  }

  return { year, month, day };
}

function parseRelativeDateTime(
  value: string,
  currentDateTime: Date,
): { date?: Date; needsTime: boolean } {
  const normalized = normalizeText(value);
  const explicit = parseExplicitClockTime(value);
  const explicitDate = parseExplicitDate(value, currentDateTime);

  if (explicitDate) {
    return {
      date: new Date(
        Date.UTC(
          explicitDate.year,
          explicitDate.month - 1,
          explicitDate.day,
          (explicit?.hour ?? 0) - 7,
          explicit?.minute ?? 0,
          0,
          0,
        ),
      ),
      needsTime: !explicit,
    };
  }

  const hasToday = normalized.includes("hom nay");
  const hasTomorrow = normalized.includes("ngay mai");
  const hasTomorrowMorning = normalized.includes("sang mai");
  const hasTomorrowAfternoon = normalized.includes("chieu mai");
  const hasDayAfterTomorrow =
    normalized.includes("ngay mot") ||
    normalized.includes("ngay kia") ||
    normalized.includes("mai kia");
  const hasThisEvening = normalized.includes("toi nay");
  const hasNextWeek = normalized.includes("tuan sau");

  let dayOffset = 0;
  if (hasDayAfterTomorrow) dayOffset = 2;
  else if (hasTomorrow || hasTomorrowMorning || hasTomorrowAfternoon) dayOffset = 1;
  else if (hasNextWeek) dayOffset = 7;
  else if (hasToday || hasThisEvening) dayOffset = 0;
  else if (!explicit) {
    const absolute = new Date(value);
    if (!Number.isNaN(absolute.getTime())) {
      return { date: absolute, needsTime: false };
    }
    return { needsTime: false };
  }

  if (!explicit) {
    return { needsTime: true };
  }

  return {
    date: buildVietnamDate(
      currentDateTime,
      dayOffset,
      explicit.hour,
      explicit.minute,
    ),
    needsTime: false,
  };
}

function extractFirstMatch(
  input: string,
  patterns: RegExp[],
): string | undefined {
  const normalizedInput = normalizeText(input);
  for (const pattern of patterns) {
    const match = normalizedInput.match(pattern);
    if (match?.[1]) {
      return normalizeWhitespace(match[1]);
    }
  }
  return undefined;
}

/**
 * Same matching logic as extractFirstMatch, but returns the substring from the
 * original (accented, original-case) input instead of the normalized one.
 * Relies on stripDiacritics + toLowerCase being length-preserving per character
 * so match indices line up between the normalized and original strings.
 */
function extractFirstMatchOriginal(
  input: string,
  patterns: RegExp[],
): string | undefined {
  const lengthPreserving = stripDiacritics(input).toLowerCase();
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("d")
      ? pattern.flags
      : `${pattern.flags}d`;
    const re = new RegExp(pattern.source, flags);
    const match = re.exec(lengthPreserving) as
      | (RegExpExecArray & { indices?: Array<[number, number]> })
      | null;
    const range = match?.indices?.[1];
    if (range) {
      return normalizeWhitespace(input.slice(range[0], range[1]));
    }
  }
  return undefined;
}

/**
 * Normalize location string by extracting the valid city name from the text.
 * Handles cases like "Cảng cá Thọ Quang, Đà Nẵng" → "Đà Nẵng"
 * or "Kho lạnh Hòa Khánh, Huế" → "Huế"
 * Also handles normalized (no-diacritics) input like "cang ca tho quang, da nang"
 */
function normalizeLocationToCity(
  locationText: string | undefined,
): string | undefined {
  if (!locationText) return undefined;

  const normalized = locationText.trim();
  const normalizedNoAccent = stripDiacritics(normalized).toLowerCase();

  // Check if the location text contains any valid Vietnamese city
  for (const city of vietnamLogisticsLocations) {
    const cityNoAccent = stripDiacritics(city).toLowerCase();
    if (normalizedNoAccent.includes(cityNoAccent)) {
      return city; // Return the properly formatted city name
    }
  }

  // If no valid city found, return the original text (it might be used as is or validated later)
  return normalized;
}

function isKnownVietnamLocation(value?: string): boolean {
  if (!value) return false;
  const normalizedNoAccent = stripDiacritics(value).toLowerCase();
  return vietnamLogisticsLocations.some((city) =>
    normalizedNoAccent.includes(stripDiacritics(city).toLowerCase()),
  );
}

function parseTemperatureRangeText(value?: string) {
  if (!value) return {};

  const normalized = normalizeText(value)
    .replace(/\b(?:tu|toi|toi da|do)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let parts = normalized
    .split(/\bden\b/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    parts = normalized
      .split(/-/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (parts.length < 2) {
    return {};
  }

  const min = parseSignedNumber(parts[0]);
  const max = parseSignedNumber(parts[1]);

  return { min, max };
}

function extractTemperatureRangeFromSpeech(input: string) {
  const normalized = normalizeText(input)
    .replace(/\btuoi\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /(?:nhiet do|nhiet|am)\s*(?:tu|:)\s*(am\s*)?(-?\d+(?:\.\d+)?)\s*(?:den|toi|-|va)\s*(am\s*)?(-?\d+(?:\.\d+)?)(?:\s*do)?/i,
    /(am\s*)?(-?\d+(?:\.\d+)?)\s*(?:den|toi|-|va)\s*(am\s*)?(-?\d+(?:\.\d+)?)(?:\s*do)?/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[2] && match?.[4]) {
      const min = parseSignedNumber(`${match[1] ?? ""}${match[2]}`);
      const max = parseSignedNumber(`${match[3] ?? ""}${match[4]}`);
      if (min !== undefined && max !== undefined) {
        return { min, max };
      }
    }
  }

  return {};
}


export function inferTruckDraftNormalized(
  input: string,
  currentDateTime: Date,
  previous: Record<string, any>,
): TruckDraft {
  const draft: TruckDraft = { ...previous };
  const normalized = normalizeText(input);

  const type = extractFirstMatch(input, [
    /\b(?:xe|loai xe)\s+(.+?)(?=\b(?:bien so|bsx|tai trong|con trong|tuyen|du kien|nhiet do)\b|,|$)/i,
    /\b(?:tao|them)\s+(?:xe\s+)?(.+?)(?=\b(?:bien so|bsx|tai trong|con trong|tuyen|du kien|nhiet do)\b|,|$)/i,
  ]);
  const plateNumber = extractPlateNumberFromSpeech(input);
  const maxCapacity = extractFirstMatch(input, [
    /\btai trong(?: toi da)?\s*[:\-]?\s*([0-9.,]+\s*(?:tan|ton|kg)?)\b/i,
    /\bcon cho\s*[:\-]?\s*([0-9.,]+\s*(?:tan|ton|kg)?)\b/i,
  ]);
  const remaining = extractFirstMatch(input, [
    /\bcon trong\s*[:\-]?\s*([0-9.,]+\s*(?:tan|ton|kg)?)\b/i,
    /\btrong hoan toan\b/i,
  ]);
  const route = extractTruckRouteFromSpeech(input);
  const etaRaw = extractFirstMatch(input, [
    /\bdu kien den\s+(.+?)(?=\.|,|;|$)/i,
    /\bdu kien\s+(.+?)(?=\.|,|;|$)/i,
    /\bden luc\s+(.+?)(?=\.|,|;|$)/i,
    /\bluc\s+(.+?)(?=\.|,|;|$)/i,
  ]);
  const tempRangeText = extractFirstMatch(input, [
    /\bnhiet do\s+tu\s+(.+?)(?=\.|,|;|$)/i,
    /\bnhiet do\s*[:\-]?\s*(.+?)(?=\.|,|;|$)/i,
  ]);

  if (!draft.type && type) {
    draft.type = normalizeTruckType(type);
  }
  if (plateNumber) draft.plateNumber = normalizePlateNumber(plateNumber);
  if (maxCapacity) draft.maxCapacityKg = normalizeQuantityToKg(maxCapacity);
  if (remaining) {
    if (normalizeText(remaining).includes("trong hoan toan")) {
      if (draft.maxCapacityKg) {
        draft.remainingKg = draft.maxCapacityKg;
      }
    } else {
      draft.remainingKg = normalizeQuantityToKg(remaining);
    }
  }

  const refrigerated = parseBoolean(
    normalized,
    ["lanh", "dong lanh", "co lam lanh", "co he thong lam lanh"],
    ["khong lanh", "khong co lam lanh", "khong dong lanh", "xe thuong"],
  );
  if (refrigerated !== undefined) draft.refrigerated = refrigerated;
  else if (draft.refrigerated === undefined) draft.refrigerated = false;
  if (route) draft.currentRoute = route;
  if (etaRaw) {
    const parsed = parseRelativeDateTime(etaRaw, currentDateTime);
    if (parsed.date) {
      draft.eta = parsed.date;
    }
  }

  const tempRange = parseTemperatureRangeText(tempRangeText);
  const fallbackTempRange = extractTemperatureRangeFromSpeech(input);
  if (tempRange.min === undefined && fallbackTempRange.min !== undefined) {
    tempRange.min = fallbackTempRange.min;
  }
  if (tempRange.max === undefined && fallbackTempRange.max !== undefined) {
    tempRange.max = fallbackTempRange.max;
  }
  if (tempRange.min !== undefined) draft.tempMin = tempRange.min;
  if (tempRange.max !== undefined) draft.tempMax = tempRange.max;

  if (!draft.currentLat) draft.currentLat = undefined;
  if (!draft.currentLng) draft.currentLng = undefined;

  return draft;
}


export function inferShipmentDraftNormalized(
  input: string,
  currentDateTime: Date,
  previous: Record<string, any>,
): ShipmentDraft {
  const draft: ShipmentDraft = { ...previous };
  const normalized = normalizeText(input);

  const cargoType = extractFirstMatchOriginal(input, [
    /\b(?:hang hoa\s+gom|gom|hang)\s+(.+?)(?=,|\blay tai\b|\bgiao den\b|\bluc\b|\bnhiet do\b|$)/i,
    /([A-Za-z\u00C0-\u1EF90-9\s\-/]+?)(?=,|\blay tai\b|\bgiao den\b|\bluc\b|\bnhiet do\b|$)/i,
  ]);
  const pickup = extractFirstMatch(input, [
    /\blay tai\s+(.+?)(?=\s*,\s*\bgiao den\b|\s+\bgiao den\b|\bluc\b|$)/i,
    /\bdon tai\s+(.+?)(?=\s*,\s*\bgiao den\b|\s+\bgiao den\b|\bluc\b|$)/i,
    /\bgiao tu\s+(.+?)(?=\s+den\b|\s*,\s*den\b)/i,
    /\bvan chuyen tu\s+(.+?)(?=\s+den\b|\s*,\s*den\b)/i,
    /\bdi tu\s+(.+?)(?=\s+\bden\b|\s*,\s*\bden\b)/i,
  ]);
  const dropoff = extractFirstMatch(input, [
    /\bgiao den\s+(.+?)(?=\s*,\s*\bluc\b|\s+\bluc\b|$)/i,
    /\bgiao tu\s+.+?\s+den\s+(.+?)(?=\s*,|\s+\bluc\b|$)/i,
    /\bvan chuyen tu\s+.+?\s+den\s+(.+?)(?=\s*,|\s+\bluc\b|$)/i,
    /\bdi tu\s+.+?\s+\bden\s+(.+?)(?=,|\s+\bluc\b|\bthoi gian\b|\bdu kien\b|\bgia\b|$)/i,
    /\bden\s+(.+?)(?=\s*,\s*\bluc\b|\s+\bluc\b|$)/i,
  ]);
  const weightText = extractFirstMatch(input, [
    /\b([0-9.,]+\s*(?:tan|ton|kg))\b/i,
  ]);
  const tempRangeText = extractFirstMatch(input, [
    /\bnhiet do\s+tu\s+(.+?)(?=\.|,|;|$)/i,
    /\bnhiet do\s*[:\-]?\s*(.+?)(?=\.|,|;|$)/i,
  ]);
  const priceText = extractFirstMatch(input, [
    /\bgia de xuat\s+(.+?)(?=,|\.|$)/i,
    /\bgia\s+(.+?)(?=,|\.|$)/i,
  ]);
  const deliveryTimeRaw = extractFirstMatch(input, [
    /\bdu kien den\s+(.+?)(?=,|\.|;|$)/i,
    /\bden luc\s+(.+?)(?=,|\.|;|$)/i,
    /\bluc\s+(.+?)(?=,|\.|;|$)/i,
    /\bsang mai\s+(.+?)(?=,|\.|;|$)/i,
    /\bchieu mai\s+(.+?)(?=,|\.|;|$)/i,
    /\bngay mai\s+(.+?)(?=,|\.|;|$)/i,
    /\bhom nay\s+(.+?)(?=,|\.|;|$)/i,
    /\btuan sau\s+(.+?)(?=,|\.|;|$)/i,
  ]);
  const notes = extractFirstMatch(input, [
    /\bghi chu\s*[:\-]?\s*(.+?)(?=,|\.|$)/i,
  ]);

  if (cargoType && !draft.cargoType) {
    draft.cargoType = normalizeWhitespace(cargoType).replace(
      /^\s*[0-9.,]+\s*(?:tan|ton|kg)\s+/i,
      "",
    );
  }
  if (!draft.category) {
    draft.category =
      extractShipmentCategory(input) ?? inferShipmentCategory(draft.cargoType);
  }
  if (pickup) draft.pickup = normalizeLocationToCity(pickup);
  if (dropoff) draft.dropoff = normalizeLocationToCity(dropoff);
  if (weightText) draft.weightKg = normalizeQuantityToKg(weightText);
  if (priceText) draft.proposedPrice = normalizeMoneyToVnd(priceText);
  if (notes) draft.notes = notes;

  const tempRange = parseTemperatureRangeText(tempRangeText);
  if (tempRange.min !== undefined) draft.requiredTempMin = tempRange.min;
  if (tempRange.max !== undefined) draft.requiredTempMax = tempRange.max;

  const deliveryParsed = deliveryTimeRaw
    ? parseRelativeDateTime(deliveryTimeRaw, currentDateTime)
    : parseRelativeDateTime(input, currentDateTime);
  if (deliveryParsed.date) draft.deliveryTime = deliveryParsed.date;

  const strongSmell = parseBoolean(
    normalized,
    ["mui manh", "co mui manh", "strong smell"],
    ["khong mui manh", "khong co mui manh"],
  );
  const fragile = parseBoolean(
    normalized,
    ["de vo", "fragile"],
    ["khong de vo", "khong fragile"],
  );
  const frozenRequired = parseBoolean(
    normalized,
    ["dong lanh"],
    ["khong dong lanh"],
  );
  const specialTemperature = parseBoolean(
    normalized,
    ["kiem soat nhiet do dac biet", "nhiet do dac biet", "special temperature"],
    ["khong can kiem soat nhiet do dac biet"],
  );
  const allowCombine =
    normalized.includes("khong duoc ghep") ||
    normalized.includes("khong ghep hang") ||
    normalized.includes("khong ghep voi hang khac")
      ? false
      : normalized.includes("cho phep ghep hang") ||
          normalized.includes("ghep hang")
        ? true
        : undefined;

  draft.strongSmell = strongSmell ?? false;
  draft.fragile = fragile ?? false;
  draft.frozenRequired = frozenRequired ?? false;
  draft.specialTemperature = specialTemperature ?? false;
  draft.allowCombine = allowCombine ?? true;
  if (draft.allowCombine === false && !draft.compatibilityNote) {
    const note = extractFirstMatch(input, [
      /\b(?:ly do|vi ly do)\s+(.+?)(?=,|\.|$)/i,
    ]);
    if (note) draft.compatibilityNote = note;
  }

  return draft;
}


function inferIntent(
  input: string,
  currentIntent?: CopilotIntent,
): CopilotIntent {
  const normalized = normalizeText(input);
  if (
    normalized.includes("xe") ||
    normalized.includes("truck") ||
    normalized.includes("chuyen xe") ||
    normalized.includes("tao xe")
  ) {
    return "CREATE_TRUCK";
  }
  if (
    normalized.includes("hang") ||
    normalized.includes("shipment") ||
    normalized.includes("cargo") ||
    normalized.includes("tao hang")
  ) {
    return "CREATE_SHIPMENT";
  }
  return currentIntent ?? "UNKNOWN";
}

function inferTruckType(input: string) {
  return extractFirstMatch(input, [
    /(?:xe|loai xe)\s+(.+?)(?=\bbi?n s[oố]\b|,| tai trong| dang| du kien|$)/i,
    /(?:tao|them)\s+(.+?)(?=\bbi?n s[oố]\b|,| tai trong| dang| du kien|$)/i,
  ]);
}

function inferTruckDraft(
  input: string,
  currentDateTime: Date,
  previous: Record<string, any>,
): TruckDraft {
  const draft: TruckDraft = { ...previous };

  const plateNumber = extractFirstMatch(input, [
    /\bbi?n s[oố]\s*[:\-]?\s*([A-Za-z0-9\-. ]{5,})/i,
    /\bbsx\s*[:\-]?\s*([A-Za-z0-9\-. ]{5,})/i,
  ]);
  const maxCapacity = extractFirstMatch(input, [
    /\btai trong(?: toi da)?\s*[:\-]?\s*([0-9.,]+\s*(?:tan|ton|kg)?)\b/i,
    /\bcon cho\s*[:\-]?\s*([0-9.,]+\s*(?:tan|ton|kg)?)\b/i,
  ]);
  const remaining = extractFirstMatch(input, [
    /\bcon trong\s*[:\-]?\s*([0-9.,]+\s*(?:tan|ton|kg)?)\b/i,
    /\btrong hoan toan\b/i,
  ]);
  const route = extractFirstMatch(input, [
    /\btuyen\s+(.+?)(?=,|;|\.|\bnhiet do\b|\bdu kien\b|\bluc\b|$)/i,
  ]);
  const etaRaw = extractFirstMatch(input, [
    /\bdu kien den\s+(.+?)(?=\.|,|;|$)/i,
    /\bdu kien\s+(.+?)(?=\.|,|;|$)/i,
    /\bluc\s+(.+?)(?=\.|,|;|$)/i,
  ]);
  const tempRangeText = extractFirstMatch(input, [
    /\bnhiet do\s+tu\s+(.+?)$/i,
    /\bnhiet do\s*[:\-]?\s*(.+?)$/i,
  ]);

  if (!draft.type) {
    draft.type = inferTruckType(input);
  }
  if (plateNumber) draft.plateNumber = normalizePlateNumber(plateNumber);
  if (maxCapacity) draft.maxCapacityKg = normalizeQuantityToKg(maxCapacity);
  if (remaining) {
    if (normalizeText(remaining).includes("trong hoan toan")) {
      if (draft.maxCapacityKg) {
        draft.remainingKg = draft.maxCapacityKg;
      }
    } else {
      draft.remainingKg = normalizeQuantityToKg(remaining);
    }
  }

  const refrigerated = parseBoolean(
    input,
    ["lanh", "dong lanh", "co lam lanh", "co he thong lam lanh"],
    ["khong lanh", "khong co lam lanh", "khong dong lanh", "xe thuong"],
  );
  if (refrigerated !== undefined) draft.refrigerated = refrigerated;
  if (route) draft.currentRoute = route;
  if (etaRaw) {
    const parsed = parseRelativeDateTime(etaRaw, currentDateTime);
    if (parsed.date) {
      draft.eta = parsed.date;
    }
  }

  if (tempRangeText) {
    const normalized = normalizeText(tempRangeText);
    const rangeParts = normalized
      .split(/den|toi|-/i)
      .map((part) => part.trim());
    if (rangeParts.length >= 2) {
      const min = parseSignedNumber(rangeParts[0]);
      const max = parseSignedNumber(rangeParts[1]);
      if (min !== undefined) draft.tempMin = min;
      if (max !== undefined) draft.tempMax = max;
    }
  }

  if (!draft.currentLat) draft.currentLat = undefined;
  if (!draft.currentLng) draft.currentLng = undefined;

  return draft;
}

function inferShipmentCategory(cargoType?: string) {
  if (!cargoType) return undefined;
  const normalized = normalizeText(cargoType);
  if (
    normalized.includes("trai cay") ||
    normalized.includes("hoa qua") ||
    normalized.includes("chuoi") ||
    normalized.includes("xoai") ||
    normalized.includes("sau rieng") ||
    normalized.includes("cam")
  ) {
    return "Trái cây";
  }
  if (
    normalized.includes("ca") ||
    normalized.includes("hai san") ||
    normalized.includes("tom") ||
    normalized.includes("muc") ||
    normalized.includes("cua")
  ) {
    return "Hải sản";
  }
  if (
    normalized.includes("rau") ||
    normalized.includes("cu") ||
    normalized.includes("qua") ||
    normalized.includes("nong san")
  ) {
    return "Rau củ quả";
  }
  if (
    normalized.includes("thit") ||
    normalized.includes("gia cam") ||
    normalized.includes("ga") ||
    normalized.includes("heo") ||
    normalized.includes("bo")
  ) {
    return "Thịt/Gia cầm";
  }
  return undefined;
}

function extractShipmentCategory(input: string): string | undefined {
  const match = extractFirstMatch(input, [
    /\b(?:nhom hang|nhom|the loai|category)\s+(.+?)(?=,|\.|\blay tai\b|\bgiao den\b|\bluc\b|\bnhiet do\b|\bgia de xuat\b|\bkhong ghep\b|\bdon tai\b|\bden\b|$)/i,
  ]);
  if (match) {
    return toSentenceCase(match);
  }
  return undefined;
}


function inferShipmentDraft(
  input: string,
  currentDateTime: Date,
  previous: Record<string, any>,
): ShipmentDraft {
  const draft: ShipmentDraft = { ...previous };
  const normalized = normalizeText(input);

  const cargoType = extractFirstMatch(input, [
    /\b(?:hang hoa\s+gom|gom|hang)\s+(.+?)(?=,|\blay tai\b|\bgiao den\b|\bluc\b|\bnhiet do\b|$)/i,
    /([A-Za-z\u00C0-\u1EF90-9\s\-/]+?)(?=,|\blay tai\b|\bgiao den\b|\bluc\b|\bnhiet do\b|$)/i,
  ]);
  const pickup = extractFirstMatch(input, [
    /\blay tai\s+(.+?)(?=,|\bgiao den\b|\bluc\b|$)/i,
    /\bdon tai\s+(.+?)(?=,|\bgiao den\b|\bluc\b|$)/i,
  ]);
  const dropoff = extractFirstMatch(input, [
    /\bgiao den\s+(.+?)(?=,|\bluc\b|$)/i,
    /\bden\s+(.+?)(?=,|\bluc\b|$)/i,
  ]);
  const weightText = extractFirstMatch(input, [
    /\b([0-9.,]+\s*(?:tan|ton|kg))\b/i,
  ]);
  const tempRangeText = extractFirstMatch(input, [
    /\bnhiet do\s+tu\s+(.+?)$/i,
    /\bnhiet do\s*[:\-]?\s*(.+?)$/i,
  ]);
  const priceText = extractFirstMatch(input, [
    /\bgi[aá] de xuat\s+(.+?)(?=,|\.|$)/i,
    /\bgi[aá]\s+(.+?)(?=,|\.|$)/i,
  ]);
  const deliveryTimeRaw = extractFirstMatch(input, [
    /\bluc\s+(.+?)(?=,|\.|$)/i,
    /\bngay mai\s+(.+?)(?=,|\.|$)/i,
    /\bhom nay\s+(.+?)(?=,|\.|$)/i,
    /\btuan sau\s+(.+?)(?=,|\.|$)/i,
  ]);
  const notes = extractFirstMatch(input, [
    /\bghi chu\s*[:\-]?\s*(.+?)(?=,|\.|$)/i,
  ]);

  if (cargoType && !draft.cargoType) {
    draft.cargoType = normalizeWhitespace(cargoType);
  }
  if (!draft.category) {
    draft.category = inferShipmentCategory(draft.cargoType);
  }
  if (pickup) draft.pickup = pickup;
  if (dropoff) draft.dropoff = dropoff;
  if (weightText) draft.weightKg = normalizeQuantityToKg(weightText);
  if (priceText) draft.proposedPrice = normalizeMoneyToVnd(priceText);
  if (notes) draft.notes = notes;

  if (tempRangeText) {
    const normalizedRange = normalizeText(tempRangeText);
    const rangeParts = normalizedRange
      .split(/den|toi|-/i)
      .map((part) => part.trim());
    if (rangeParts.length >= 2) {
      const min = parseSignedNumber(rangeParts[0]);
      const max = parseSignedNumber(rangeParts[1]);
      if (min !== undefined) draft.requiredTempMin = min;
      if (max !== undefined) draft.requiredTempMax = max;
    }
  }

  const deliveryParsed = deliveryTimeRaw
    ? parseRelativeDateTime(deliveryTimeRaw, currentDateTime)
    : parseRelativeDateTime(input, currentDateTime);
  if (deliveryParsed.date) draft.deliveryTime = deliveryParsed.date;

  const strongSmell = parseBoolean(
    normalized,
    ["mui manh", "co mui manh", "strong smell"],
    ["khong mui manh", "khong co mui manh"],
  );
  const fragile = parseBoolean(
    normalized,
    ["de vo", "fragile"],
    ["khong de vo", "khong fraglie"],
  );
  const frozenRequired = parseBoolean(
    normalized,
    ["dong lanh"],
    ["khong dong lanh"],
  );
  const specialTemperature = parseBoolean(
    normalized,
    ["kiem soat nhiet do dac biet", "nhiet do dac biet", "special temperature"],
    ["khong can kiem soat nhiet do dac biet"],
  );
  const allowCombine = parseBoolean(
    normalized,
    ["khong ghep hang", "khong duoc ghep", "khong ghep voi hang khac"],
    ["ghep hang", "cho phep ghep hang"],
  );

  if (strongSmell !== undefined) draft.strongSmell = strongSmell;
  if (fragile !== undefined) draft.fragile = fragile;
  if (frozenRequired !== undefined) draft.frozenRequired = frozenRequired;
  if (specialTemperature !== undefined)
    draft.specialTemperature = specialTemperature;
  if (allowCombine !== undefined) draft.allowCombine = allowCombine;
  if (draft.allowCombine === false && !draft.compatibilityNote) {
    const note = extractFirstMatch(input, [
      /\b(?:ly do|vi ly do)\s+(.+?)(?=,|\.|$)/i,
    ]);
    if (note) draft.compatibilityNote = note;
  }

  return draft;
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function validateTruckDraft(draft: TruckDraft) {
  const missingFields: string[] = [];
  const validationErrors: string[] = [];
  const temperatureSensitive = isTruckTemperatureSensitive(draft);

  if (!draft.type || draft.type.trim().length < 2) missingFields.push("type");
  if (!draft.plateNumber || draft.plateNumber.trim().length < 5)
    missingFields.push("plateNumber");
  if (!isDefined(draft.maxCapacityKg)) missingFields.push("maxCapacityKg");
  if (!isDefined(draft.remainingKg)) missingFields.push("remainingKg");
  if (!isDefined(draft.refrigerated)) missingFields.push("refrigerated");
  if (!draft.currentRoute || draft.currentRoute.trim().length < 2)
    missingFields.push("currentRoute");
  if (!draft.eta) missingFields.push("eta");

  if (isDefined(draft.maxCapacityKg) && draft.maxCapacityKg <= 0) {
    validationErrors.push("maxCapacityKg phải là số nguyên lớn hơn 0");
  }
  if (isDefined(draft.remainingKg) && draft.remainingKg < 0) {
    validationErrors.push("remainingKg phải là số nguyên lớn hơn hoặc bằng 0");
  }
  if (
    isDefined(draft.maxCapacityKg) &&
    isDefined(draft.remainingKg) &&
    draft.remainingKg > draft.maxCapacityKg
  ) {
    validationErrors.push("remainingKg không được lớn hơn maxCapacityKg");
  }
  if ((draft.refrigerated || temperatureSensitive) && !isDefined(draft.tempMin)) {
    missingFields.push("tempMin");
  }
  if ((draft.refrigerated || temperatureSensitive) && !isDefined(draft.tempMax)) {
    missingFields.push("tempMax");
  }
  if (
    (draft.refrigerated || temperatureSensitive) &&
    isDefined(draft.tempMin) &&
    isDefined(draft.tempMax) &&
    draft.tempMin > draft.tempMax
  ) {
    validationErrors.push("tempMin không được lớn hơn tempMax");
  }
  if (!draft.refrigerated && !temperatureSensitive) {
    draft.tempMin = draft.tempMin ?? null;
    draft.tempMax = draft.tempMax ?? null;
  }

  return { missingFields, validationErrors };
}


export function validateShipmentDraft(draft: ShipmentDraft) {
  const missingFields: string[] = [];
  const validationErrors: string[] = [];

  if (!draft.cargoType || draft.cargoType.trim().length < 2)
    missingFields.push("cargoType");
  if (!draft.category || draft.category.trim().length < 2)
    missingFields.push("category");
  if (!isDefined(draft.weightKg)) missingFields.push("weightKg");
  if (!isDefined(draft.requiredTempMin)) missingFields.push("requiredTempMin");
  if (!isDefined(draft.requiredTempMax)) missingFields.push("requiredTempMax");
  if (!draft.pickup || draft.pickup.trim().length < 2)
    missingFields.push("pickup");
  if (!draft.dropoff || draft.dropoff.trim().length < 2)
    missingFields.push("dropoff");
  if (!draft.deliveryTime) missingFields.push("deliveryTime");
  if (!isDefined(draft.proposedPrice)) missingFields.push("proposedPrice");

  if (isDefined(draft.weightKg) && draft.weightKg <= 0) {
    validationErrors.push("weightKg phải là số nguyên lớn hơn 0");
  }
  if (isDefined(draft.proposedPrice) && draft.proposedPrice <= 0) {
    validationErrors.push("proposedPrice phải là số nguyên lớn hơn 0");
  }
  if (
    isDefined(draft.requiredTempMin) &&
    isDefined(draft.requiredTempMax) &&
    draft.requiredTempMin > draft.requiredTempMax
  ) {
    validationErrors.push("requiredTempMin không được lớn hơn requiredTempMax");
  }

  if (
    draft.pickup &&
    draft.pickup.trim().length >= 2 &&
    !isKnownVietnamLocation(draft.pickup)
  ) {
    validationErrors.push(
      `Địa điểm lấy hàng "${draft.pickup.trim()}" không có trong danh sách địa danh được hỗ trợ`,
    );
  }
  if (
    draft.dropoff &&
    draft.dropoff.trim().length >= 2 &&
    !isKnownVietnamLocation(draft.dropoff)
  ) {
    validationErrors.push(
      `Địa điểm giao hàng "${draft.dropoff.trim()}" không có trong danh sách địa danh được hỗ trợ`,
    );
  }

  return { missingFields, validationErrors };
}

function buildTruckPreview(draft: TruckDraft) {
  return {
    type: draft.type?.trim(),
    plateNumber: draft.plateNumber?.trim(),
    maxCapacityKg: draft.maxCapacityKg,
    remainingKg: draft.remainingKg,
    refrigerated: draft.refrigerated ?? false,
    tempMin: draft.tempMin ?? null,
    tempMax: draft.tempMax ?? null,
    currentRoute: draft.currentRoute?.trim(),
    eta: draft.eta?.toISOString(),
    currentLat: draft.currentLat ?? null,
    currentLng: draft.currentLng ?? null,
  };
}

function buildShipmentPreview(draft: ShipmentDraft) {
  return {
    cargoType: draft.cargoType?.trim(),
    category: draft.category?.trim(),
    weightKg: draft.weightKg,
    requiredTempMin: draft.requiredTempMin,
    requiredTempMax: draft.requiredTempMax,
    pickup: draft.pickup?.trim(),
    dropoff: draft.dropoff?.trim(),
    deliveryTime: draft.deliveryTime?.toISOString(),
    proposedPrice: draft.proposedPrice,
    pickupLat: draft.pickupLat ?? null,
    pickupLng: draft.pickupLng ?? null,
    dropoffLat: draft.dropoffLat ?? null,
    dropoffLng: draft.dropoffLng ?? null,
    notes: draft.notes ?? null,
    strongSmell: draft.strongSmell ?? false,
    fragile: draft.fragile ?? false,
    frozenRequired: draft.frozenRequired ?? false,
    specialTemperature: draft.specialTemperature ?? false,
    allowCombine: draft.allowCombine ?? true,
    compatibilityNote: draft.compatibilityNote ?? null,
  };
}

function confirmationForIntent(
  intent: CopilotIntent,
  preview: Record<string, any>,
) {
  if (intent === "CREATE_TRUCK") {
    return `Thông tin xe sắp được tạo:\n\n* Loại xe: ${preview.type}\n* Biển số: ${preview.plateNumber}\n* Tải trọng tối đa: ${preview.maxCapacityKg} kg\n* Tải trọng còn trống: ${preview.remainingKg} kg\n* Xe lạnh: ${formatTruckBoolean(preview.refrigerated)}\n* Nhiệt độ: ${formatTruckTemperature(preview.tempMin)} đến ${formatTruckTemperature(preview.tempMax)} °C\n* Tuyến hiện tại: ${preview.currentRoute}\n* Thời gian dự kiến đến: ${formatVietnamDateTimeDisplay(preview.eta)}\n\nBạn có xác nhận tạo xe này không?`;
  }

  if (intent === "CREATE_SHIPMENT") {
    return `Thông tin hàng hóa sắp được tạo:\n\n* Loại hàng: ${preview.cargoType}\n* Nhóm hàng: ${preview.category}\n* Khối lượng: ${preview.weightKg} kg\n* Nhiệt độ yêu cầu: ${formatTruckTemperature(preview.requiredTempMin)} đến ${formatTruckTemperature(preview.requiredTempMax)} °C\n* Điểm lấy hàng: ${preview.pickup}\n* Điểm giao hàng: ${preview.dropoff}\n* Thời gian giao: ${formatVietnamDateTimeDisplay(preview.deliveryTime)}\n* Giá đề xuất: ${preview.proposedPrice} đồng\n* Hàng dễ vỡ: ${formatTruckBoolean(preview.fragile)}\n* Hàng đông lạnh: ${formatTruckBoolean(preview.frozenRequired)}\n* Có mùi mạnh: ${formatTruckBoolean(preview.strongSmell)}\n* Cho phép ghép hàng: ${formatTruckBoolean(preview.allowCombine)}\n* Ghi chú: ${preview.notes ?? "—"}\n\nBạn có xác nhận tạo hàng hóa này không?`;
  }

  return "Bạn muốn tạo mới xe chở hàng hay tạo mới hàng hóa?";
}


async function getOrCreateCopilotSession(userId: string) {
  const session = await prisma.orderAssistantSession.findFirst({
    where: { userId, status: AssistantSessionStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
  });

  if (session) return session;

  return prisma.orderAssistantSession.create({
    data: {
      userId,
      status: AssistantSessionStatus.ACTIVE,
      copilotStatus: "COLLECTING_DATA",
      copilotMethod: "POST",
      copilotApproved: false,
      copilotMissingFields: [],
      copilotValidationErrors: [],
      copilotData: {},
    },
  });
}

async function saveCopilotSession(
  sessionId: string,
  data: {
    copilotIntent?: CopilotIntent;
    copilotStatus?: CopilotStatus;
    copilotApi?: "/api/trucks" | "/api/shipments" | null;
    copilotData?: Record<string, any>;
    copilotMissingFields?: string[];
    copilotValidationErrors?: string[];
    copilotConfirmationMessage?: string | null;
    copilotApproved?: boolean;
    copilotSubmittedEntityType?: string | null;
    copilotSubmittedEntityId?: string | null;
    copilotSubmittedAt?: Date | null;
  },
) {
  return prisma.orderAssistantSession.update({
    where: { id: sessionId },
    data: {
      ...(data.copilotIntent !== undefined
        ? { copilotIntent: data.copilotIntent }
        : {}),
      ...(data.copilotStatus !== undefined
        ? { copilotStatus: data.copilotStatus }
        : {}),
      ...(data.copilotApi !== undefined ? { copilotApi: data.copilotApi } : {}),
      ...(data.copilotData !== undefined
        ? { copilotData: data.copilotData as Prisma.InputJsonValue }
        : {}),
      ...(data.copilotMissingFields !== undefined
        ? { copilotMissingFields: data.copilotMissingFields }
        : {}),
      ...(data.copilotValidationErrors !== undefined
        ? { copilotValidationErrors: data.copilotValidationErrors }
        : {}),
      ...(data.copilotConfirmationMessage !== undefined
        ? { copilotConfirmationMessage: data.copilotConfirmationMessage }
        : {}),
      ...(data.copilotApproved !== undefined
        ? { copilotApproved: data.copilotApproved }
        : {}),
      ...(data.copilotSubmittedEntityType !== undefined
        ? { copilotSubmittedEntityType: data.copilotSubmittedEntityType }
        : {}),
      ...(data.copilotSubmittedEntityId !== undefined
        ? { copilotSubmittedEntityId: data.copilotSubmittedEntityId }
        : {}),
      ...(data.copilotSubmittedAt !== undefined
        ? { copilotSubmittedAt: data.copilotSubmittedAt }
        : {}),
    },
  });
}

function buildContextFromState(
  intent: CopilotIntent,
  api: "/api/trucks" | "/api/shipments" | null,
  draft: Record<string, any>,
  missingFields: string[],
  validationErrors: string[],
  status: CopilotStatus,
  approved: boolean,
) {
  const confirmationMessage =
    status === "AWAITING_APPROVAL"
      ? confirmationForIntent(intent, draft)
      : missingFields.length > 0
        ? intent === "CREATE_TRUCK"
          ? "Cần bổ sung thêm thông tin để tiếp tục tạo xe."
          : "Cần bổ sung thêm thông tin để tiếp tục tạo hàng hóa."
        : validationErrors.length > 0
          ? "Có một số dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại."
          : intent === "UNKNOWN"
            ? "Bạn muốn tạo mới xe chở hàng hay tạo mới hàng hóa?"
            : null;

  return {
    intent,
    status,
    api,
    method: "POST" as const,
    data: draft,
    missingFields,
    validationErrors,
    confirmationMessage,
    approved,
  };
}

export async function getCurrentCopilotSession(userId: string) {
  const session = await getOrCreateCopilotSession(userId);
  const draft = (session.copilotData as Record<string, any> | null) ?? {};
  return {
    sessionId: session.id,
    session,
    draft,
  };
}

export async function resetCopilotSession(userId: string, sessionId: string) {
  const session = await prisma.orderAssistantSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new Error("Session not found");
  }

  await prisma.orderAssistantSession.update({
    where: { id: sessionId },
    data: {
      status: AssistantSessionStatus.COMPLETED,
      copilotStatus: "CANCELLED",
    },
  });

  return getOrCreateCopilotSession(userId);
}

export async function parseCopilotMessage(args: {
  userId: string;
  userRole: string;
  message: string;
  sessionId?: string;
  currentDateTime?: string;
}) {
  const baseSession = args.sessionId
    ? await prisma.orderAssistantSession.findUnique({
        where: { id: args.sessionId },
      })
    : await getOrCreateCopilotSession(args.userId);

  if (!baseSession || baseSession.userId !== args.userId) {
    throw new Error("Session not found");
  }

  const currentDate = args.currentDateTime
    ? new Date(args.currentDateTime)
    : new Date();
  const currentIntent =
    (baseSession.copilotIntent as CopilotIntent | null) ?? "UNKNOWN";
  const intent = inferIntent(args.message, currentIntent);

  const resolvedRole = await resolveCurrentUserRole(args.userId, args.userRole);

  if (
    intent === "CREATE_TRUCK" &&
    !canCreateTruck(resolvedRole)
  ) {
    const context = buildContextFromState(
      intent,
      "/api/trucks",
      {},
      [],
      [],
      "FAILED",
      false,
    );
    return {
      sessionId: baseSession.id,
      context,
      message: "Bạn không có quyền thực hiện thao tác này.",
    };
  }

  if (
    intent === "CREATE_SHIPMENT" &&
    !canCreateShipment(resolvedRole)
  ) {
    const context = buildContextFromState(
      intent,
      "/api/shipments",
      {},
      [],
      [],
      "FAILED",
      false,
    );
    return {
      sessionId: baseSession.id,
      context,
      message: "Bạn không có quyền thực hiện thao tác này.",
    };
  }

  const existingData =
    (baseSession.copilotData as Record<string, any> | null) ?? {};
  const nextData = { ...existingData };

  if (intent === "CREATE_TRUCK" || currentIntent === "CREATE_TRUCK") {
    const draft = inferTruckDraftNormalized(
      args.message,
      currentDate,
      nextData,
    );
    Object.assign(nextData, draft);
    if (
      isDefined(draft.remainingKg) &&
      isDefined(draft.maxCapacityKg) &&
      draft.remainingKg > draft.maxCapacityKg
    ) {
      nextData.remainingKg = undefined;
    }
  } else if (
    intent === "CREATE_SHIPMENT" ||
    currentIntent === "CREATE_SHIPMENT"
  ) {
    const draft = inferShipmentDraftNormalized(
      args.message,
      currentDate,
      nextData,
    );
    Object.assign(nextData, draft);
  }

  const api =
    intent === "CREATE_TRUCK"
      ? "/api/trucks"
      : intent === "CREATE_SHIPMENT"
        ? "/api/shipments"
        : null;

  let missingFields: string[] = [];
  let validationErrors: string[] = [];
  let status: CopilotStatus = "COLLECTING_DATA";
  let confirmationMessage: string | null = null;

  if (intent === "CREATE_TRUCK") {
    const validation = validateTruckDraft(nextData as TruckDraft);
    missingFields = validation.missingFields;
    validationErrors = validation.validationErrors;
    status =
      missingFields.length > 0
        ? "COLLECTING_DATA"
        : validationErrors.length > 0
          ? "VALIDATING"
          : "AWAITING_APPROVAL";
    if (
      (nextData.refrigerated || isTruckTemperatureSensitive(nextData as TruckDraft)) &&
      (!isDefined(nextData.tempMin) || !isDefined(nextData.tempMax))
    ) {
      status = "COLLECTING_DATA";
    }
    if (status === "AWAITING_APPROVAL") {
      confirmationMessage = confirmationForIntent(
        intent,
        buildTruckPreview(nextData as TruckDraft),
      );
    }
  } else if (intent === "CREATE_SHIPMENT") {
    if (!nextData.category && nextData.cargoType) {
      nextData.category = inferShipmentCategory(nextData.cargoType);
    }
    const validation = validateShipmentDraft(nextData as ShipmentDraft);
    missingFields = validation.missingFields;
    validationErrors = validation.validationErrors;
    status =
      missingFields.length > 0
        ? "COLLECTING_DATA"
        : validationErrors.length > 0
          ? "VALIDATING"
          : "AWAITING_APPROVAL";
    if (status === "AWAITING_APPROVAL") {
      confirmationMessage = confirmationForIntent(
        intent,
        buildShipmentPreview(nextData as ShipmentDraft),
      );
    }
  } else {
    missingFields = ["intent"];
    status = "COLLECTING_DATA";
    confirmationMessage = "Bạn muốn tạo mới xe chở hàng hay tạo mới hàng hóa?";
  }

  const context = buildContextFromState(
    intent,
    api,
    nextData,
    missingFields,
    validationErrors,
    status,
    false,
  );
  context.confirmationMessage = confirmationMessage;

  const updatedSession = await saveCopilotSession(baseSession.id, {
    copilotIntent: intent,
    copilotStatus: status,
    copilotApi: api,
    copilotData: nextData,
    copilotMissingFields: missingFields,
    copilotValidationErrors: validationErrors,
    copilotConfirmationMessage: confirmationMessage,
    copilotApproved: false,
  });

  const message =
    status === "AWAITING_APPROVAL"
      ? confirmationMessage || "Bạn có xác nhận tạo dữ liệu này không?"
      : missingFields.length > 0
        ? buildMissingFieldsMessage(missingFields)
        : validationErrors.length > 0
          ? friendlyValidationError(validationErrors[0])
          : "Đã nhận thông tin của bạn.";

  return {
    sessionId: updatedSession.id,
    context,
    message,
    rawInput: args.message,
  };
}

function makeErrorList(
  context: CopilotContext,
  intent: CopilotIntent,
  draft: Record<string, any>,
) {
  const errors: string[] = [...context.validationErrors];
  if (intent === "CREATE_TRUCK") {
    const truck = draft as TruckDraft;
    if (!truck.type || truck.type.trim().length < 2) errors.push("type");
    if (!truck.plateNumber || truck.plateNumber.trim().length < 5)
      errors.push("plateNumber");
    if (truck.maxCapacityKg == null || truck.maxCapacityKg <= 0)
      errors.push("maxCapacityKg");
    if (truck.remainingKg == null || truck.remainingKg < 0)
      errors.push("remainingKg");
    if (truck.remainingKg != null && truck.maxCapacityKg != null) {
      if (truck.remainingKg > truck.maxCapacityKg) {
        errors.push("remainingKg > maxCapacityKg");
      }
    }
    const sensitive = isTruckTemperatureSensitive(truck);
    if ((truck.refrigerated || sensitive) && truck.tempMin == null) errors.push("tempMin");
    if ((truck.refrigerated || sensitive) && truck.tempMax == null) errors.push("tempMax");
    if ((truck.refrigerated || sensitive) && truck.tempMin != null && truck.tempMax != null) {
      if (truck.tempMin > truck.tempMax) errors.push("tempMin > tempMax");
    }
    if (!truck.currentRoute || truck.currentRoute.trim().length < 2)
      errors.push("currentRoute");
    if (!truck.eta) errors.push("eta");
  }

  if (intent === "CREATE_SHIPMENT") {
    const shipment = draft as ShipmentDraft;
    if (!shipment.cargoType || shipment.cargoType.trim().length < 2)
      errors.push("cargoType");
    if (!shipment.category || shipment.category.trim().length < 2)
      errors.push("category");
    if (shipment.weightKg == null || shipment.weightKg <= 0)
      errors.push("weightKg");
    if (shipment.requiredTempMin == null) errors.push("requiredTempMin");

    if (shipment.requiredTempMax == null) errors.push("requiredTempMax");
    if (shipment.requiredTempMin != null && shipment.requiredTempMax != null) {
      if (shipment.requiredTempMin > shipment.requiredTempMax) {
        errors.push("requiredTempMin > requiredTempMax");
      }
    }
    if (!shipment.pickup || shipment.pickup.trim().length < 2)
      errors.push("pickup");
    if (!shipment.dropoff || shipment.dropoff.trim().length < 2)
      errors.push("dropoff");
    if (!shipment.deliveryTime) errors.push("deliveryTime");
    if (shipment.proposedPrice == null || shipment.proposedPrice <= 0)
      errors.push("proposedPrice");
  }

  return Array.from(new Set(errors));
}

export async function executeCopilotSession(args: {
  userId: string;
  userRole: string;
  sessionId: string;
}) {
  const session = await prisma.orderAssistantSession.findUnique({
    where: { id: args.sessionId },
  });

  if (!session || session.userId !== args.userId) {
    throw new Error("Session not found");
  }

  const intent = (session.copilotIntent as CopilotIntent | null) ?? "UNKNOWN";
  const draft = ((session.copilotData as Record<string, any> | null) ?? {}) as
    | TruckDraft
    | ShipmentDraft
    | Record<string, any>;

  if (intent === "UNKNOWN") {
    throw new Error("Bạn muốn tạo mới xe chở hàng hay tạo mới hàng hóa?");
  }

  const resolvedRole = await resolveCurrentUserRole(args.userId, args.userRole);

  if (
    intent === "CREATE_TRUCK" &&
    !canCreateTruck(resolvedRole)
  ) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  if (
    intent === "CREATE_SHIPMENT" &&
    !canCreateShipment(resolvedRole)
  ) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }

  const context = buildContextFromState(
    intent,
    intent === "CREATE_TRUCK" ? "/api/trucks" : "/api/shipments",
    draft,
    session.copilotMissingFields,
    session.copilotValidationErrors,
    session.copilotStatus as CopilotStatus,
    session.copilotApproved,
  );
  const remainingErrors = makeErrorList(context, intent, draft);
  if (remainingErrors.length > 0) {
    throw new Error(remainingErrors.join("; "));
  }

  if (session.copilotSubmittedEntityId) {
    return {
      success: true,
      message:
        intent === "CREATE_TRUCK"
          ? "Xe đã được tạo thành công."
          : "Hàng hóa đã được tạo thành công.",
      entityId: session.copilotSubmittedEntityId,
      entityType: session.copilotSubmittedEntityType,
    };
  }

  await saveCopilotSession(session.id, {
    copilotApproved: true,
    copilotStatus: "EXECUTING",
  });

  if (intent === "CREATE_TRUCK") {
    const truckDraft = draft as TruckDraft;
    const normalizedPlate = normalizePlateNumber(truckDraft.plateNumber!)!;

    try {
      await assertTruckPlateNotDuplicate(normalizedPlate);
    } catch (error) {
      if (error instanceof HttpError) {
        await saveCopilotSession(session.id, {
          copilotStatus: "FAILED",
          copilotValidationErrors: ["plateNumber"],
          copilotConfirmationMessage: null,
        });
      }
      throw error;
    }

    let truck;
    try {
      truck = await prisma.truck.create({
        data: {
          ownerId: args.userId,
          type: truckDraft.type!.trim(),
          plateNumber: normalizedPlate,
          maxCapacityKg: truckDraft.maxCapacityKg!,
          remainingKg: truckDraft.remainingKg!,
          refrigerated: Boolean(truckDraft.refrigerated),
          tempMin: (truckDraft.refrigerated || isTruckTemperatureSensitive(truckDraft)) ? (truckDraft.tempMin ?? null) : null,
          tempMax: (truckDraft.refrigerated || isTruckTemperatureSensitive(truckDraft)) ? (truckDraft.tempMax ?? null) : null,
          currentRoute: truckDraft.currentRoute!.trim(),
          currentLat: truckDraft.currentLat ?? 11.94,
          currentLng: truckDraft.currentLng ?? 108.45,
          eta: truckDraft.eta!,
          active: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        await saveCopilotSession(session.id, {
          copilotStatus: "FAILED",
          copilotValidationErrors: ["plateNumber"],
          copilotConfirmationMessage: null,
        });
        throw new HttpError(
          409,
          "Dữ liệu đã tồn tại hoặc bị trùng. Vui lòng kiểm tra lại thông tin.",
        );
      }
      throw error;
    }

    await saveCopilotSession(session.id, {
      copilotStatus: "SUCCESS",
      copilotSubmittedEntityId: truck.id,
      copilotSubmittedEntityType: "truck",
      copilotSubmittedAt: new Date(),
    });

    return {
      success: true,
      message: "Xe đã được tạo thành công.",
      truck,
    };
  }

  const shipmentDraft = draft as ShipmentDraft;
  const shipmentData = {
    ownerId: args.userId,
    cargoType: shipmentDraft.cargoType!.trim(),
    category: shipmentDraft.category!.trim(),
    weightKg: shipmentDraft.weightKg!,
    requiredTempMin: shipmentDraft.requiredTempMin!,
    requiredTempMax: shipmentDraft.requiredTempMax!,
    pickup: shipmentDraft.pickup!.trim(),
    dropoff: shipmentDraft.dropoff!.trim(),
    pickupLat: shipmentDraft.pickupLat ?? 11.94,
    pickupLng: shipmentDraft.pickupLng ?? 108.45,
    dropoffLat: shipmentDraft.dropoffLat ?? 10.82,
    dropoffLng: shipmentDraft.dropoffLng ?? 106.63,
    deliveryTime: shipmentDraft.deliveryTime!,
    proposedPrice: shipmentDraft.proposedPrice!,
    notes: shipmentDraft.notes || null,
    strongSmell: shipmentDraft.strongSmell ?? false,
    fragile: shipmentDraft.fragile ?? false,
    frozenRequired: shipmentDraft.frozenRequired ?? false,
    specialTemperature: shipmentDraft.specialTemperature ?? false,
    allowCombine: shipmentDraft.allowCombine ?? true,
    compatibilityNote: shipmentDraft.compatibilityNote || null,
  };

  try {
    await assertShipmentNotDuplicate(shipmentData);
  } catch (error) {
    if (error instanceof HttpError) {
      await saveCopilotSession(session.id, {
        copilotStatus: "FAILED",
        copilotConfirmationMessage: null,
      });
    }
    throw error;
  }

  const shipment = await prisma.shipment.create({
    data: {
      ...shipmentData,
      notes: shipmentData.notes ?? undefined,
      compatibilityNote: shipmentData.compatibilityNote ?? undefined,
      status: "MATCHING",
    },
  });

  await saveCopilotSession(session.id, {
    copilotStatus: "SUCCESS",
    copilotSubmittedEntityId: shipment.id,
    copilotSubmittedEntityType: "shipment",
    copilotSubmittedAt: new Date(),
  });

  return {
    success: true,
    message: "Hàng hóa đã được tạo thành công.",
    shipment,
  };
}

