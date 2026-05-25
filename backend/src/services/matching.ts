import { Shipment, Truck } from "@prisma/client";
import { evaluateCompatibility } from "./compatibility.js";

const cityDistance: Record<string, Record<string, number>> = {
  "Da Lat": { "TP.HCM": 310, "Da Nang": 650, "Nha Trang": 140 },
  "Can Tho": { "TP.HCM": 170, "Da Nang": 960 },
  "Nha Trang": { "Da Nang": 520, "TP.HCM": 430 }
};

function normalizeCity(value: string) {
  return value
    .replace("Đ", "D")
    .replace("đ", "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("Ho Chi Minh", "TP.HCM");
}

function normalizeRouteText(route: string) {
  return route
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function routeDistance(pickup: string, dropoff: string) {
  const from = normalizeCity(pickup);
  const to = normalizeCity(dropoff);
  return cityDistance[from]?.[to] || cityDistance[to]?.[from] || 420;
}

function isRouteCompatible(shipment: Shipment, truck: Truck) {
  const normalizedRoute = normalizeRouteText(truck.currentRoute);
  const pickup = normalizeRouteText(shipment.pickup);
  const dropoff = normalizeRouteText(shipment.dropoff);
  const expectedRoute = `${pickup} -> ${dropoff}`;
  const reverseRoute = `${dropoff} -> ${pickup}`;

  if (normalizedRoute === expectedRoute || normalizedRoute === reverseRoute) {
    return true;
  }
  return (
    normalizedRoute.includes(pickup) &&
    normalizedRoute.includes(dropoff) &&
    normalizedRoute.indexOf(pickup) < normalizedRoute.indexOf(dropoff)
  );
}

function isTemperatureCompatible(shipment: Shipment, truck: Truck) {
  if ((shipment.frozenRequired || shipment.specialTemperature) && !truck.refrigerated) {
    return false;
  }
  if (truck.refrigerated && truck.tempMin != null && truck.tempMax != null) {
    return truck.tempMin <= shipment.requiredTempMin && truck.tempMax >= shipment.requiredTempMax;
  }
  return !shipment.frozenRequired && !shipment.specialTemperature;
}

export function isTruckEligibleForShipment(shipment: Shipment, truck: Truck) {
  if (truck.remainingKg < shipment.weightKg) {
    return false;
  }
  if (!isRouteCompatible(shipment, truck)) {
    return false;
  }
  if (!isTemperatureCompatible(shipment, truck)) {
    return false;
  }
  const hoursUntilDelivery = (shipment.deliveryTime.getTime() - truck.eta.getTime()) / 36e5;
  if (hoursUntilDelivery < 0) {
    return false;
  }
  return true;
}

export function scoreTruck(shipment: Shipment, truck: Truck) {
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
      allowCombine: shipment.allowCombine
    },
    truck
  );

  const capacityRatio = Math.min(truck.remainingKg / Math.max(shipment.weightKg, 1), 1.4);
  const capacityScore = Math.round(Math.min(100, capacityRatio * 72));
  const distance = routeDistance(shipment.pickup, shipment.dropoff);
  const routeMatch = isRouteCompatible(shipment, truck);
  const distanceScore = routeMatch ? 95 : Math.max(20, 100 - Math.round(distance / 8));

  const hoursUntilDelivery = (shipment.deliveryTime.getTime() - truck.eta.getTime()) / 36e5;
  const timeScore = hoursUntilDelivery < 0
    ? 30
    : Math.max(50, Math.min(100, 100 - Math.round(Math.max(0, hoursUntilDelivery - 2) * 4)));

  const warnings = [...compatibility.warnings];
  if (!routeMatch) {
    warnings.push("Tuyến đường giao nhận không khớp");
  }
  if (hoursUntilDelivery < 0) {
    warnings.push("Thời gian xe đến trễ hơn thời hạn giao hàng");
  }

  const matchingScore = Math.round(
    compatibility.score * 0.42 + capacityScore * 0.26 + distanceScore * 0.22 + timeScore * 0.10
  );
  const estimatedSavings = Math.max(350000, Math.round((shipment.proposedPrice * matchingScore) / 240));

  return {
    matchingScore,
    compatibilityScore: compatibility.score,
    distanceScore,
    capacityScore,
    timeScore,
    estimatedSavings,
    warnings
  };
}

export function aggregateTrucks(shipment: Shipment, trucks: Truck[], neededTrucks: number) {
  const ranked = trucks
    .map((truck) => ({ truck, score: scoreTruck(shipment, truck) }))
    .filter((item) => item.score.matchingScore >= 58)
    .sort((a, b) => b.score.matchingScore - a.score.matchingScore)
    .slice(0, neededTrucks);

  return {
    trucks: ranked,
    totalCapacity: ranked.reduce((sum, item) => sum + item.truck.remainingKg, 0),
    totalCost: ranked.reduce((sum, item) => sum + Math.round(shipment.proposedPrice * 0.92), 0),
    averageScore: ranked.length
      ? Math.round(ranked.reduce((sum, item) => sum + item.score.matchingScore, 0) / ranked.length)
      : 0,
    eta: ranked[0]?.truck.eta
  };
}
