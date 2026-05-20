export const routes = [
  { name: "Da Lat -> TP.HCM", from: "Da Lat", to: "TP.HCM", utilization: 88, orders: 14 },
  { name: "Can Tho -> TP.HCM", from: "Can Tho", to: "TP.HCM", utilization: 79, orders: 9 },
  { name: "Nha Trang -> Da Nang", from: "Nha Trang", to: "Da Nang", utilization: 74, orders: 7 }
];

export const shipments = [
  {
    id: "SHP-1024",
    cargoType: "Sau rieng",
    category: "Trai cay",
    weightKg: 1200,
    requiredTempMin: 8,
    requiredTempMax: 14,
    pickup: "Da Lat",
    dropoff: "TP.HCM",
    price: 4500000,
    status: "Matching",
    strongSmell: true,
    fragile: false,
    frozenRequired: false,
    specialTemperature: true,
    allowCombine: false,
    compatibilityNote: "Sau rieng co mui manh, khong ghep voi trai cay khac"
  },
  {
    id: "SHP-1025",
    cargoType: "Tom dong lanh",
    category: "Hai san",
    weightKg: 2100,
    requiredTempMin: -18,
    requiredTempMax: -5,
    pickup: "Can Tho",
    dropoff: "TP.HCM",
    price: 5900000,
    status: "Negotiating",
    strongSmell: false,
    fragile: false,
    frozenRequired: true,
    specialTemperature: true,
    allowCombine: true,
    compatibilityNote: "Hai san can nhiet do duoi 0C"
  },
  {
    id: "SHP-1026",
    cargoType: "Rau la Da Lat",
    category: "Rau cu",
    weightKg: 850,
    requiredTempMin: 2,
    requiredTempMax: 8,
    pickup: "Da Lat",
    dropoff: "TP.HCM",
    price: 3200000,
    status: "In Transit",
    strongSmell: false,
    fragile: true,
    frozenRequired: false,
    specialTemperature: true,
    allowCombine: true,
    compatibilityNote: "Rau la de dap, khong ghep hang nang"
  }
];

export const trucks = [
  {
    id: "TRK-01",
    owner: "Nam Viet Cold Truck",
    type: "Xe lanh 5 tan",
    plate: "51C-78001",
    maxCapacityKg: 5000,
    remainingKg: 2800,
    refrigerated: true,
    tempMin: -20,
    tempMax: 8,
    route: "Da Lat -> TP.HCM",
    eta: "2h 35m",
    currentTemp: 1.8
  },
  {
    id: "TRK-02",
    owner: "GreenLine Logistics",
    type: "Xe lanh 8 tan",
    plate: "51C-78002",
    maxCapacityKg: 8000,
    remainingKg: 4200,
    refrigerated: true,
    tempMin: -22,
    tempMax: 12,
    route: "Can Tho -> TP.HCM",
    eta: "3h 05m",
    currentTemp: -4.2
  },
  {
    id: "TRK-03",
    owner: "Song Han Express",
    type: "Xe thung kin",
    plate: "43C-77991",
    maxCapacityKg: 3500,
    remainingKg: 1300,
    refrigerated: false,
    tempMin: null,
    tempMax: null,
    route: "Nha Trang -> Da Nang",
    eta: "5h 10m",
    currentTemp: null
  },
  {
    id: "TRK-04",
    owner: "Lam Dong Coldway",
    type: "Xe lanh 3.5 tan",
    plate: "49C-11888",
    maxCapacityKg: 3500,
    remainingKg: 1900,
    refrigerated: true,
    tempMin: 0,
    tempMax: 16,
    route: "Da Lat -> TP.HCM",
    eta: "1h 55m",
    currentTemp: 5.4
  }
];

export const chartData = [
  { day: "T2", shipments: 18, savings: 12, utilization: 74 },
  { day: "T3", shipments: 22, savings: 15, utilization: 77 },
  { day: "T4", shipments: 19, savings: 11, utilization: 72 },
  { day: "T5", shipments: 31, savings: 21, utilization: 84 },
  { day: "T6", shipments: 27, savings: 19, utilization: 81 },
  { day: "T7", shipments: 35, savings: 24, utilization: 88 }
];

export function scoreMatch(shipment = shipments[0], truck = trucks[0]) {
  const warnings: string[] = [];
  let compatibility = 100;
  if (shipment.weightKg > truck.remainingKg) {
    warnings.push("Capacity Conflict");
    compatibility -= 28;
  }
  if ((shipment.frozenRequired || shipment.specialTemperature) && !truck.refrigerated) {
    warnings.push("Temperature Conflict");
    compatibility -= 35;
  }
  if (truck.refrigerated && truck.tempMin !== null && truck.tempMax !== null) {
    if (truck.tempMin > shipment.requiredTempMin || truck.tempMax < shipment.requiredTempMax) {
      warnings.push("Temperature Conflict");
      compatibility -= 24;
    }
  }
  if (shipment.strongSmell || shipment.cargoType === "Sau rieng") {
    warnings.push("Smell Conflict");
    compatibility -= 16;
  }
  if (shipment.fragile && shipment.weightKg > 1000) {
    warnings.push("Fragile Cargo Warning");
    compatibility -= 12;
  }
  if (!shipment.allowCombine) {
    warnings.push("Not Recommended");
    compatibility -= 14;
  }
  const routeScore = truck.route === `${shipment.pickup} -> ${shipment.dropoff}` ? 96 : 68;
  const capacityScore = Math.min(100, Math.round((truck.remainingKg / shipment.weightKg) * 72));
  const timeScore = truck.eta.includes("1h") || truck.eta.includes("2h") ? 92 : 76;
  const matchingScore = Math.round(compatibility * 0.38 + routeScore * 0.24 + capacityScore * 0.24 + timeScore * 0.14);
  return {
    compatibility: Math.max(0, compatibility),
    routeScore,
    capacityScore,
    timeScore,
    matchingScore,
    estimatedSavings: Math.round((shipment.price * matchingScore) / 210),
    warnings
  };
}
