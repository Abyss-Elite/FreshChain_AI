import { Shipment, Truck } from "@prisma/client";
import { evaluateCompatibility } from "./compatibility.js";

const cityDistance: Record<string, Record<string, number>> = {
  "Đà Nẵng": { "TP.HCM": 960, "Quy Nhơn": 160, "Quảng Ngãi": 120 },
  "TP.HCM": { "Đà Nẵng": 960, "Nha Trang": 430, "Cần Thơ": 170 },
  "Nha Trang": { "Đà Nẵng": 520, "TP.HCM": 430, "Quy Nhơn": 380 },
  "Quy Nhơn": { "Đà Nẵng": 160, "Nha Trang": 380, "TP.HCM": 750 },
  "Quảng Ngãi": { "Đà Nẵng": 120, "Quy Nhơn": 140, "TP.HCM": 1000 },
  "Cần Thơ": { "TP.HCM": 170, "Cà Mau": 120 },
  "Cà Mau": { "Cần Thơ": 120, "TP.HCM": 280 },
};

function normalizeCity(value: string) {
  return value
    .trim()
    .replace(/Ho Chi Minh|TP\.HCM|Thành phố Hồ Chí Minh/gi, "TP.HCM")
    .replace(/TP/gi, "TP");
}

function normalizeRouteText(route: string) {
  return route.replace(/\s+/g, " ").trim().toLowerCase();
}

function routeDistance(pickup: string, dropoff: string) {
  const from = normalizeCity(pickup);
  const to = normalizeCity(dropoff);
  return cityDistance[from]?.[to] || cityDistance[to]?.[from] || 420;
}

/**
 * Kiểm tra tuyến đường con (Route Sub-segment)
 * Điểm đi và điểm đến của đơn hàng phải nằm trên lộ trình của xe
 * Ví dụ: Đơn từ Đà Nẵng -> Quy Nhơn hợp lệ với xe chạy Đà Nẵng -> TP.HCM
 */
function isRouteCompatible(shipment: Shipment, truck: Truck) {
  const normalizedRoute = normalizeRouteText(truck.currentRoute);
  const pickup = normalizeRouteText(shipment.pickup);
  const dropoff = normalizeRouteText(shipment.dropoff);

  // Exact route match
  const expectedRoute = `${pickup} -> ${dropoff}`;
  const reverseRoute = `${dropoff} -> ${pickup}`;

  if (normalizedRoute === expectedRoute || normalizedRoute === reverseRoute) {
    return true;
  }

  // Sub-segment match: both pickup and dropoff appear in route, in correct order
  const pickupIdx = normalizedRoute.indexOf(pickup);
  const dropoffIdx = normalizedRoute.indexOf(dropoff);

  if (pickupIdx !== -1 && dropoffIdx !== -1) {
    return pickupIdx < dropoffIdx;
  }

  return false;
}

/**
 * Kiểm tra khoảng nhiệt độ (Temperature Overlay)
 * Khoảng nhiệt độ yêu cầu của đơn phải nằm trong khoảng của xe
 */
function isTemperatureCompatible(shipment: Shipment, truck: Truck) {
  if (
    (shipment.frozenRequired || shipment.specialTemperature) &&
    !truck.refrigerated
  ) {
    return false;
  }

  if (truck.refrigerated && truck.tempMin != null && truck.tempMax != null) {
    // Đơn yêu cầu 12°C - 16°C, xe đáp ứng 10°C - 18°C -> Hợp lệ
    return (
      truck.tempMin <= shipment.requiredTempMin &&
      truck.tempMax >= shipment.requiredTempMax
    );
  }

  return !shipment.frozenRequired && !shipment.specialTemperature;
}

export function isTruckEligibleForShipment(
  shipment: Shipment,
  truck: Truck,
  currentShipments: Shipment[] = [], // Thêm tham số thứ 3 (mặc định là mảng rỗng nếu không truyền)
) {
  // 1. Tính toán tải trọng trống thực tế lũy kế dựa trên các đơn hàng đã được duyệt trên xe
  const currentWeight = currentShipments.reduce(
    (sum, s) => sum + Number(s.weightKg || 0),
    0,
  );
  const realRemainingKg = Number(truck.maxCapacityKg || 0) - currentWeight;

  // Kiểm tra xem xe còn đủ sức chứa cho đơn hàng mới này không
  if (realRemainingKg < shipment.weightKg) {
    return false;
  }

  // 2. Kiểm tra tính tương thích về lộ trình tuyến đường
  if (!isRouteCompatible(shipment, truck)) {
    return false;
  }

  // 3. Kiểm tra tính tương thích về khoảng giao nhiệt độ
  if (!isTemperatureCompatible(shipment, truck)) {
    return false;
  }

  // 4. Kiểm tra thời gian giao hàng dự kiến
  const hoursUntilDelivery =
    (shipment.deliveryTime.getTime() - truck.eta.getTime()) / 36e5;
  if (hoursUntilDelivery < 0) {
    return false;
  }

  return true;
}

/**
 * Tính điểm phù hợp của xe với đơn hàng
 * Bao gồm: tương thích, tuyến đường, tải trọng, thời gian, xung đột hàng hóa
 */
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
    existingShipments
      ? existingShipments.map((s) => ({
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
        }))
      : undefined,
  );

  const capacityRatio = Math.min(
    truck.remainingKg / Math.max(shipment.weightKg, 1),
    1.4,
  );
  const capacityScore = Math.round(Math.min(100, capacityRatio * 72));
  const distance = routeDistance(shipment.pickup, shipment.dropoff);
  const routeMatch = isRouteCompatible(shipment, truck);
  const distanceScore = routeMatch
    ? 95
    : Math.max(20, 100 - Math.round(distance / 8));

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
  if (!routeMatch) {
    warnings.push("Tuyến đường giao nhận không khớp");
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

/**
 * Ghép nhiều đơn hàng trên cùng một xe (Multi-drop Matching)
 * Tính toán khả năng gom nhiều đơn dựa theo tải trọng lũy kế
 */
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

/**
 * Tính toán khả năng ghép nhiều đơn trên cùng một xe
 * @param truck Xe hiện tại
 * @param proposedShipments Các đơn hàng dự kiến ghép
 * @returns Thông tin về khả năng ghép và tải trọng lũy kế
 */
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

    if (remainingCapacity < 0) {
      break;
    }
  }

  return {
    truckId: truck.id,
    totalProposedWeight: cumulativeWeight,
    remainingCapacity: Math.max(0, remainingCapacity),
    canAcceptAllShipments: remainingCapacity >= 0,
    shipmentSequence,
  };
}
