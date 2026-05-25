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

/**
 * Analyze order completeness based on current data
 */
export function analyzeOrderCompleteness(
  data: OrderData
): CompletionAnalysis {
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
  analysis: CompletionAnalysis
): AssistantQuestion | null {
  if (analysis.isComplete) {
    return null;
  }

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
      options: ["TP.HCM", "Da Nang", "Ha Noi", "Da Lat", "Nha Trang", "Can Tho"],
      required: true,
    },
    dropoff: {
      question: "Địa điểm giao hàng? (Tỉnh/TP)",
      fieldName: "dropoff",
      type: "select",
      options: ["TP.HCM", "Da Nang", "Ha Noi", "Da Lat", "Nha Trang", "Can Tho"],
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

  if (data.frozenRequired && data.requiredTempMax !== undefined && data.requiredTempMax > 2) {
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
  userMessage: string
) {
  // Build update object dynamically
  const updateData: any = {};

  // Handle type conversions
  if (fieldName === "weightKg" || fieldName === "requiredTempMin" || fieldName === "requiredTempMax" || fieldName === "proposedPrice") {
    updateData[fieldName] = parseInt(value, 10);
  } else if (fieldName === "deliveryTime") {
    updateData[fieldName] = new Date(value);
  } else if (fieldName === "strongSmell" || fieldName === "fragile" || fieldName === "frozenRequired" || fieldName === "specialTemperature" || fieldName === "allowCombine") {
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
  userId: string
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
      `Order is incomplete. Missing: ${analysis.missingFields.join(", ")}`
    );
  }

  // Default values for optional fields
  const pickupLat = session.pickupLat ?? 11.94;
  const pickupLng = session.pickupLng ?? 108.45;
  const dropoffLat = session.dropoffLat ?? 10.82;
  const dropoffLng = session.dropoffLng ?? 106.63;
  const allowCombine = session.allowCombine ?? true;

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
