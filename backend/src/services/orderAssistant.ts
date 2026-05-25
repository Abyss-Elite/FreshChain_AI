import { OrderAssistantSession, AssistantSessionStatus } from "@prisma/client";
import { prisma } from "../utils/prisma.js";

// Define required fields for a complete order
const REQUIRED_FIELDS = [
  "cargoType",
  "category",
  "weightKg",
  "requiredTempMin",
  "requiredTempMax",
  "pickup",
  "dropoff",
  "deliveryTime",
  "proposedPrice",
];

const OPTIONAL_BUT_IMPORTANT = [
  "strongSmell",
  "fragile",
  "frozenRequired",
  "specialTemperature",
  "notes",
];

interface OrderData {
  cargoType?: string;
  category?: string;
  weightKg?: number;
  requiredTempMin?: number;
  requiredTempMax?: number;
  pickup?: string;
  dropoff?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
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

export interface CompletionAnalysis {
  completenessScore: number; // 0-100
  missingFields: string[];
  isComplete: boolean;
  summary: string;
}

export interface AssistantQuestion {
  question: string;
  fieldName: string;
  type: "text" | "number" | "date" | "select" | "checkbox";
  options?: string[];
  placeholder?: string;
  required: boolean;
}

// Map tọa độ quy chuẩn đồng bộ với cấu trúc file seed hệ thống
export const vietnamLogisticsLocations = [
  "Hà Nội",
  "Cao Bằng",
  "Tuyên Quang",
  "Điện Biên",
  "Lai Châu",
  "Sơn La",
  "Lào Cai",
  "Thái Nguyên",
  "Lạng Sơn",
  "Quảng Ninh",
  "Bắc Ninh",
  "Phú Thọ",
  "Hải Phòng",
  "Hưng Yên",
  "Ninh Bình",
  "Thanh Hóa",
  "Nghệ An",
  "Hà Tĩnh",
  "Quảng Trị",
  "Huế",
  "Đà Nẵng",
  "Quảng Ngãi",
  "Gia Lai",
  "Khánh Hòa",
  "Đắk Lắk",
  "Lâm Đồng",
  "Đồng Nai",
  "Hồ Chí Minh",
  "Tây Ninh",
  "Đồng Tháp",
  "Vĩnh Long",
  "An Giang",
  "Cần Thơ",
  "Cà Mau",
] as const;

// Định nghĩa kiểu dữ liệu dựa trên mảng có sẵn của bạn để đảm bảo type-safe 100%
export type VietnamLocation = (typeof vietnamLogisticsLocations)[number];

export const vietnamLogisticsCoordinates: Record<
  VietnamLocation,
  { lat: number; lng: number }
> = {
  // Miền Bắc
  "Hà Nội": { lat: 21.0285, lng: 105.8542 },
  "Cao Bằng": { lat: 22.6669, lng: 106.2576 },
  "Tuyên Quang": { lat: 21.8229, lng: 105.2162 },
  "Điện Biên": { lat: 21.3853, lng: 103.0134 },
  "Lai Châu": { lat: 22.3908, lng: 103.4682 },
  "Sơn La": { lat: 21.3259, lng: 103.9126 },
  "Lào Cai": { lat: 22.4842, lng: 103.9614 },
  "Thái Nguyên": { lat: 21.5939, lng: 105.8454 },
  "Lạng Sơn": { lat: 21.8519, lng: 106.7592 },
  "Quảng Ninh": { lat: 20.9497, lng: 107.0701 },
  "Bắc Ninh": { lat: 21.1861, lng: 106.0763 },
  "Phú Thọ": { lat: 21.3225, lng: 105.4019 },
  "Hải Phòng": { lat: 20.8449, lng: 106.6881 },
  "Hưng Yên": { lat: 20.6465, lng: 106.0511 },
  "Ninh Bình": { lat: 20.2548, lng: 105.9754 },

  // Miền Trung / Tây Nguyên
  "Thanh Hóa": { lat: 19.8076, lng: 105.7753 },
  "Nghệ An": { lat: 18.6735, lng: 105.6814 },
  "Hà Tĩnh": { lat: 18.3392, lng: 105.9059 },
  "Quảng Trị": { lat: 16.7424, lng: 107.1824 },
  Huế: { lat: 16.4637, lng: 107.5909 },
  "Đà Nẵng": { lat: 16.0471, lng: 108.2068 },
  "Quảng Ngãi": { lat: 15.1205, lng: 108.7924 },
  "Gia Lai": { lat: 13.9822, lng: 108.0063 },
  "Khánh Hòa": { lat: 12.2388, lng: 109.1967 },
  "Đắk Lắk": { lat: 12.6662, lng: 108.0382 },
  "Lâm Đồng": { lat: 11.9404, lng: 108.4583 },

  // Miền Nam / Miền Tây
  "Đồng Nai": { lat: 10.9574, lng: 106.8427 },
  "Hồ Chí Minh": { lat: 10.8231, lng: 106.6297 },
  "Tây Ninh": { lat: 11.3129, lng: 106.1246 },
  "Đồng Tháp": { lat: 10.4578, lng: 105.6424 },
  "Vĩnh Long": { lat: 10.2524, lng: 105.9723 },
  "An Giang": { lat: 10.3725, lng: 105.4328 },
  "Cần Thơ": { lat: 10.0452, lng: 105.7469 },
  "Cà Mau": { lat: 9.1769, lng: 105.1524 },
};

/**
 * Analyze order completeness based on current data
 */
export function analyzeOrderCompleteness(data: OrderData): CompletionAnalysis {
  const missingFields: string[] = [];
  let filledFields = 0;

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const value = data[field as keyof OrderData];
    if (value === null || value === undefined || value === "") {
      missingFields.push(field);
    } else {
      filledFields++;
    }
  }

  // Count filled optional fields
  for (const field of OPTIONAL_BUT_IMPORTANT) {
    const value = data[field as keyof OrderData];
    if (value !== null && value !== undefined && value !== "") {
      filledFields++;
    }
  }

  const totalFields = REQUIRED_FIELDS.length + OPTIONAL_BUT_IMPORTANT.length;
  const completenessScore = Math.round((filledFields / totalFields) * 100);
  const isComplete = missingFields.length === 0;

  return {
    completenessScore,
    missingFields,
    isComplete,
    summary: isComplete
      ? "Đơn hàng của bạn đã hoàn chỉnh. Hãy kiểm tra lại thông tin."
      : `Cần thêm ${missingFields.length} thông tin: ${missingFields.join(", ")}`,
  };
}

/**
 * Generate optimal follow-up question based on missing fields
 */
export function generateNextQuestion(
  analysis: CompletionAnalysis,
): AssistantQuestion | null {
  if (analysis.isComplete) {
    return null;
  }

  // Chuyển mảng readonly thành mảng string thông thường cho trường options
  const locationOptions = [...vietnamLogisticsLocations];

  // Priority order for questions
  const questionMap: Record<string, AssistantQuestion> = {
    cargoType: {
      question:
        "Loại hàng hóa của bạn là gì? (vd: Rau củ quả, Hải sản, Nông sản, v.v.)",
      fieldName: "cargoType",
      type: "select",
      options: [
        "Rau củ quả",
        "Hải sản",
        "Trái cây",
        "Thịt/Gia cầm",
        "Nông sản khác",
        "Khác",
      ],
      required: true,
    },
    category: {
      question:
        "Phân loại chi tiết hàng hóa? (vd: Rau sạch, Cá tươi, Cam, v.v.)",
      fieldName: "category",
      type: "text",
      placeholder: "Nhập phân loại chi tiết",
      required: true,
    },
    weightKg: {
      question: "Khối lượng hàng hóa là bao nhiêu kg?",
      fieldName: "weightKg",
      type: "number",
      placeholder: "Ví dụ: 500",
      required: true,
    },
    requiredTempMin: {
      question: "Nhiệt độ tối thiểu cần duy trì? (°C)",
      fieldName: "requiredTempMin",
      type: "number",
      placeholder: "Ví dụ: 2",
      required: true,
    },
    requiredTempMax: {
      question: "Nhiệt độ tối đa cần duy trì? (°C)",
      fieldName: "requiredTempMax",
      type: "number",
      placeholder: "Ví dụ: 8",
      required: true,
    },
    pickup: {
      question: "Địa điểm lấy hàng? (Tỉnh/TP)",
      fieldName: "pickup",
      type: "select",
      options: locationOptions, // ĐÃ SỬA: Đưa toàn bộ danh sách 34 tỉnh thành vào giao diện
      required: true,
    },
    dropoff: {
      question: "Địa điểm giao hàng? (Tỉnh/TP)",
      fieldName: "dropoff",
      type: "select",
      options: locationOptions, // ĐÃ SỬA: Đưa toàn bộ danh sách 34 tỉnh thành vào giao diện
      required: true,
    },
    deliveryTime: {
      question: "Thời gian giao hàng dự kiến?",
      fieldName: "deliveryTime",
      type: "date",
      required: true,
    },
    proposedPrice: {
      question: "Giá dịch vụ dự kiến? (VND)",
      fieldName: "proposedPrice",
      type: "number",
      placeholder: "Ví dụ: 500000",
      required: true,
    },
    strongSmell: {
      question:
        "Hàng hóa có mùi mạnh không? (sẽ ảnh hưởng khả năng kết hợp với hàng khác)",
      fieldName: "strongSmell",
      type: "checkbox",
      required: false,
    },
    fragile: {
      question: "Hàng hóa dễ vỡ/hỏng không?",
      fieldName: "fragile",
      type: "checkbox",
      required: false,
    },
    frozenRequired: {
      question: "Cần bảo quản đông lạnh?",
      fieldName: "frozenRequired",
      type: "checkbox",
      required: false,
    },
    specialTemperature: {
      question:
        "Hàng có yêu cầu nhiệt độ/bảo quản đặc biệt (vệ sinh, lây nhiễm chéo) không?",
      fieldName: "specialTemperature",
      type: "checkbox",
      required: false,
    },
    allowCombine: {
      question:
        "Bạn có cho phép ghép chung đơn này với các chuyến hàng khác không?",
      fieldName: "allowCombine",
      type: "checkbox",
      required: false,
    },
  };

  // Return first missing field question
  for (const field of analysis.missingFields) {
    if (questionMap[field]) {
      return questionMap[field];
    }
  }

  return null;
}

export function buildCompatibilityWarnings(data: OrderData) {
  const warnings: string[] = [];

  if (data.strongSmell) {
    warnings.push(
      "Hàng mùi mạnh, nên tránh ghép chung với hàng dễ nhiễm mùi hoặc vệ sinh kém",
    );
  }

  if (
    data.frozenRequired &&
    data.requiredTempMax !== undefined &&
    data.requiredTempMax > 2
  ) {
    warnings.push(
      "Hàng đông lạnh cần giữ nhiệt độ dưới 2°C; nếu không có xe lạnh phù hợp sẽ dễ hư hỏng",
    );
  }

  if (data.specialTemperature) {
    warnings.push(
      "Hàng yêu cầu nhiệt độ/bảo quản đặc biệt; cần xe chuyên dụng và điều kiện vệ sinh cao",
    );
  }

  if (data.fragile && data.weightKg !== undefined && data.weightKg > 1200) {
    warnings.push(
      "Hàng dễ vỡ lớn, cần vận chuyển cẩn thận và hạn chế ghép chung với hàng nặng khác",
    );
  }

  if (data.allowCombine === false) {
    warnings.push(
      "Yêu cầu không ghép chung đơn hàng; hãy đảm bảo đơn này được vận chuyển riêng hoặc theo điều kiện riêng biệt",
    );
  }

  if (data.cargoType?.toLowerCase().includes("sau rieng")) {
    warnings.push(
      "Sầu riêng có mùi mạnh, dễ ảnh hưởng đến hàng hóa khác nếu vận chuyển ghép chung",
    );
  }

  return warnings;
}

/**
 * Create a new assistant session
 */
export async function createAssistantSession(userId: string) {
  return prisma.orderAssistantSession.create({
    data: {
      userId,
      status: AssistantSessionStatus.ACTIVE,
      completenessScore: 0,
      missingFields: REQUIRED_FIELDS,
    },
    include: {
      conversationHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Get or create assistant session
 */
export async function getOrCreateAssistantSession(userId: string) {
  let session = await prisma.orderAssistantSession.findFirst({
    where: {
      userId,
      status: AssistantSessionStatus.ACTIVE,
    },
    include: {
      conversationHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    session = await createAssistantSession(userId);
  }

  return session;
}

/**
 * Update session with user response
 */
export async function updateSessionWithResponse(
  sessionId: string,
  fieldName: string,
  value: any,
  userMessage: string,
) {
  // Build update object dynamically
  const updateData: any = {};

  // Handle type conversions
  if (
    fieldName === "weightKg" ||
    fieldName === "requiredTempMin" ||
    fieldName === "requiredTempMax" ||
    fieldName === "proposedPrice"
  ) {
    updateData[fieldName] = parseInt(value, 10);
  } else if (fieldName === "deliveryTime") {
    updateData[fieldName] = new Date(value);
  } else if (
    fieldName === "strongSmell" ||
    fieldName === "fragile" ||
    fieldName === "frozenRequired" ||
    fieldName === "specialTemperature" ||
    fieldName === "allowCombine"
  ) {
    updateData[fieldName] = value === true || value === "true";
  } else {
    updateData[fieldName] = value;
  }

  const session = await prisma.orderAssistantSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Analyze completeness after update
  const currentData = {
    cargoType: updateData.cargoType || session.cargoType,
    category: updateData.category || session.category,
    weightKg: updateData.weightKg ?? session.weightKg,
    requiredTempMin: updateData.requiredTempMin ?? session.requiredTempMin,
    requiredTempMax: updateData.requiredTempMax ?? session.requiredTempMax,
    pickup: updateData.pickup || session.pickup,
    dropoff: updateData.dropoff || session.dropoff,
    deliveryTime: updateData.deliveryTime || session.deliveryTime,
    proposedPrice: updateData.proposedPrice ?? session.proposedPrice,
    notes: updateData.notes || session.notes,
    fragile: updateData.fragile ?? session.fragile,
    strongSmell: updateData.strongSmell ?? session.strongSmell,
    frozenRequired: updateData.frozenRequired ?? session.frozenRequired,
    specialTemperature:
      updateData.specialTemperature ?? session.specialTemperature,
    allowCombine: updateData.allowCombine ?? session.allowCombine,
  };

  const analysis = analyzeOrderCompleteness(currentData);

  // Update session
  const updatedSession = await prisma.orderAssistantSession.update({
    where: { id: sessionId },
    data: {
      ...updateData,
      completenessScore: analysis.completenessScore,
      missingFields: analysis.missingFields,
      conversationHistory: {
        create: {
          role: "user",
          content: userMessage,
        },
      },
    },
    include: {
      conversationHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Generate next question or message
  let nextMessage = "";
  const nextQuestion = generateNextQuestion(analysis);

  if (nextQuestion) {
    nextMessage = nextQuestion.question;
  } else {
    nextMessage =
      "Cảm ơn! Thông tin của bạn đã hoàn chỉnh. Hãy kiểm tra lại toàn bộ đơn hàng trước khi gửi.";
  }

  // Add assistant message
  await prisma.assistantMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: nextMessage,
      suggestedFields: nextQuestion ? [nextQuestion.fieldName] : [],
    },
  });

  return {
    session: updatedSession,
    analysis,
    nextQuestion,
    nextMessage,
  };
}

/**
 * Submit order from assistant session
 */
export async function submitOrderFromSession(
  sessionId: string,
  userId: string,
) {
  const session = await prisma.orderAssistantSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const analysis = analyzeOrderCompleteness({
    cargoType: session.cargoType || undefined,
    category: session.category || undefined,
    weightKg: session.weightKg || undefined,
    requiredTempMin: session.requiredTempMin || undefined,
    requiredTempMax: session.requiredTempMax || undefined,
    pickup: session.pickup || undefined,
    dropoff: session.dropoff || undefined,
    deliveryTime: session.deliveryTime || undefined,
    proposedPrice: session.proposedPrice || undefined,
    notes: session.notes || undefined,
    strongSmell: session.strongSmell ?? undefined,
    fragile: session.fragile ?? undefined,
    frozenRequired: session.frozenRequired ?? undefined,
    specialTemperature: session.specialTemperature ?? undefined,
    allowCombine: session.allowCombine ?? undefined,
    compatibilityNote: session.compatibilityNote || undefined,
  });

  if (!analysis.isComplete) {
    throw new Error(
      `Order is incomplete. Missing: ${analysis.missingFields.join(", ")}`,
    );
  }

  // =========================================================================
  // 🔧 REFACTOR: CƠ CHẾ ƯU TIÊN TẠO ĐỘ - ĐỤC BUỘC THỨ TỰ CHÍNH XÁC
  // =========================================================================
  // Lý do: Nullish coalescing (??) có thể ưu tiên giá trị cũ trong session
  //        nếu không kiểm tra chặt chẽ
  //
  // ✅ ƯU TIÊN 1: Luôn tra cứu từ vietnamLogisticsCoordinates trước
  // ✅ ƯU TIÊN 2: Nếu map không có → dùng session custom (session.pickupLat)
  // ✅ ƯU TIÊN 3: Nếu cả 2 không có → dùng fallback mặc định cứng
  // =========================================================================

  const allowCombine = session.allowCombine ?? true;

  // Chuẩn hóa tên địa điểm để đảm bảo khớp với map (xóa khoảng trắng)
  const pickupLocation = (session.pickup?.trim() || "") as VietnamLocation;
  const dropoffLocation = (session.dropoff?.trim() || "") as VietnamLocation;

  // 📍 PICKUP COORDINATES
  // Lấy từ map trước tiên
  const pickupFromMap = vietnamLogisticsCoordinates[pickupLocation];

  // Nếu tìm thấy trong map → dùng map (ưu tiên 1)
  // Nếu không tìm thấy trong map → dùng session custom (ưu tiên 2)
  // Nếu cả session custom cũng không có → dùng fallback (ưu tiên 3)
  const pickupLat =
    pickupFromMap?.lat !== undefined
      ? pickupFromMap.lat
      : session.pickupLat !== null && session.pickupLat !== undefined
        ? session.pickupLat
        : 16.0471; // Fallback: Đà Nẵng

  const pickupLng =
    pickupFromMap?.lng !== undefined
      ? pickupFromMap.lng
      : session.pickupLng !== null && session.pickupLng !== undefined
        ? session.pickupLng
        : 108.2068; // Fallback: Đà Nẵng

  // 📍 DROPOFF COORDINATES
  // Lấy từ map trước tiên
  const dropoffFromMap = vietnamLogisticsCoordinates[dropoffLocation];

  // Nếu tìm thấy trong map → dùng map (ưu tiên 1)
  // Nếu không tìm thấy trong map → dùng session custom (ưu tiên 2)
  // Nếu cả session custom cũng không có → dùng fallback (ưu tiên 3)
  const dropoffLat =
    dropoffFromMap?.lat !== undefined
      ? dropoffFromMap.lat
      : session.dropoffLat !== null && session.dropoffLat !== undefined
        ? session.dropoffLat
        : 10.8231; // Fallback: TP.HCM

  const dropoffLng =
    dropoffFromMap?.lng !== undefined
      ? dropoffFromMap.lng
      : session.dropoffLng !== null && session.dropoffLng !== undefined
        ? session.dropoffLng
        : 106.6297; // Fallback: TP.HCM
  // =========================================================================

  // Create shipment
  const shipment = await prisma.shipment.create({
    data: {
      ownerId: userId,
      cargoType: session.cargoType!,
      category: session.category!,
      weightKg: session.weightKg!,
      requiredTempMin: session.requiredTempMin!,
      requiredTempMax: session.requiredTempMax!,
      pickup: session.pickup!,
      dropoff: session.dropoff!,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      deliveryTime: session.deliveryTime!,
      proposedPrice: session.proposedPrice!,
      notes: session.notes || undefined,
      strongSmell: session.strongSmell ?? false,
      fragile: session.fragile ?? false,
      frozenRequired: session.frozenRequired ?? false,
      specialTemperature: session.specialTemperature ?? false,
      allowCombine,
      compatibilityNote: session.compatibilityNote || undefined,
    },
  });

  // Mark session as completed
  await prisma.orderAssistantSession.update({
    where: { id: sessionId },
    data: {
      status: AssistantSessionStatus.SUBMITTED,
      submittedShipmentId: shipment.id,
      submittedAt: new Date(),
    },
  });

  return shipment;
}

/**
 * Get session review data
 */
export async function getSessionReviewData(sessionId: string) {
  const session = await prisma.orderAssistantSession.findUnique({
    where: { id: sessionId },
    include: {
      conversationHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const summary: OrderData = {
    cargoType: session.cargoType ?? undefined,
    category: session.category ?? undefined,
    weightKg: session.weightKg ?? undefined,
    requiredTempMin: session.requiredTempMin ?? undefined,
    requiredTempMax: session.requiredTempMax ?? undefined,
    pickup: session.pickup ?? undefined,
    dropoff: session.dropoff ?? undefined,
    deliveryTime: session.deliveryTime ?? undefined,
    proposedPrice: session.proposedPrice ?? undefined,
    notes: session.notes ?? undefined,
    strongSmell: session.strongSmell ?? undefined,
    fragile: session.fragile ?? undefined,
    frozenRequired: session.frozenRequired ?? undefined,
    specialTemperature: session.specialTemperature ?? undefined,
    allowCombine: session.allowCombine ?? undefined,
    compatibilityNote: session.compatibilityNote ?? undefined,
  };

  return {
    summary,
    compatibilityWarnings: buildCompatibilityWarnings(summary),
    completenessScore: session.completenessScore,
    conversationHistory: session.conversationHistory,
  };
}
