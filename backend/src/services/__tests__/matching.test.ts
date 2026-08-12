import test from "node:test";
import assert from "node:assert/strict";
import {
  isRouteCompatible,
  isTruckEligibleForShipment,
  scoreTruck,
} from "../matching.js";

test("matches a truck route written with natural Vietnamese connectors", () => {
  const truck = {
    currentRoute: "Đà Nẵng đi Huế",
    maxCapacityKg: 5000,
    remainingKg: 3000,
    refrigerated: true,
    tempMin: -18,
    tempMax: -10,
    eta: new Date("2026-08-11T02:00:00.000Z"),
  } as any;

  const shipment = {
    pickup: "Cảng cá Thọ Quang, Đà Nẵng",
    dropoff: "Kho lạnh Hòa Khánh, Huế",
    weightKg: 2000,
    requiredTempMin: -18,
    requiredTempMax: -10,
    frozenRequired: true,
    specialTemperature: true,
    allowCombine: false,
    cargoType: "Cá đông lạnh",
    category: "Thực phẩm đông lạnh",
    deliveryTime: new Date("2026-08-11T01:00:00.000Z"),
    proposedPrice: 3000000,
    strongSmell: false,
    fragile: false,
  } as any;

  assert.equal(isRouteCompatible(shipment, truck), true);
  assert.equal(isTruckEligibleForShipment(shipment, truck), true);

  const score = scoreTruck(shipment, truck);
  assert.ok(score.matchingScore > 0);
  assert.ok(
    score.warnings.some((warning) =>
      warning.includes("Thời gian xe đến trễ hơn thời hạn giao hàng"),
    ),
  );
});

test("handles shipment locations that include facility names before the city", () => {
  const truck = {
    currentRoute: "Đà Nẵng -> Huế",
    maxCapacityKg: 5000,
    remainingKg: 3500,
    refrigerated: true,
    tempMin: -20,
    tempMax: -5,
    eta: new Date("2026-08-11T00:00:00.000Z"),
  } as any;

  const shipment = {
    pickup: "Cảng cá Thọ Quang, Đà Nẵng",
    dropoff: "Kho lạnh Hòa Khánh, Huế",
    weightKg: 1000,
    requiredTempMin: -18,
    requiredTempMax: -10,
    frozenRequired: true,
    specialTemperature: true,
    allowCombine: true,
    cargoType: "Hải sản đông lạnh",
    category: "Hải sản",
    deliveryTime: new Date("2026-08-11T03:00:00.000Z"),
    proposedPrice: 2000000,
    strongSmell: false,
    fragile: false,
  } as any;

  assert.equal(isRouteCompatible(shipment, truck), true);
  assert.equal(isTruckEligibleForShipment(shipment, truck), true);
});
