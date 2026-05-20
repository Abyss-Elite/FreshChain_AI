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

function routeDistance(pickup: string, dropoff: string) {
  const from = normalizeCity(pickup);
  const to = normalizeCity(dropoff);
  return cityDistance[from]?.[to] || cityDistance[to]?.[from] || 420;
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
  const routeMatch = truck.currentRoute.includes(shipment.pickup) || truck.currentRoute.includes(shipment.dropoff);
  const distanceScore = Math.max(35, routeMatch ? 95 : 100 - Math.round(distance / 12));
  const hoursUntilDelivery = (shipment.deliveryTime.getTime() - truck.eta.getTime()) / 36e5;
  const timeScore = Math.max(30, Math.min(100, Math.round(70 + hoursUntilDelivery * 4)));
  const matchingScore = Math.round(
    compatibility.score * 0.38 + capacityScore * 0.24 + distanceScore * 0.24 + timeScore * 0.14
  );
  const estimatedSavings = Math.max(350000, Math.round((shipment.proposedPrice * matchingScore) / 220));

  return {
    matchingScore,
    compatibilityScore: compatibility.score,
    distanceScore,
    capacityScore,
    timeScore,
    estimatedSavings,
    warnings: compatibility.warnings
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
