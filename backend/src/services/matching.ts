import { Shipment, Truck } from "@prisma/client";
import { evaluateCompatibility } from "./compatibility.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DISTANCE TABLE  (đối xứng, tính km giữa từng cặp thành phố)
// ─────────────────────────────────────────────────────────────────────────────
const cityDistance: Record<string, Record<string, number>> = {
  "Đà Nẵng": {
    "TP.HCM": 960,
    "Quy Nhơn": 160,
    "Quảng Ngãi": 120,
    "Bình Định": 170,
    "Nha Trang": 520,
    "Phan Thiết": 780,
  },
  "TP.HCM": {
    "Đà Nẵng": 960,
    "Nha Trang": 430,
    "Cần Thơ": 170,
    "Bình Dương": 30,
    "Phan Thiết": 200,
    "Quy Nhơn": 750,
    "Quảng Ngãi": 1000,
  },
  "Nha Trang": {
    "Đà Nẵng": 520,
    "TP.HCM": 430,
    "Quy Nhơn": 240,
    "Bình Định": 240,
    "Phan Thiết": 230,
    "Quảng Ngãi": 390,
  },
  "Quy Nhơn": {
    "Đà Nẵng": 160,
    "Nha Trang": 240,
    "TP.HCM": 750,
    "Bình Định": 0,
    "Quảng Ngãi": 140,
  },
  "Bình Định": {
    "Quy Nhơn": 0,
    "Đà Nẵng": 170,
    "Nha Trang": 240,
    "TP.HCM": 750,
    "Quảng Ngãi": 140,
  },
  "Quảng Ngãi": {
    "Đà Nẵng": 120,
    "Quy Nhơn": 140,
    "Bình Định": 140,
    "TP.HCM": 1000,
    "Nha Trang": 390,
  },
  "Cần Thơ": { "TP.HCM": 170, "Cà Mau": 120 },
  "Cà Mau": { "Cần Thơ": 120, "TP.HCM": 280 },
  "Phan Thiết": { "TP.HCM": 200, "Nha Trang": 230, "Đà Nẵng": 780 },
  "Bình Dương": { "TP.HCM": 30 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. ORDERED HIGHWAY CORRIDORS
//    Mỗi "corridor" là danh sách thành phố theo thứ tự địa lý dọc trục đường.
//    Một đơn hàng hợp lệ nếu pickup và dropoff đều xuất hiện trên cùng corridor
//    VÀ pickup đứng TRƯỚC dropoff (theo chiều đi của xe).
// ─────────────────────────────────────────────────────────────────────────────
const CORRIDORS: string[][] = [
  // Quốc lộ 1A / cao tốc Bắc – Nam (từ Bắc xuống Nam)
  [
    "Hà Nội",
    "Thanh Hóa",
    "Vinh",
    "Đồng Hới",
    "Huế",
    "Đà Nẵng",
    "Quảng Ngãi",
    "Quy Nhơn",
    "Bình Định",
    "Tuy Hòa",
    "Nha Trang",
    "Phan Rang",
    "Phan Thiết",
    "TP.HCM",
  ],
  // Hành lang miền Tây Nam Bộ
  ["TP.HCM", "Cần Thơ", "Cà Mau"],
  // Vành đai TP.HCM - Bình Dương
  ["Bình Dương", "TP.HCM"],
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. NORMALIZATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const CITY_ALIASES: Record<string, string> = {
  "ho chi minh": "TP.HCM",
  "hồ chí minh": "TP.HCM",
  hcm: "TP.HCM",
  "tp hcm": "TP.HCM",
  "tp.hcm": "TP.HCM",
  "thành phố hồ chí minh": "TP.HCM",
  saigon: "TP.HCM",
  "sài gòn": "TP.HCM",
  "quy nhơn": "Quy Nhơn",
  "qui nhon": "Quy Nhơn",
  "binh dinh": "Bình Định",
  "bình định": "Bình Định",
  "quảng ngãi": "Quảng Ngãi",
  "quang ngai": "Quảng Ngãi",
  "đà nẵng": "Đà Nẵng",
  "da nang": "Đà Nẵng",
  "nha trang": "Nha Trang",
  "phan thiết": "Phan Thiết",
  "phan thiet": "Phan Thiết",
  "cần thơ": "Cần Thơ",
  "can tho": "Cần Thơ",
  "cà mau": "Cà Mau",
  "ca mau": "Cà Mau",
  "bình dương": "Bình Dương",
  "binh duong": "Bình Dương",
};

function normalizeCity(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];
  // Capitalize first letter of each word as fallback
  return raw
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/** Trích xuất danh sách thành phố từ chuỗi route "A -> B -> C" */
function parseRouteStops(route: string): string[] {
  return route
    .split(/->|→|–|-/)
    .map((s) => normalizeCity(s.trim()))
    .filter(Boolean);
}

function routeDistance(pickup: string, dropoff: string): number {
  const from = normalizeCity(pickup);
  const to = normalizeCity(dropoff);
  return cityDistance[from]?.[to] ?? cityDistance[to]?.[from] ?? 420;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CORE: isRouteCompatible  (NỚI LỎNG – hỗ trợ trả dọc đường)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Trả về true nếu chặng (shipmentPickup → shipmentDropoff) nằm trên
 * trục di chuyển của xe (truckRoute).
 *
 * Thuật toán (ưu tiên từ trên xuống dưới):
 *   A) Khớp chính xác toàn tuyến hoặc ngược chiều
 *   B) Sub-segment theo lộ trình thực của xe (các stop tường minh)
 *   C) Sub-segment theo CORRIDOR địa lý (Quốc lộ 1A…)
 *      → Cả truckFrom, truckTo, shipPickup, shipDropoff phải cùng corridor
 *        VÀ thứ tự địa lý phải nhất quán với chiều đi của xe.
 */
export function isRouteCompatible(shipment: Shipment, truck: Truck): boolean {
  const truckStops = parseRouteStops(truck.currentRoute);
  const shipPickup = normalizeCity(shipment.pickup);
  const shipDropoff = normalizeCity(shipment.dropoff);

  if (truckStops.length < 2) return false;

  const truckFrom = truckStops[0];
  const truckTo = truckStops[truckStops.length - 1];

  // ── A) Khớp chính xác ────────────────────────────────────────────────────
  const exactForward =
    truckStops[0] === shipPickup &&
    truckStops[truckStops.length - 1] === shipDropoff;
  const exactReverse =
    truckStops[0] === shipDropoff &&
    truckStops[truckStops.length - 1] === shipPickup;
  if (exactForward || exactReverse) return true;

  // ── B) Sub-segment trong danh sách stop tường minh của xe ────────────────
  //    (Ví dụ: xe khai "Đà Nẵng -> Quảng Ngãi -> Quy Nhơn -> TP.HCM")
  if (truckStops.length >= 3) {
    const pIdx = truckStops.indexOf(shipPickup);
    const dIdx = truckStops.indexOf(shipDropoff);
    if (pIdx !== -1 && dIdx !== -1 && pIdx < dIdx) return true;
  }

  // ── C) Sub-segment qua CORRIDOR địa lý ───────────────────────────────────
  for (const corridor of CORRIDORS) {
    const truckFromIdx = corridor.indexOf(truckFrom);
    const truckToIdx = corridor.indexOf(truckTo);
    const shipPickupIdx = corridor.indexOf(shipPickup);
    const shipDropoffIdx = corridor.indexOf(shipDropoff);

    // Tất cả 4 điểm phải thuộc cùng corridor
    if (
      truckFromIdx === -1 ||
      truckToIdx === -1 ||
      shipPickupIdx === -1 ||
      shipDropoffIdx === -1
    )
      continue;

    // Xác định chiều đi của xe (xuôi / ngược)
    const truckForward = truckFromIdx <= truckToIdx;

    if (truckForward) {
      // Xe đi xuôi: pickup và dropoff của đơn phải nằm trong đoạn [truckFrom, truckTo]
      // VÀ pickup phải đứng trước dropoff theo chiều xuôi
      if (
        shipPickupIdx >= truckFromIdx &&
        shipPickupIdx <= truckToIdx &&
        shipDropoffIdx >= truckFromIdx &&
        shipDropoffIdx <= truckToIdx &&
        shipPickupIdx < shipDropoffIdx
      ) {
        return true;
      }
    } else {
      // Xe đi ngược (từ Nam lên Bắc): tương tự nhưng đảo chiều
      if (
        shipPickupIdx <= truckFromIdx &&
        shipPickupIdx >= truckToIdx &&
        shipDropoffIdx <= truckFromIdx &&
        shipDropoffIdx >= truckToIdx &&
        shipPickupIdx > shipDropoffIdx
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Trả về "điểm tuyến đường" (0-100) thay vì chỉ boolean.
 * Điểm cao hơn nếu đơn nằm trên tuyến chính xác / gần điểm đón của xe.
 */
function routeCompatibilityScore(shipment: Shipment, truck: Truck): number {
  if (!isRouteCompatible(shipment, truck)) return 0;

  const truckStops = parseRouteStops(truck.currentRoute);
  const shipPickup = normalizeCity(shipment.pickup);
  const shipDropoff = normalizeCity(shipment.dropoff);
  const truckFrom = truckStops[0];
  const truckTo = truckStops[truckStops.length - 1];

  // Khớp chính xác điểm đầu/cuối → điểm tối đa
  if (shipPickup === truckFrom && shipDropoff === truckTo) return 100;

  // Sub-segment tường minh trong stops của xe
  const pIdx = truckStops.indexOf(shipPickup);
  const dIdx = truckStops.indexOf(shipDropoff);
  if (pIdx !== -1 && dIdx !== -1) return 92;

  // Sub-segment qua corridor: giảm điểm theo tỷ lệ "đoạn đơn / tổng tuyến xe"
  const totalDist = routeDistance(truckFrom, truckTo) || 1;
  const segmentDist = routeDistance(shipPickup, shipDropoff);
  const coverage = Math.min(segmentDist / totalDist, 1);
  // Điểm dao động 60–88 tuỳ mức phủ
  return Math.round(60 + coverage * 28);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TEMPERATURE COMPATIBILITY  (giữ nguyên)
// ─────────────────────────────────────────────────────────────────────────────
function isTemperatureCompatible(shipment: Shipment, truck: Truck): boolean {
  if (
    (shipment.frozenRequired || shipment.specialTemperature) &&
    !truck.refrigerated
  ) {
    return false;
  }

  if (truck.refrigerated && truck.tempMin != null && truck.tempMax != null) {
    return (
      truck.tempMin <= shipment.requiredTempMin &&
      truck.tempMax >= shipment.requiredTempMax
    );
  }

  return !shipment.frozenRequired && !shipment.specialTemperature;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
export function isTruckEligibleForShipment(
  shipment: Shipment,
  truck: Truck,
  currentShipments: Shipment[] = [],
): boolean {
  // 1. Tải trọng lũy kế
  const currentWeight = currentShipments.reduce(
    (sum, s) => sum + Number(s.weightKg || 0),
    0,
  );
  const realRemainingKg = Number(truck.maxCapacityKg || 0) - currentWeight;
  if (realRemainingKg < shipment.weightKg) return false;

  // 2. Tuyến đường (nới lỏng – sub-segment / corridor)
  if (!isRouteCompatible(shipment, truck)) return false;

  // 3. Nhiệt độ
  if (!isTemperatureCompatible(shipment, truck)) return false;

  // 4. Thời gian giao hàng
  const hoursUntilDelivery =
    (shipment.deliveryTime.getTime() - truck.eta.getTime()) / 36e5;
  if (hoursUntilDelivery < 0) return false;

  return true;
}

export function scoreTruck(
  shipment: Shipment,
  truck: Truck,
  existingShipments?: Shipment[],
) {
  const compatibility = evaluateCompatibility(
    {
      cargoType: shipment.cargoType,
      category: shipment.category,
      weightKg: shipment.weightKg,
      requiredTempMin: shipment.requiredTempMin,
      requiredTempMax: shipment.requiredTempMax,
      strongSmell: shipment.strongSmell,
      fragile: shipment.fragile,
      frozenRequired: shipment.frozenRequired,
      specialTemperature: shipment.specialTemperature,
      allowCombine: shipment.allowCombine,
    },
    {
      remainingKg: truck.remainingKg,
      refrigerated: truck.refrigerated,
      tempMin: truck.tempMin,
      tempMax: truck.tempMax,
    },
    existingShipments?.map((s) => ({
      cargoType: s.cargoType,
      category: s.category,
      weightKg: s.weightKg,
      requiredTempMin: s.requiredTempMin,
      requiredTempMax: s.requiredTempMax,
      strongSmell: s.strongSmell,
      fragile: s.fragile,
      frozenRequired: s.frozenRequired,
      specialTemperature: s.specialTemperature,
      allowCombine: s.allowCombine,
    })),
  );

  const capacityRatio = Math.min(
    truck.remainingKg / Math.max(shipment.weightKg, 1),
    1.4,
  );
  const capacityScore = Math.round(Math.min(100, capacityRatio * 72));

  // Sử dụng routeCompatibilityScore thay vì boolean
  const distanceScore = routeCompatibilityScore(shipment, truck);

  const hoursUntilDelivery =
    (shipment.deliveryTime.getTime() - truck.eta.getTime()) / 36e5;
  const timeScore =
    hoursUntilDelivery < 0
      ? 30
      : Math.max(
          50,
          Math.min(
            100,
            100 - Math.round(Math.max(0, hoursUntilDelivery - 2) * 4),
          ),
        );

  const warnings = [...compatibility.warnings];
  if (distanceScore === 0) {
    warnings.push("Tuyến đường giao nhận không nằm trên lộ trình xe");
  } else if (distanceScore < 80) {
    warnings.push(
      "Đơn nằm trên trục lộ trình nhưng không khớp chính xác điểm đầu/cuối",
    );
  }
  if (hoursUntilDelivery < 0) {
    warnings.push("Thời gian xe đến trễ hơn thời hạn giao hàng");
  }

  const matchingScore = Math.round(
    compatibility.score * 0.42 +
      capacityScore * 0.26 +
      distanceScore * 0.22 +
      timeScore * 0.1,
  );

  const estimatedSavings = Math.max(
    350000,
    Math.round((shipment.proposedPrice * matchingScore) / 240),
  );

  return {
    matchingScore,
    compatibilityScore: compatibility.score,
    distanceScore,
    capacityScore,
    timeScore,
    estimatedSavings,
    warnings,
    conflicts: compatibility.conflicts || [],
  };
}

export function aggregateTrucks(
  shipment: Shipment,
  trucks: Truck[],
  neededTrucks: number,
) {
  const ranked = trucks
    .map((truck) => ({ truck, score: scoreTruck(shipment, truck) }))
    .filter((item) => item.score.matchingScore >= 58)
    .sort((a, b) => b.score.matchingScore - a.score.matchingScore)
    .slice(0, neededTrucks);

  return {
    trucks: ranked,
    totalCapacity: ranked.reduce(
      (sum, item) => sum + item.truck.remainingKg,
      0,
    ),
    totalCost: ranked.reduce(
      (sum, item) => sum + Math.round(shipment.proposedPrice * 0.92),
      0,
    ),
    averageScore: ranked.length
      ? Math.round(
          ranked.reduce((sum, item) => sum + item.score.matchingScore, 0) /
            ranked.length,
        )
      : 0,
    eta: ranked[0]?.truck.eta,
  };
}

export function calculateMultiDropCapacity(
  truck: Truck,
  proposedShipments: Shipment[],
) {
  let cumulativeWeight = 0;
  const shipmentSequence = [];
  let remainingCapacity = truck.remainingKg;

  for (const shipment of proposedShipments) {
    cumulativeWeight += shipment.weightKg;
    remainingCapacity -= shipment.weightKg;

    shipmentSequence.push({
      shipmentId: shipment.id,
      cargoType: shipment.cargoType,
      weight: shipment.weightKg,
      cumulativeWeight,
      remainingCapacity: Math.max(0, remainingCapacity),
      canAdd: remainingCapacity >= 0,
    });

    if (remainingCapacity < 0) break;
  }

  return {
    truckId: truck.id,
    totalProposedWeight: cumulativeWeight,
    remainingCapacity: Math.max(0, remainingCapacity),
    canAcceptAllShipments: remainingCapacity >= 0,
    shipmentSequence,
  };
}
