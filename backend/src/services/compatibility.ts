export type CargoDeclaration = {
  cargoType: string;
  category: string;
  weightKg: number;
  requiredTempMin: number;
  requiredTempMax: number;
  strongSmell?: boolean;
  fragile?: boolean;
  frozenRequired?: boolean;
  specialTemperature?: boolean;
  allowCombine?: boolean;
};

export type TruckCapabilities = {
  remainingKg: number;
  refrigerated: boolean;
  tempMin?: number | null;
  tempMax?: number | null;
};

export function evaluateCompatibility(cargo: CargoDeclaration, truck: TruckCapabilities) {
  const warnings: string[] = [];
  let score = 100;

  if (cargo.weightKg > truck.remainingKg) {
    warnings.push("Capacity Conflict");
    score -= 35;
  }
  if ((cargo.frozenRequired || cargo.specialTemperature) && !truck.refrigerated) {
    warnings.push("Temperature Conflict");
    score -= 35;
  }
  if (truck.refrigerated && truck.tempMin != null && truck.tempMax != null) {
    const supported = truck.tempMin <= cargo.requiredTempMin && truck.tempMax >= cargo.requiredTempMax;
    if (!supported) {
      warnings.push("Temperature Conflict");
      score -= 28;
    }
  }
  if (cargo.strongSmell || cargo.cargoType.toLowerCase().includes("sau rieng")) {
    warnings.push("Smell Conflict");
    score -= 18;
  }
  if (cargo.fragile && cargo.weightKg > 1200) {
    warnings.push("Fragile Cargo Warning");
    score -= 12;
  }
  if (cargo.allowCombine === false) {
    warnings.push("Not Recommended To Combine");
    score -= 15;
  }
  if (cargo.category === "Hai san" && cargo.requiredTempMax > 2) {
    warnings.push("Seafood temperature should stay near or below 0C");
    score -= 12;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status: warnings.length ? "NOT_RECOMMENDED" : "SAFE_TO_COMBINE",
    warnings
  };
}
