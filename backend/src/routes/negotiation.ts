import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
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
  shipmentId: z.string(),
  truckId: z.string(),
  proposedPrice: z.coerce.number().int().positive(),
  message: z.string().optional(),
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
 */
negotiationRouter.post(
  "/deals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { shipmentId, truckId, proposedPrice, message } =
      createDealSchema.parse(req.body);

    // Verify shipment exists and belongs to user (for shippers)
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new HttpError(404, "Shipment not found");
    }

    // Verify truck exists
    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
    });

    if (!truck) {
      throw new HttpError(404, "Truck not found");
    }

    // Determine initiator role based on user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const initiatorRole = user?.role === "SHIPPER" ? "SHIPPER" : "CARRIER";

    const { deal, firstRound } = await createDealWithNegotiation(
      shipmentId,
      truckId,
      proposedPrice,
      initiatorRole,
      req.user.id,
      message
    );

    res.json({
      success: true,
      dealId: deal.id,
      roundId: firstRound.id,
      deal,
      firstRound,
      message: `Negotiation started. ${initiatorRole} proposes ${proposedPrice} VND`,
    });
  })
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

    res.json({
      deal,
      summary,
    });
  })
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

    // Verify deal
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    // Determine respondent role
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const respondentRole = user?.role === "SHIPPER" ? "SHIPPER" : "CARRIER";

    const result = await respondToNegotiation(
      roundId,
      counterPrice,
      respondentRole,
      message
    );

    if (result.dealAccepted) {
      res.json({
        success: true,
        dealAccepted: true,
        finalPrice: counterPrice,
        message: `Negotiation completed! Final price: ${counterPrice} VND`,
        round: result.round,
        deal: result.deal,
      });
    } else {
      res.json({
        success: true,
        dealAccepted: false,
        message: `Counter-offer proposed: ${counterPrice} VND`,
        currentRound: result.round,
        nextRound: result.nextRound,
      });
    }
  })
);

/**
 * Accept proposed price
 */
negotiationRouter.post(
  "/deals/:dealId/rounds/:roundId/accept",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { dealId, roundId } = req.params;

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new HttpError(404, "Deal not found");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const acceptorRole = user?.role === "SHIPPER" ? "SHIPPER" : "CARRIER";

    const result = await acceptProposedPrice(roundId, acceptorRole);

    res.json({
      success: true,
      message: `Negotiation completed! Price accepted: ${result.deal.finalPrice} VND`,
      deal: result.deal,
      finalPrice: result.deal.finalPrice,
    });
  })
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
  })
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
  })
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
  })
);
