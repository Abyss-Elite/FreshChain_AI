import { prisma } from "../utils/prisma.js";
import { NegotiationRoundStatus } from "@prisma/client";

export interface CreateDealRequest {
  shipmentId: string;
  truckId: string;

  /**
   * Optional:
   * - Nếu có -> dùng giá custom
   * - Nếu không -> fallback shipment.proposedPrice
   */
  initiatorPrice?: number;

  initiatorRole: "SHIPPER" | "CARRIER";

  message?: string;
}

export interface ProposeCounterRequest {
  roundId: string;
  counterPrice: number;
  respondentRole: "SHIPPER" | "CARRIER";
  message?: string;
}

export async function createDealWithNegotiation(
  shipmentId: string,
  truckId: string,
  initiatorPrice: number | undefined,
  initiatorRole: "SHIPPER" | "CARRIER",
  ownerId: string,
  message?: string,
) {
  // Get shipment price for quick match fallback
  const shipment = await prisma.shipment.findUnique({
    where: {
      id: shipmentId,
    },

    select: {
      id: true,
      proposedPrice: true,
      status: true,
    },
  });

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  /**
   * Quick Match:
   * Nếu client không truyền giá
   * -> tự động lấy shipment.proposedPrice
   */
  const initialPrice = initiatorPrice ?? shipment.proposedPrice;

  if (!initialPrice || initialPrice <= 0) {
    throw new Error("Invalid initial negotiation price");
  }

  return prisma.$transaction(async (tx) => {
    /**
     * Prevent duplicate active negotiations
     */
    const existingDeal = await tx.deal.findFirst({
      where: {
        shipmentId,
        truckId,
        finalPrice: null,
      },
    });

    if (existingDeal) {
      throw new Error(
        "An active negotiation already exists for this shipment and truck",
      );
    }

    /**
     * Create deal
     */
    const deal = await tx.deal.create({
      data: {
        shipmentId,
        truckId,
        ownerId,
      },
    });

    /**
     * Create Round 1
     */
    const firstRound = await tx.negotiationRound.create({
      data: {
        dealId: deal.id,

        roundNumber: 1,

        proposedPrice: initialPrice,

        proposedBy: initiatorRole,

        message:
          message ||
          (initiatorPrice == null
            ? "Quick match using shipment proposed price"
            : "Custom proposed price"),

        status: NegotiationRoundStatus.WAITING_FOR_COUNTER,
      },
    });

    /**
     * Update shipment status
     * để frontend auto re-render
     */
    await tx.shipment.update({
      where: {
        id: shipmentId,
      },

      data: {
        status: "NEGOTIATING",
      },
    });

    return {
      deal,
      firstRound,

      /**
       * FE dùng để hiển thị UI phù hợp
       */
      priceSource:
        initiatorPrice == null ? "shipment_proposed_price" : "custom_price",
    };
  });
}

/**
 * Get deal with all negotiation rounds
 */
export async function getDealWithRounds(dealId: string) {
  return prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      shipment: true,
      truck: true,
      owner: true,
      negotiationRounds: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Respond to negotiation round
 */
export async function respondToNegotiation(
  roundId: string,
  counterPrice: number,
  respondentRole: "SHIPPER" | "CARRIER",
  message?: string,
) {
  const round = await prisma.negotiationRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error("Negotiation round not found");
  }

  if (round.status !== NegotiationRoundStatus.WAITING_FOR_COUNTER) {
    throw new Error("This round is not waiting for a counter");
  }

  // Update current round
  const updatedRound = await prisma.negotiationRound.update({
    where: { id: roundId },
    data: {
      respondedPrice: counterPrice,
      respondedBy: respondentRole,
      responseMessage: message,
      status: NegotiationRoundStatus.RESPONDED,
      respondedAt: new Date(),
    },
  });

  // Check if price is accepted (prices match)
  if (counterPrice === round.proposedPrice) {
    // Deal accepted
    const deal = await prisma.deal.update({
      where: { id: round.dealId },
      data: {
        finalPrice: counterPrice,
      },
    });

    return {
      round: updatedRound,
      dealAccepted: true,
      deal,
    };
  }

  // Create next round with counter-offer
  const nextRound = await prisma.negotiationRound.create({
    data: {
      dealId: round.dealId,
      roundNumber: round.roundNumber + 1,
      proposedPrice: counterPrice,
      proposedBy: respondentRole,
      message: `Counter: ${counterPrice}. ${message || ""}`,
      status: NegotiationRoundStatus.WAITING_FOR_COUNTER,
    },
  });

  return {
    round: updatedRound,
    dealAccepted: false,
    nextRound,
  };
}

/**
 * Accept a proposed price
 */
export async function acceptProposedPrice(
  roundId: string,
  acceptorRole: "SHIPPER" | "CARRIER",
) {
  const round = await prisma.negotiationRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error("Negotiation round not found");
  }

  // Update round status
  const updatedRound = await prisma.negotiationRound.update({
    where: { id: roundId },
    data: {
      respondedBy: acceptorRole,
      responseMessage: "Accepted",
      status: NegotiationRoundStatus.COMPLETED,
      respondedAt: new Date(),
    },
  });

  // Update deal with final price
  const deal = await prisma.deal.update({
    where: { id: round.dealId },
    data: {
      finalPrice: round.proposedPrice,
      status: "ACCEPTED",
    },
  });

  return {
    round: updatedRound,
    deal,
  };
}

/**
 * Get all active negotiations for a shipment
 */
export async function getShipmentNegotiations(shipmentId: string) {
  const deals = await prisma.deal.findMany({
    where: { shipmentId },
    include: {
      shipment: true,
      truck: true,
      owner: true,
      negotiationRounds: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return deals;
}

/**
 * Get negotiation summary
 */
export async function getNegotiationSummary(dealId: string) {
  const deal = await getDealWithRounds(dealId);

  if (!deal) {
    throw new Error("Deal not found");
  }

  const latestRound = deal.negotiationRounds[deal.negotiationRounds.length - 1];

  return {
    dealId: deal.id,
    currentRound: latestRound.roundNumber,
    totalRounds: deal.negotiationRounds.length,
    initialPrice: deal.negotiationRounds[0].proposedPrice,
    currentProposedPrice: latestRound.proposedPrice,
    lastCounterPrice: latestRound.respondedPrice,
    status: latestRound.status,
    finalPrice: deal.finalPrice,
    priceHistory: deal.negotiationRounds.map((r) => ({
      round: r.roundNumber,
      proposed: r.proposedPrice,
      counter: r.respondedPrice,
      by: r.proposedBy,
    })),
    rounds: deal.negotiationRounds,
  };
}

/**
 * Reject a negotiation
 */
export async function rejectNegotiation(dealId: string, reason?: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  // Get latest round
  const latestRound = await prisma.negotiationRound.findFirst({
    where: { dealId },
    orderBy: { createdAt: "desc" },
  });

  // Update latest round
  if (latestRound) {
    await prisma.negotiationRound.update({
      where: { id: latestRound.id },
      data: {
        status: NegotiationRoundStatus.COMPLETED,
        responseMessage: `Rejected${reason ? ": " + reason : ""}`,
        respondedAt: new Date(),
      },
    });
  }

  // Update deal status
  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: {
      status: "REJECTED",
    },
  });

  return updatedDeal;
}
