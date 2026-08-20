import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { prisma } from "../utils/prisma.js";

export const signedDealsRouter = Router();

/**
 * ✅ GET /api/negotiation/deals/signed
 *
 * Lấy danh sách các giao dịch đã ký kết (finalPrice != null)
 * - Hỗ trợ phân quyền theo role (SHIPPER, CARRIER, ADMIN)
 * - Trả về đầy đủ thông tin (Populate) để FE render ngay lập tức
 *
 * @query filter?: "all" | "sent" | "received" (mặc định: "all")
 * @query limit?: number (mặc định: 20)
 * @query offset?: number (mặc định: 0)
 *
 * @returns {Array} Danh sách deals với status = ACCEPTED và finalPrice != null
 */
signedDealsRouter.get(
  "/signed",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role; // "SHIPPER" | "CARRIER" | "ADMIN"
    const filter = (req.query.filter as string) || "all";
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    // 🔍 Build WHERE clause based on user role
    let whereClause: any = {
      finalPrice: { not: null }, // ✅ Chỉ lấy deals đã chốt (có finalPrice)
    };

    if (userRole === "SHIPPER") {
      // Shipper (chủ xe): lấy deals do chính mình tạo
      whereClause.ownerId = userId;
    } else if (userRole === "CARRIER") {
      // Carrier (chủ hàng): lấy deals liên quan đến shipments của mình
      whereClause.shipment = {
        ownerId: userId,
      };
    }
    // ADMIN: không filter, lấy tất cả

    // 📊 Fetch signed deals
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
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
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
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.deal.count({ where: whereClause }),
    ]);

    // 🎯 Normalize & format response
    const normalizedDeals = deals.map((deal) => {
      const latestRound =
        deal.negotiationRounds[deal.negotiationRounds.length - 1];

      return {
        id: deal.id,
        status: "ACCEPTED", // ✅ Cứng là ACCEPTED vì đã filter finalPrice != null
        finalPrice: deal.finalPrice,

        shipment: {
          id: deal.shipment?.id,
          cargoType: deal.shipment?.cargoType || "—",
          weightKg: deal.shipment?.weightKg || 0,
          pickup: deal.shipment?.pickup || "—",
          dropoff: deal.shipment?.dropoff || "—",
          proposedPrice: deal.shipment?.proposedPrice || 0,
          owner: deal.shipment?.owner,
        },

        truck: {
          id: deal.truck?.id,
          plateNumber: deal.truck?.plateNumber || "—",
          type: deal.truck?.type || "—",
          owner: deal.truck?.owner,
        },

        deal_initiator: deal.owner,

        negotiationRounds: deal.negotiationRounds,
        latestRound,

        // ✅ Metadata
        createdAt: deal.createdAt,
        updatedAt: deal.createdAt, // Deals đã chốt không cập nhật nữa
      };
    });

    res.json({
      success: true,
      filter,
      limit,
      offset,
      total,
      count: normalizedDeals.length,
      hasMore: offset + limit < total,
      data: normalizedDeals,
    });
  }),
);
