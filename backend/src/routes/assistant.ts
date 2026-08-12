import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import {
  getOrCreateAssistantSession,
  generateNextQuestion,
  analyzeOrderCompleteness,
  updateSessionWithResponse,
  submitOrderFromSession,
  getSessionReviewData,
} from "../services/orderAssistant.js";
import {
  executeCopilotSession,
  getCurrentCopilotSession,
  parseCopilotMessage,
  resetCopilotSession,
} from "../services/transportCopilot.js";
import {
  buildCopilotContext,
  createShipmentFromCopilotDraft,
  createTruckFromCopilotDraft,
} from "../services/logisticsCopilot.js";
import { prisma } from "../utils/prisma.js";

export const assistantRouter = Router();

const messageSchema = z.object({
  message: z.string().min(1),
  fieldName: z.string().optional(),
  value: z.any().optional(),
});

const submitOrderSchema = z.object({
  sessionId: z.string(),
});

const copilotParseSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  currentDateTime: z.string().optional(),
});

const copilotExecuteSchema = z.object({
  sessionId: z.string(),
  approved: z.boolean().default(true),
});

/**
 * Get or create assistant session
 */
assistantRouter.post(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    // SỬA LỖI: Thêm dấu ! sau req.user để khẳng định không bị undefined
    const session = await getOrCreateAssistantSession(req.user!.id);

    // Get next question if not complete
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
    });

    const nextQuestion = generateNextQuestion(analysis);

    res.json({
      sessionId: session.id,
      status: session.status,
      completenessScore: session.completenessScore,
      isComplete: analysis.isComplete,
      nextQuestion,
      summary: analysis.summary,
    });
  }),
);

/**
 * Send message to assistant (user response)
 */
assistantRouter.post(
  "/sessions/:sessionId/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { fieldName, value, message } = messageSchema.parse(req.body);

    // Verify session belongs to user
    const session = await prisma.orderAssistantSession.findUnique({
      where: { id: sessionId },
    });

    // SỬA LỖI: Thêm dấu ! sau req.user
    if (!session || session.userId !== req.user!.id) {
      throw new HttpError(403, "Unauthorized");
    }

    // Update session
    const result = await updateSessionWithResponse(
      sessionId,
      fieldName || "",
      value,
      message || value,
    );

    res.json({
      sessionId,
      analysis: result.analysis,
      nextQuestion: result.nextQuestion,
      nextMessage: result.nextMessage,
      completenessScore: result.session.completenessScore,
      isComplete: result.analysis.isComplete,
    });
  }),
);

/**
 * Get session review data
 */
assistantRouter.get(
  "/sessions/:sessionId/review",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await prisma.orderAssistantSession.findUnique({
      where: { id: sessionId },
    });

    // SỬA LỖI: Thêm dấu ! sau req.user
    if (!session || session.userId !== req.user!.id) {
      throw new HttpError(403, "Unauthorized");
    }

    const reviewData = await getSessionReviewData(sessionId);

    res.json({
      sessionId,
      ...reviewData,
    });
  }),
);

/**
 * Submit order from assistant session
 */
assistantRouter.post(
  "/sessions/:sessionId/submit",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await prisma.orderAssistantSession.findUnique({
      where: { id: sessionId },
    });

    // SỬA LỖI: Thêm dấu ! sau req.user
    if (!session || session.userId !== req.user!.id) {
      throw new HttpError(403, "Unauthorized");
    }

    try {
      // SỬA LỖI: Thêm dấu ! sau req.user
      const shipment = await submitOrderFromSession(sessionId, req.user!.id);

      res.json({
        success: true,
        message: "Order submitted successfully",
        shipmentId: shipment.id,
        shipment,
      });
    } catch (error: any) {
      throw new HttpError(400, error.message);
    }
  }),
);

/**
 * Get conversation history
 */
assistantRouter.get(
  "/sessions/:sessionId/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await prisma.orderAssistantSession.findUnique({
      where: { id: sessionId },
      include: {
        conversationHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // SỬA LỖI: Thêm dấu ! sau req.user
    if (!session || session.userId !== req.user!.id) {
      throw new HttpError(403, "Unauthorized");
    }

    res.json({
      sessionId,
      conversation: session.conversationHistory,
    });
  }),
);

/**
 * Start new session (reset current)
 */
assistantRouter.post(
  "/sessions/:sessionId/reset",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await prisma.orderAssistantSession.findUnique({
      where: { id: sessionId },
    });

    // SỬA LỖI: Thêm dấu ! sau req.user
    if (!session || session.userId !== req.user!.id) {
      throw new HttpError(403, "Unauthorized");
    }

    // Mark current as completed
    await prisma.orderAssistantSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
      },
    });

    // Create new session
    // SỬA LỖI: Thêm dấu ! sau req.user
    const newSession = await getOrCreateAssistantSession(req.user!.id);

    res.json({
      newSessionId: newSession.id,
      message: "New session started",
    });
  }),
);

assistantRouter.get(
  "/copilot/sessions/current",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId, draft, session } = await getCurrentCopilotSession(
      req.user!.id,
    );

    res.json({
      sessionId,
      status: session.copilotStatus,
      intent: session.copilotIntent || "UNKNOWN",
      approved: session.copilotApproved,
      api: session.copilotApi || null,
      method: session.copilotMethod || "POST",
      data: draft,
      missingFields: session.copilotMissingFields || [],
      validationErrors: session.copilotValidationErrors || [],
      confirmationMessage: session.copilotConfirmationMessage || null,
    });
  }),
);

assistantRouter.post(
  "/copilot/parse",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { message, sessionId, currentDateTime } = copilotParseSchema.parse(
      req.body,
    );

    const parsed = await parseCopilotMessage({
      userId: req.user!.id,
      userRole: req.user!.role,
      message,
      sessionId,
      currentDateTime,
    });

    res.json({
      sessionId: parsed.sessionId,
      context: parsed.context,
      message: parsed.message,
      rawInput: parsed.rawInput,
    });
  }),
);

assistantRouter.post(
  "/copilot/execute",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId, approved } = copilotExecuteSchema.parse(req.body);

    if (!approved) {
      return res.json({
        success: false,
        message: "Đã hủy thao tác tạo dữ liệu.",
      });
    }

    const result = await executeCopilotSession({
      userId: req.user!.id,
      userRole: req.user!.role,
      sessionId,
    });

    res.json(result);
  }),
);

assistantRouter.post(
  "/copilot/sessions/:sessionId/reset",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await resetCopilotSession(req.user!.id, sessionId);

    res.json({
      sessionId: session.id,
      status: session.copilotStatus,
      intent: session.copilotIntent || "UNKNOWN",
      approved: session.copilotApproved,
    });
  }),
);

assistantRouter.post(
  "/copilot/parse",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body: any = copilotParseSchema.parse(req.body);
    const { message, previousContext } = body;
    const role = req.user!.role;
    const context = buildCopilotContext(
      message,
      role,
      new Date().toISOString(),
    );

    const mergedData = {
      ...(previousContext || {}),
      ...context.data,
    };

    const hasRequiredFields =
      context.intent === "CREATE_TRUCK"
        ? [
            "type",
            "plateNumber",
            "maxCapacityKg",
            "remainingKg",
            "refrigerated",
            "currentRoute",
            "eta",
          ].every((field) => Boolean(mergedData[field]))
        : context.intent === "CREATE_SHIPMENT"
          ? [
              "cargoType",
              "category",
              "weightKg",
              "pickup",
              "dropoff",
              "deliveryTime",
              "proposedPrice",
            ].every((field) => Boolean(mergedData[field]))
          : false;

    const allowedRoles =
      context.intent === "CREATE_TRUCK"
        ? ["SHIPPER", "ADMIN"]
        : context.intent === "CREATE_SHIPMENT"
          ? ["CARRIER", "ADMIN"]
          : ["SHIPPER", "CARRIER", "ADMIN"];

    if (!allowedRoles.includes(role)) {
      throw new HttpError(403, "Bạn không có quyền thực hiện thao tác này.");
    }

    const responseContext = {
      ...context,
      data: mergedData,
      status: hasRequiredFields ? "AWAITING_APPROVAL" : context.status,
      missingFields:
        context.intent === "CREATE_TRUCK"
          ? [
              "type",
              "plateNumber",
              "maxCapacityKg",
              "remainingKg",
              "refrigerated",
              "currentRoute",
              "eta",
            ].filter((field) => !mergedData[field])
          : context.intent === "CREATE_SHIPMENT"
            ? [
                "cargoType",
                "category",
                "weightKg",
                "pickup",
                "dropoff",
                "deliveryTime",
                "proposedPrice",
              ].filter((field) => !mergedData[field])
            : ["intent"],
      confirmationMessage:
        hasRequiredFields && context.intent !== "UNKNOWN"
          ? context.intent === "CREATE_TRUCK"
            ? "Thông tin xe sắp được tạo. Bạn có xác nhận không?"
            : "Thông tin hàng hóa sắp được tạo. Bạn có xác nhận không?"
          : context.confirmationMessage,
    };

    const responseMessage =
      responseContext.status === "AWAITING_APPROVAL"
        ? responseContext.confirmationMessage ||
          "Bạn có xác nhận tạo dữ liệu này không?"
        : responseContext.status === "COLLECTING_DATA"
          ? "Cần bổ sung thêm thông tin để tiếp tục."
          : "Đã nhận thông tin của bạn.";

    res.json({
      context: responseContext,
      message: responseMessage,
    });
  }),
);

assistantRouter.post(
  "/copilot/execute",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body: any = copilotExecuteSchema.parse(req.body);
    const { intent, approved, draft } = body;
    const role = req.user!.role;

    if (!approved) {
      return res.json({
        success: false,
        message: "Đã hủy thao tác tạo dữ liệu.",
      });
    }

    if (intent === "CREATE_TRUCK") {
      if (!["SHIPPER", "ADMIN"].includes(role)) {
        throw new HttpError(403, "Bạn không có quyền thực hiện thao tác này.");
      }

      const truck = await createTruckFromCopilotDraft(req.user!.id, {
        type: draft?.type,
        plateNumber: draft?.plateNumber,
        maxCapacityKg: draft?.maxCapacityKg,
        remainingKg: draft?.remainingKg,
        refrigerated: draft?.refrigerated,
        tempMin: draft?.tempMin,
        tempMax: draft?.tempMax,
        currentRoute: draft?.currentRoute,
        eta: draft?.eta ? new Date(draft.eta) : undefined,
        currentLat: draft?.currentLat,
        currentLng: draft?.currentLng,
      });

      return res.json({
        success: true,
        message: "Xe đã được tạo thành công.",
        truck,
      });
    }

    if (intent === "CREATE_SHIPMENT") {
      if (!["CARRIER", "ADMIN"].includes(role)) {
        throw new HttpError(403, "Bạn không có quyền thực hiện thao tác này.");
      }

      const shipment = await createShipmentFromCopilotDraft(req.user!.id, {
        cargoType: draft?.cargoType,
        category: draft?.category,
        weightKg: draft?.weightKg,
        requiredTempMin: draft?.requiredTempMin,
        requiredTempMax: draft?.requiredTempMax,
        pickup: draft?.pickup,
        dropoff: draft?.dropoff,
        pickupLat: draft?.pickupLat,
        pickupLng: draft?.pickupLng,
        dropoffLat: draft?.dropoffLat,
        dropoffLng: draft?.dropoffLng,
        deliveryTime: draft?.deliveryTime
          ? new Date(draft.deliveryTime)
          : undefined,
        proposedPrice: draft?.proposedPrice,
        notes: draft?.notes,
        strongSmell: draft?.strongSmell,
        fragile: draft?.fragile,
        frozenRequired: draft?.frozenRequired,
        specialTemperature: draft?.specialTemperature,
        allowCombine: draft?.allowCombine,
        compatibilityNote: draft?.compatibilityNote,
      });

      return res.json({
        success: true,
        message: "Hàng hóa đã được tạo thành công.",
        shipment,
      });
    }

    return res.json({
      success: false,
      message: "Bạn muốn tạo mới xe chở hàng hay tạo mới hàng hóa?",
    });
  }),
);
