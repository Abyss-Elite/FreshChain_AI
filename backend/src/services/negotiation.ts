import { prisma } from "../utils/prisma.js";
import { NegotiationRoundStatus } from "@prisma/client";

export interface CreateDealRequest {
  shipmentId: string;
  truckId: string;
  initiatorPrice: number;
  initiatorRole: "SHIPPER" | "CARRIER";
  message?: string;
}

export interface ProposeCounterRequest {
  roundId: string;
  counterPrice: number;
  respondentRole: "SHIPPER" | "CARRIER";
  message?: string;
}

/**
 * Create a new deal with initial price negotiation
 */
export async function createDealWithNegotiation(
  shipmentId: string,
  truckId: string,
  initiatorPrice: number,
  initiatorRole: "SHIPPER" | "CARRIER",
  ownerId: string,
  message?: string
) {
  // Create the deal
  const deal = await prisma.deal.create({
    data: {
      shipmentId,
      truckId,
      ownerId,
    },
  });

  // Create first negotiation round
  const firstRound = await prisma.negotiationRound.create({
    data: {
      dealId: deal.id,
      roundNumber: 1,
      proposedPrice: initiatorPrice,
      proposedBy: initiatorRole,
      message: message,
      status: NegotiationRoundStatus.WAITING_FOR_COUNTER,
    },
  });

  return {
    deal,
    firstRound,
  };
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
  message?: string
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
        status: "ACCEPTED",
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

  await prisma.deal.update({
    where: { id: round.dealId },
    data: { status: "COUNTERED" },
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
  acceptorRole: "SHIPPER" | "CARRIER"
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
      status: "ACCEPTED",
      finalPrice: round.proposedPrice,
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

  // Get the latest round
  const latestRound = await prisma.negotiationRound.findFirst({
    where: { dealId },
    orderBy: { createdAt: "desc" },
  });

  if (latestRound) {
    await prisma.negotiationRound.update({
      where: { id: latestRound.id },
      data: {
        status: NegotiationRoundStatus.COMPLETED,
        responseMessage: `Rejected${reason ? ": " + reason : ""}`,
      },
    });
  }

  await prisma.deal.update({
    where: { id: dealId },
    data: { status: "REJECTED" },
  });

  return deal;
}
