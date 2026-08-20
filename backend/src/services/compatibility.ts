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

// Danh sách hàng có mùi nặng/đặc thù
const STRONG_SMELL_GOODS = [
  "sầu riêng",
  "durian",
  "hải sản tươi",
  "hải sản tươi sống",
  "seafood",
  "mắm tôm",
  "hóa chất",
  "xăng",
  "dầu diesel",
  "mỡ động vật",
  "cá khô",
  "mực khô",
];

// Danh sách hàng dễ hấp thụ mùi
const ODOR_SENSITIVE_GOODS = [
  "rau xanh",
  "rau cuống",
  "rau cải",
  "dưa chuột",
  "chuối",
  "sơn",
  "bánh kẹo",
  "sữa",
  "trái cây",
  "rau quả",
  "thực phẩm chín",
  "nước uống",
];

// Bản đồ xung đột hàng hóa: key -> list of incompatible goods
const INCOMPATIBLE_GOODS_MAP: Record<string, string[]> = {
  "sầu riêng": [
    "rau xanh",
    "rau cuống",
    "rau cải",
    "dưa chuột",
    "chuối",
    "bánh kẹo",
    "sữa",
    "trái cây",
    "rau quả",
  ],
  durian: [
    "rau xanh",
    "rau cuống",
    "rau cải",
    "dưa chuột",
    "chuối",
    "bánh kẹo",
    "sữa",
    "trái cây",
    "rau quả",
  ],
  "hải sản tươi": [
    "rau xanh",
    "rau cuống",
    "rau cải",
    "dưa chuột",
    "chuối",
    "bánh kẹo",
    "sữa",
    "trái cây",
  ],
  "hải sản tươi sống": [
    "rau xanh",
    "rau cuống",
    "rau cải",
    "dưa chuột",
    "chuối",
    "bánh kẹo",
    "sữa",
    "trái cây",
  ],
  seafood: [
    "rau xanh",
    "rau cuống",
    "rau cải",
    "dưa chuột",
    "chuối",
    "bánh kẹo",
    "sữa",
    "trái cây",
  ],
  "mắm tôm": ["rau xanh", "bánh kẹo", "sữa", "trái cây"],
  "hóa chất": ["thực phẩm chín", "rau quả", "sữa"],
  xăng: ["thực phẩm", "rau quả", "sữa"],
  "dầu diesel": ["thực phẩm", "rau quả", "sữa"],
  "mỡ động vật": ["rau cuống", "rau cải"],
  "cá khô": ["bánh kẹo", "sữa"],
  "mực khô": ["bánh kẹo", "sữa"],
};

function normalizeGoodsType(goods: string): string {
  return goods.toLowerCase().trim();
}

function checkGoodsConflict(
  currentGoodsList: string[],
  newGoods: string,
): { hasConflict: boolean; conflictItems: string[] } {
  const normalizedNew = normalizeGoodsType(newGoods);
  const conflictItems: string[] = [];

  for (const currentGoods of currentGoodsList) {
    const normalizedCurrent = normalizeGoodsType(currentGoods);

    // Check if new goods are in the incompatible list of current goods
    const incompatibleList = INCOMPATIBLE_GOODS_MAP[normalizedCurrent] || [];
    if (
      incompatibleList.some(
        (item) => normalizeGoodsType(item) === normalizedNew,
      )
    ) {
      conflictItems.push(normalizedCurrent);
    }

    // Check if current goods are in the incompatible list of new goods
    const newGoodsIncompatible = INCOMPATIBLE_GOODS_MAP[normalizedNew] || [];
    if (
      newGoodsIncompatible.some(
        (item) => normalizeGoodsType(item) === normalizedCurrent,
      )
    ) {
      conflictItems.push(normalizedCurrent);
    }
  }

  return {
    hasConflict: conflictItems.length > 0,
    conflictItems: [...new Set(conflictItems)],
  };
}

export function evaluateCompatibility(
  cargo: CargoDeclaration,
  truck: TruckCapabilities,
  existingShipments?: CargoDeclaration[],
) {
  const warnings: string[] = [];
  const conflicts: { type: string; conflictingWith: string[] }[] = [];
  let score = 100;

  // 1. Kiểm tra tải trọng
  if (cargo.weightKg > truck.remainingKg) {
    warnings.push("Tải trọng vượt quá khả năng chở của xe");
    score -= 35;
  }

  // 2. Kiểm tra nhiệt độ
  if (
    (cargo.frozenRequired || cargo.specialTemperature) &&
    !truck.refrigerated
  ) {
    warnings.push("Xe không có hệ thống lạnh");
    score -= 35;
  }

  if (truck.refrigerated && truck.tempMin != null && truck.tempMax != null) {
    // Xe đạt yêu cầu khi nhiệt độ thực tế của xe [tempMin, tempMax] nằm TRONG
    // khoảng nhiệt độ mà lô hàng chấp nhận được [requiredTempMin, requiredTempMax].
    const supported =
      cargo.requiredTempMin <= truck.tempMin &&
      cargo.requiredTempMax >= truck.tempMax;
    if (!supported) {
      warnings.push(
        `Khoảng nhiệt độ ${cargo.requiredTempMin}°C - ${cargo.requiredTempMax}°C không phù hợp với xe`,
      );
      score -= 28;
    }
  }

  // 3. Kiểm tra xung đột mùi (Goods Conflict)
  if (existingShipments && existingShipments.length > 0) {
    const existingGoods = existingShipments.map((s) => s.cargoType);
    const conflict = checkGoodsConflict(existingGoods, cargo.cargoType);

    if (conflict.hasConflict) {
      const conflictList = conflict.conflictItems.join(", ");
      warnings.push(
        `⚠️ Cảnh báo: Xe đang chở ${conflictList}. Việc ghép thêm ${cargo.cargoType} có thể gây ám mùi, hư hỏng hàng hóa!`,
      );
      conflicts.push({
        type: "goods_odor_conflict",
        conflictingWith: conflict.conflictItems,
      });
      score -= 25;
    }
  }

  // 4. Kiểm tra mùi nặng đơn lẻ
  const hasStrongSmell =
    cargo.strongSmell ||
    STRONG_SMELL_GOODS.some((smell) =>
      normalizeGoodsType(cargo.cargoType).includes(normalizeGoodsType(smell)),
    );

  if (hasStrongSmell && existingShipments?.length) {
    // Check if there are odor-sensitive goods already in truck
    const hasOdorSensitive = existingShipments.some((s) =>
      ODOR_SENSITIVE_GOODS.some((sens) =>
        normalizeGoodsType(s.cargoType).includes(normalizeGoodsType(sens)),
      ),
    );

    if (hasOdorSensitive && conflicts.length === 0) {
      warnings.push(
        "Hàng có mùi nặng có thể ảnh hưởng đến hàng hóa khác trên xe",
      );
      score -= 15;
    }
  }

  // 5. Kiểm tra hàng dễ vỡ
  if (cargo.fragile && cargo.weightKg > 1200) {
    warnings.push("Hàng dễ vỡ với khối lượng lớn cần thận trọng");
    score -= 12;
  }

  // 6. Kiểm tra quy định kết hợp
  if (cargo.allowCombine === false) {
    warnings.push("Không nên ghép hàng này với các đơn khác");
    score -= 15;
  }

  // 7. Kiểm tra hải sản đông lạnh
  if (cargo.category === "Hải sản" && cargo.requiredTempMax > 2) {
    warnings.push("Hải sản nên giữ ở nhiệt độ gần 0°C hoặc dưới");
    score -= 12;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status:
      conflicts.length > 0 ? "CONFLICT" : warnings.length ? "WARNING" : "SAFE",
    warnings,
    conflicts,
  };
}
