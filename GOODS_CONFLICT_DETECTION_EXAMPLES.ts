/**
 * EXAMPLE: Goods Conflict Detection System
 * Demonstrates how the backend detects incompatible goods
 * and generates warnings for the frontend
 */

// ============================================
// SCENARIO 1: Durian on Truck + Vegetables Order
// ============================================

const scenario1 = {
  name: "Sầu riêng trên xe + Đơn rau xanh mới",

  truck: {
    id: "truck_001",
    plateNumber: "51A-999.99",
    type: "Xe lạnh",
    maxCapacityKg: 1000,
    remainingKg: 300, // ✨ Tải còn lại 300kg
    refrigerated: true,
    tempMin: 2,
    tempMax: 18,
    currentRoute: "Đà Lạt → TP.HCM",
    // 📦 Xe đã chở:
    // - Sầu riêng 700kg (mùi nặng!)
  },

  newShipment: {
    id: "ship_001",
    cargoType: "Rau xanh", // ← Dễ hấp thụ mùi!
    category: "Nông sản",
    weightKg: 200,
    requiredTempMin: 5,
    requiredTempMax: 15,
    pickup: "Đà Lạt",
    dropoff: "TP.HCM",
    proposedPrice: 1_200_000,
  },

  // Backend calculation:
  backendLogic: `
    // 1. Lấy hàng hiện có trên xe
    const existingShipments = [
      { cargoType: "Sầu riêng", ... }
    ];
    
    // 2. Gọi hàm xử lý
    const compatibility = evaluateCompatibility(
      cargo: newShipment,
      truck: truck,
      existingShipments: existingShipments  // 👈 QUAN TRỌNG!
    );
    
    // 3. Hàm checkGoodsConflict() chạy:
    const conflict = checkGoodsConflict(
      ["Sầu riêng"],  // Hàng hiện có
      "Rau xanh"      // Hàng mới
    );
    // Kết quả: { hasConflict: true, conflictItems: ["Sầu riêng"] }
    
    // 4. Thêm warning vào array
    warnings.push("⚠️ Cảnh báo: Xe đang chở sầu riêng. Việc ghép thêm rau xanh có thể gây ám mùi, hư hỏng hàng hóa!");
    conflicts.push({ type: "goods_odor_conflict", conflictingWith: ["Sầu riêng"] });
    score -= 25;  // Giảm điểm tương thích
  `,

  result: {
    matchingScore: 68, // ← Giảm từ 93 xuống 68 vì xung đột!
    compatibilityScore: 60,
    warnings: [
      "⚠️ Cảnh báo: Xe đang chở sầu riêng. Việc ghép thêm rau xanh có thể gây ám mùi, hư hỏng hàng hóa!",
    ],
    conflicts: [
      {
        type: "goods_odor_conflict",
        conflictingWith: ["Sầu riêng"],
      },
    ],
  },

  frontendUI: `
    Matching Card hiển thị:
    ┌──────────────────────────────────────┐
    │ ⚠️ Cảnh báo xung đột hàng hóa         │
    │ ⚠️ Xe đang chở sầu riêng. Việc ghép   │
    │    thêm rau xanh có thể gây ám mùi... │
    └──────────────────────────────────────┘
    
    Rau xanh | Đà Lạt → TP.HCM
    68% phù hợp [amber badge]
    
    [Tải còn lại] [Tải %] [Giá] [Trạng thái]
    200kg       | 30%   | ...  | Sẵn sàng
    
    [Ô nhập giá...          ]
    
    [✓ Chấp nhận ghép] [💬 Thương lượng giá]
    
    ℹ️ Nếu bạn chấp nhận ghép, cũng sẽ cảnh báo người nhận.
  `,
};

// ============================================
// SCENARIO 2: Seafood + Candy (Incompatible)
// ============================================

const scenario2 = {
  name: "Hải sản tươi trên xe + Đơn bánh kẹo mới",

  truck: {
    id: "truck_002",
    remainingKg: 400,
    currentRoute: "Nha Trang → TP.HCM",
    // 📦 Xe đã chở: Hải sản tươi sống 600kg (mùi nặng + cần lạnh!)
  },

  newShipment: {
    cargoType: "Bánh kẹo", // ← Dễ hấp thụ mùi + không cần lạnh
    weightKg: 350,
    requiredTempMin: 20, // Nhiệt độ phòng
    requiredTempMax: 25,
  },

  backendCheck: `
    // Kiểm tra 1: Tải trọng
    ✅ 350kg <= 400kg (tải còn lại) → PASS
    
    // Kiểm tra 2: Tuyến đường con
    ✅ Bánh (Nha Trang → TP.HCM) ⊂ Xe (Nha Trang → TP.HCM) → PASS
    
    // Kiểm tra 3: Nhiệt độ
    ❌ Bánh cần 20-25°C, nhưng xe lạnh chỉ hỗ trợ 2-18°C
    → FAIL: Temperature Conflict (score -= 35)
    
    // Kiểm tra 4: Xung đột hàng hóa
    ❌ "Hải sản tươi sống" × "Bánh kẹo" → CONFLICT
    → checkGoodsConflict() trả về: { hasConflict: true, conflictItems: ["Hải sản tươi"] }
    → score -= 25
  `,

  result: {
    matchingScore: 35, // ← RẤT THẤP: 2 lỗi lớn!
    compatibilityScore: 35,
    warnings: [
      "Khoảng nhiệt độ 20°C - 25°C không phù hợp với xe",
      "⚠️ Cảnh báo: Xe đang chở hải sản tươi. Việc ghép thêm bánh kẹo có thể gây ám mùi, hư hỏng hàng hóa!",
    ],
    conflicts: [
      {
        type: "goods_odor_conflict",
        conflictingWith: ["Hải sản tươi"],
      },
    ],
  },

  frontendUI: `
    Matching Card:
    ┌──────────────────────────────────────┐
    │ ⚠️ Cảnh báo xung đột hàng hóa         │
    │ ⚠️ Xe đang chở hải sản tươi. Việc...  │
    └──────────────────────────────────────┘
    
    35% phù hợp [red badge] ← ĐIỂM RẤT THẤP!
  `,
};

// ============================================
// SCENARIO 3: Compatible Goods (No Conflict)
// ============================================

const scenario3 = {
  name: "Rau xanh trên xe + Đơn rau xanh khác",

  truck: {
    remainingKg: 800,
    currentRoute: "Đà Lạt → TP.HCM",
    // 📦 Xe đã chở: Rau xanh 200kg
  },

  newShipment: {
    cargoType: "Rau cuống", // ← Tương tự rau xanh, không xung đột
    weightKg: 600,
  },

  backendCheck: `
    // Kiểm tra xung đột:
    const conflict = checkGoodsConflict(
      ["Rau xanh"],     // Hàng hiện có
      "Rau cuống"       // Hàng mới
    );
    
    // Rau xanh ≠ Rau cuống, không trong INCOMPATIBLE_GOODS_MAP
    // → hasConflict: false ✅
    
    // Không có xung đột, điểm cao!
    score = 100 (base)
    // - Không giảm vì tải trọng OK
    // - Không giảm vì tuyến đường OK
    // - Không giảm vì KHÔNG có xung đột
    matchingScore = 92 (cao!)
  `,

  result: {
    matchingScore: 92, // ← CAO!
    compatibilityScore: 100, // ← TỐI ĐA!
    warnings: [], // ← KHÔNG CÓ CẢNH BÁO
    conflicts: [], // ← KHÔNG CÓ XUNG ĐỘT
  },

  frontendUI: `
    Matching Card: (KHÔNG CÓ BANNER VÀNG!)
    
    Rau cuống | Đà Lạt → TP.HCM
    92% phù hợp [green badge] ✅
    
    Có thể ghép [green checkmark]
  `,
};

// ============================================
// DATA STRUCTURES
// ============================================

/**
 * Bản đồ xung đột hàng hóa (Incompatibility Map)
 * Nếu xe đã chở hàng trong KEY, không nên thêm hàng trong VALUE
 */
const INCOMPATIBLE_GOODS_MAP = {
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
  "mắm tôm": ["rau xanh", "bánh kẹo", "sữa", "trái cây"],
  "hóa chất": ["thực phẩm chín", "rau quả", "sữa"],
  // ... nhiều hơn nữa trong compatibility.ts
};

/**
 * Danh sách hàng có mùi nặng
 */
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

/**
 * Danh sách hàng dễ hấp thụ mùi
 */
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

// ============================================
// FUNCTION: Check Goods Conflict
// ============================================

function checkGoodsConflict(
  currentGoodsList: string[], // Hàng hiện có trên xe
  newGoods: string, // Hàng mới muốn thêm
): {
  hasConflict: boolean;
  conflictItems: string[];
} {
  const normalizedNew = newGoods.toLowerCase().trim();
  const conflictItems: string[] = [];

  for (const currentGoods of currentGoodsList) {
    const normalizedCurrent = currentGoods.toLowerCase().trim();

    // Kiểm tra chiều 1: currentGoods → incompatible với newGoods?
    const incompatibleList = INCOMPATIBLE_GOODS_MAP[normalizedCurrent] || [];
    if (incompatibleList.some((item) => item.toLowerCase() === normalizedNew)) {
      conflictItems.push(normalizedCurrent);
    }

    // Kiểm tra chiều 2: newGoods → incompatible với currentGoods?
    const newGoodsIncompatible = INCOMPATIBLE_GOODS_MAP[normalizedNew] || [];
    if (
      newGoodsIncompatible.some(
        (item) => item.toLowerCase() === normalizedCurrent,
      )
    ) {
      conflictItems.push(normalizedCurrent);
    }
  }

  return {
    hasConflict: conflictItems.length > 0,
    conflictItems: [...new Set(conflictItems)], // Loại bỏ duplicates
  };
}

// ============================================
// INTEGRATION: Using in evaluateCompatibility
// ============================================

function evaluateCompatibility(
  cargo: CargoDeclaration,
  truck: TruckCapabilities,
  existingShipments?: CargoDeclaration[], // 👈 QUAN TRỌNG!
) {
  const warnings: string[] = [];
  const conflicts: any[] = [];
  let score = 100;

  // ... Các kiểm tra khác ...

  // 🎯 KIỂM TRA XUNG ĐỘT HÀNG HÓA
  if (existingShipments && existingShipments.length > 0) {
    const existingGoods = existingShipments.map((s) => s.cargoType);
    const conflict = checkGoodsConflict(existingGoods, cargo.cargoType);

    if (conflict.hasConflict) {
      const conflictList = conflict.conflictItems.join(", ");
      warnings.push(
        `⚠️ Cảnh báo: Xe đang chở ${conflictList}. ` +
          `Việc ghép thêm ${cargo.cargoType} có thể gây ám mùi, hư hỏng hàng hóa!`,
      );
      conflicts.push({
        type: "goods_odor_conflict",
        conflictingWith: conflict.conflictItems,
      });
      score -= 25; // Giảm 25 điểm
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status:
      conflicts.length > 0 ? "CONFLICT" : warnings.length ? "WARNING" : "SAFE",
    warnings,
    conflicts,
  };
}

/**
 * ============================================
 * FRONTEND INTEGRATION EXAMPLE
 * ============================================
 *
 * Backend API Response:
 * GET /api/shipments/ship_001/matches
 *
 * {
 *   "matches": [
 *     {
 *       "truck": { ... },
 *       "matchingScore": 68,
 *       "warnings": [
 *         "⚠️ Cảnh báo: Xe đang chở sầu riêng. Việc ghép thêm rau xanh..."
 *       ],
 *       "conflicts": [
 *         { type: "goods_odor_conflict", conflictingWith: ["Sầu riêng"] }
 *       ]
 *     }
 *   ]
 * }
 *
 * Frontend MatchingCard:
 * - Kiểm tra: match.conflicts.length > 0?
 * - Nếu có: Hiển thị banner vàng
 * - Vẫn cho phép "Chấp nhận ghép" (không vô hiệu hóa)
 * - Người dùng biết rủi ro nhưng vẫn có thể tiếp tục
 */

export {
  scenario1,
  scenario2,
  scenario3,
  INCOMPATIBLE_GOODS_MAP,
  STRONG_SMELL_GOODS,
  ODOR_SENSITIVE_GOODS,
  checkGoodsConflict,
  evaluateCompatibility,
};
