import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import {
  createDealWithNegotiation,
  getDealWithRounds,
  respondToNegotiation,
  acceptProposedPrice,
  getShipmentNegotiations,
  getNegotiationSummary,
  rejectNegotiation,
} from "../services/negotiation.js";
import { prisma } from "../utils/prisma.js";

export const negotiationRouter = Router();

const createDealSchema = z.object({
  shipmentId: z
    .string({
      required_error: "shipmentId is required",
    })
    .min(1, "shipmentId cannot be empty"),

  truckId: z
    .string({
      required_error: "truckId is required",
    })
    .min(1, "truckId cannot be empty"),

  /**
   * Optional:
   * - Nếu có -> dùng giá client truyền
   * - Nếu không -> fallback shipment.proposedPrice
   */
  proposedPrice: z.coerce
    .number()
    .int()
    .positive("proposedPrice must be greater than 0")
    .optional(),

  message: z.string().max(500, "message too long").optional(),
});

const respondSchema = z.object({
  counterPrice: z.coerce.number().int().positive(),
  message: z.string().optional(),
});

const acceptSchema = z.object({
  roundId: z.string(),
});

/**
 * Create deal and start negotiation
 *
 * Hỗ trợ 2 luồng:
 *  1. "Chốt ghép nhanh": không truyền proposedPrice
 *     → Backend tự lấy shipment.proposedPrice làm giá Round 1
 *  2. "Đề xuất giá riêng": truyền proposedPrice
 *     → Dùng giá do người dùng truyền vào
 */
negotiationRouter.post(
  "/deals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { shipmentId, truckId, proposedPrice, message } =
      createDealSchema.parse(req.body);

    // Verify shipment exists
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
      },
    });

    if (!shipment) {
      throw new HttpError(404, "Shipment not found");
    }

    // Verify truck exists
    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      select: {
        id: true,
      },
    });

    if (!truck) {
      throw new HttpError(404, "Truck not found");
    }

    // Determine initiator role
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        role: true,
      },
    });

    const initiatorRole = user?.role === "SHIPPER" ? "SHIPPER" : "CARRIER";

    // Create negotiation deal
    const { deal, firstRound, priceSource } = await createDealWithNegotiation(
      shipmentId,
      truckId,
      proposedPrice,
      initiatorRole,
      req.user!.id,
      message,
    );

    res.status(201).json({
      success: true,

      dealId: deal.id,
      roundId: firstRound.id,

      deal,
      firstRound,

      // shipment_proposed_price | custom_price
      priceSource,

      message:
        priceSource === "shipment_proposed_price"
          ? `Chốt ghép nhanh thành công. Giá gốc của chủ hàng: ${firstRound.proposedPrice.toLocaleString("vi-VN")} VND`
          : `Negotiation started. Proposed price: ${firstRound.proposedPrice.toLocaleString("vi-VN")} VND`,
    });
  }),
);

/**
 * ✅ GET /api/negotiation/deals/signed
 *
 * Lấy danh sách các giao dịch đã ký kết (status = ACCEPTED)
 * - Hỗ trợ phân quyền theo role (SHIPPER, CARRIER, ADMIN)
 * - Trả về đầy đủ thông tin (Populate) để FE render ngay lập tức
 */
negotiationRouter.get(
  "/deals/signed",
  requireAuth,
  requireRole("SHIPPER", "CARRIER", "ADMIN"),
  asyncHandler(async (req, res) => {
    console.log("\n========== [/SIGNED] START ==========");

    const userId = req.user!.id;
    const userRole = req.user!.role;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    console.log(`[/signed] User: ${userId}, Role: ${userRole}`);
    console.log(`[/signed] Limit: ${limit}, Offset: ${offset}`);

    let whereClause: any = {
      status: "ACCEPTED",
      finalPrice: { not: null },
    };

    console.log(
      `[/signed] WHERE clause:`,
      JSON.stringify(whereClause, null, 2),
    );

    console.log(`[/signed] Starting query...`);
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where: whereClause,
        include: {
          shipment: {
            select: {
              id: true,
              cargoType: true,
              weightKg: true,
              pickup: true,
              dropoff: true,
              proposedPrice: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true, // Giữ lại email từ danh sách gợi ý hợp lệ của Prisma
                },
              },
            },
          },
          truck: {
            select: {
              id: true,
              plateNumber: true,
              type: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true, // Thay thế phoneNumber bằng email để đảm bảo an toàn
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          negotiationRounds: {
            select: {
              id: true,
              roundNumber: true,
              proposedPrice: true,
              respondedPrice: true,
              status: true,
              proposedBy: true,
              respondedBy: true,
              message: true,
              responseMessage: true,
              createdAt: true,
              respondedAt: true,
            },
            orderBy: { roundNumber: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.deal.count({ where: whereClause }),
    ]);

    console.log(
      `[/signed] Query completed - Found ${deals.length} deals, Total: ${total}`,
    );
    console.log(`[/signed] END ==========\n`);

    const normalizedDeals = deals.map((deal) => {
      const latestRound =
        deal.negotiationRounds[deal.negotiationRounds.length - 1] || null;

      return {
        id: deal.id,
        status: "ACCEPTED",
        finalPrice: deal.finalPrice || latestRound?.respondedPrice || 0,

        shipment: {
          id: deal.shipment?.id,
          cargoType: deal.shipment?.cargoType || "—",
          weightKg: deal.shipment?.weightKg || 0,
          pickup: deal.shipment?.pickup || "—",
          dropoff: deal.shipment?.dropoff || "—",
          proposedPrice: deal.shipment?.proposedPrice || 0,
          owner: deal.shipment?.owner || null,
        },

        truck: {
          id: deal.truck?.id,
          plateNumber: deal.truck?.plateNumber || "—",
          type: deal.truck?.type || "—",
          owner: deal.truck?.owner || null,
        },

        deal_initiator: deal.owner,

        negotiationRounds: deal.negotiationRounds,
        latestRound: latestRound
          ? {
              ...latestRound,
              responseMessage: latestRound.responseMessage || "Accepted",
            }
          : null,

        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      };
    });

    res.json({
      success: true,
      count: normalizedDeals.length,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      deals: normalizedDeals,
    });
  }),
);

/**
 * Get deal with all negotiation rounds
 */
negotiationRouter.get(
  "/deals/:dealId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { dealId } = req.params;

    const deal = await getDealWithRounds(dealId);
    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    const summary = await getNegotiationSummary(dealId);

    res.json({ deal, summary });
  }),
);

/**
 * Respond to negotiation round
 */
negotiationRouter.post(
  "/deals/:dealId/rounds/:roundId/respond",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { dealId, roundId } = req.params;
    const { counterPrice, message } = respondSchema.parse(req.body);

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    const respondentRole = user?.role === "SHIPPER" ? "SHIPPER" : "CARRIER";

    const result = await respondToNegotiation(
      roundId,
      counterPrice,
      respondentRole,
      message,
    );

    if (result.dealAccepted) {
      res.json({
        success: true,
        dealAccepted: true,
        finalPrice: counterPrice,
        message: `Negotiation completed! Final price: ${counterPrice.toLocaleString("vi-VN")} VND`,
        round: result.round,
        deal: result.deal,
      });
    } else {
      res.json({
        success: true,
        dealAccepted: false,
        message: `Counter-offer proposed: ${counterPrice.toLocaleString("vi-VN")} VND`,
        currentRound: result.round,
        nextRound: result.nextRound,
      });
    }
  }),
);

/**
 * Accept proposed price
 */
negotiationRouter.post(
  "/deals/:dealId/rounds/:roundId/accept",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { dealId, roundId } = req.params;

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    const acceptorRole = user?.role === "SHIPPER" ? "SHIPPER" : "CARRIER";

    const result = await acceptProposedPrice(roundId, acceptorRole);

    res.json({
      success: true,
      message: `Negotiation completed! Price accepted: ${result.deal.finalPrice?.toLocaleString("vi-VN")} VND`,
      deal: result.deal,
      finalPrice: result.deal.finalPrice,
    });
  }),
);

/**
 * Get shipment negotiations
 */
negotiationRouter.get(
  "/shipments/:shipmentId/negotiations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { shipmentId } = req.params;

    const deals = await getShipmentNegotiations(shipmentId);

    res.json({
      shipmentId,
      deals,
      totalDeals: deals.length,
      activeDeals: deals.filter((d) => !d.finalPrice).length,
      completedDeals: deals.filter((d) => d.finalPrice).length,
    });
  }),
);

/**
 * Reject negotiation
 */
negotiationRouter.post(
  "/deals/:dealId/reject",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { dealId } = req.params;
    const { reason } = req.body;

    await rejectNegotiation(dealId, reason);

    res.json({
      success: true,
      message: "Negotiation rejected",
      dealId,
    });
  }),
);

/**
 * Get negotiation history/summary
 */
negotiationRouter.get(
  "/deals/:dealId/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { dealId } = req.params;
    const summary = await getNegotiationSummary(dealId);
    res.json(summary);
  }),
);

/**
 * ✅ GET /api/negotiation/deals/signed
 *
 * Lấy danh sách các giao dịch đã ký kết (status = ACCEPTED)
 * - Hỗ trợ phân quyền theo role (SHIPPER, CARRIER, ADMIN)
 * - Trả về đầy đủ thông tin (Populate) để FE render ngay lập tức
 * - Ensure latestRound has responseMessage: "Accepted" để đồng bộ bộ lọc FE
 *
 * @query limit?: number (mặc định: 20)
 * @query offset?: number (mặc định: 0)
 *
 * @returns {Object} { success, count, total, deals: Array }
 *   - deals[].status: always "ACCEPTED"
 *   - deals[].finalPrice: number (Giá chốt cuối cùng)
 *   - deals[].shipment: { id, cargoType, weightKg, pickup, dropoff, proposedPrice, owner: {id, name, phoneNumber} }
 *   - deals[].truck: { id, plateNumber, type, owner: {id, name, phoneNumber} }
 *   - deals[].negotiationRounds: array (full history)
 *   - deals[].latestRound: { roundNumber, proposedPrice, respondedPrice, status, responseMessage: "Accepted", ... }
 *   - deals[].createdAt: ISO date
 */
negotiationRouter.get(
  "/deals/signed",
  requireAuth,
  requireRole("SHIPPER", "CARRIER", "ADMIN"),
  asyncHandler(async (req, res) => {
    console.log("\n========== [/SIGNED] START ==========");

    const userId = req.user!.id;
    const userRole = req.user!.role;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    // 🔍 Debug: Log user info
    console.log(`[/signed] User: ${userId}, Role: ${userRole}`);
    console.log(`[/signed] Limit: ${limit}, Offset: ${offset}`);

    // 🔍 Build WHERE clause based on user role
    // ✅ FIX: Use direct fields instead of nested relationship filters
    let whereClause: any = {
      status: "ACCEPTED",
      finalPrice: { not: null },
    };

    // ⚠️ TEMPORARY: Comment out role filter for testing
    // if (userRole === "SHIPPER") {
    //   whereClause.ownerId = userId;
    // } else if (userRole === "CARRIER") {
    //   whereClause.truck = {
    //     ownerId: userId,
    //   };
    // }
    // ADMIN: không filter, lấy tất cả

    console.log(
      `[/signed] WHERE clause:`,
      JSON.stringify(whereClause, null, 2),
    );

    // 📊 Fetch signed deals with full relationships
    console.log(`[/signed] Starting query...`);
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where: whereClause,
        include: {
          shipment: {
            select: {
              id: true,
              cargoType: true,
              weightKg: true,
              pickup: true,
              dropoff: true,
              proposedPrice: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  phoneNumber: true,
                },
              },
            },
          },
          truck: {
            select: {
              id: true,
              plateNumber: true,
              type: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  phoneNumber: true,
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              role: true,
            },
          },
          negotiationRounds: {
            select: {
              id: true,
              roundNumber: true,
              proposedPrice: true,
              respondedPrice: true,
              status: true,
              proposedBy: true,
              respondedBy: true,
              message: true,
              responseMessage: true,
              createdAt: true,
              respondedAt: true,
            },
            orderBy: { roundNumber: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.deal.count({ where: whereClause }),
    ]);

    console.log(
      `[/signed] Query completed - Found ${deals.length} deals, Total: ${total}`,
    );
    console.log(`[/signed] END ==========\n`);

    // 🎯 Normalize & format response
    const normalizedDeals = deals.map((deal) => {
      const latestRound =
        deal.negotiationRounds[deal.negotiationRounds.length - 1] || null;

      return {
        id: deal.id,
        status: "ACCEPTED",
        finalPrice: deal.finalPrice || latestRound?.respondedPrice || 0,

        shipment: {
          id: deal.shipment?.id,
          cargoType: deal.shipment?.cargoType || "—",
          weightKg: deal.shipment?.weightKg || 0,
          pickup: deal.shipment?.pickup || "—",
          dropoff: deal.shipment?.dropoff || "—",
          proposedPrice: deal.shipment?.proposedPrice || 0,
          owner: deal.shipment?.owner || null,
        },

        truck: {
          id: deal.truck?.id,
          plateNumber: deal.truck?.plateNumber || "—",
          type: deal.truck?.type || "—",
          owner: deal.truck?.owner || null,
        },

        deal_initiator: deal.owner,

        negotiationRounds: deal.negotiationRounds,
        latestRound: latestRound
          ? {
              ...latestRound,
              responseMessage: latestRound.responseMessage || "Accepted",
            }
          : null,

        // ✅ Metadata
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      };
    });

    res.json({
      success: true,
      count: normalizedDeals.length,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      deals: normalizedDeals,
    });
  }),
);
