import { Server, Socket } from "socket.io";
import { getIOInstance } from "./io-manager.js";
import { prisma } from "../utils/prisma.js";

export { getIOInstance };

// Fetch và broadcast deals cho user
async function fetchAndBroadcastDeals(userId: string, userRole: string) {
  try {
    let deals;

    if (userRole === "SHIPPER") {
      deals = await prisma.deal.findMany({
        where: {
          OR: [{ truck: { ownerId: userId } }, { ownerId: userId }],
        },
        include: {
          shipment: true,
          truck: true,
          owner: { select: { id: true, name: true } },
          negotiationRounds: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (userRole === "CARRIER") {
      deals = await prisma.deal.findMany({
        where: {
          shipment: { ownerId: userId },
        },
        include: {
          shipment: true,
          truck: true,
          owner: { select: { id: true, name: true } },
          negotiationRounds: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      deals = await prisma.deal.findMany({
        include: {
          shipment: true,
          owner: true,
          truck: true,
          negotiationRounds: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    getIOInstance()
      .to("deals-room")
      .emit("deals:refreshed", { count: deals.length, deals });
  } catch (err) {
    console.error("Error fetching and broadcasting deals:", err);
  }
}

export function setupDealSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.emit("connected", { message: "FreshChain realtime connected" });

    // ============ DEAL EVENTS ============
    socket.on("deals:subscribe", () => {
      socket.join("deals-room");
      console.log(`${socket.id} subscribed to deals`);
    });

    socket.on("deals:unsubscribe", () => {
      socket.leave("deals-room");
      console.log(`${socket.id} unsubscribed from deals`);
    });

    // Request to refresh deals list
    socket.on(
      "deals:request-refresh",
      async (data: { userId: string; userRole: string }) => {
        console.log(
          `${socket.id} requested deals refresh for user ${data.userId}`,
        );
        await fetchAndBroadcastDeals(data.userId, data.userRole);
      },
    );

    // ============ NEGOTIATION EVENTS ============
    socket.on("negotiation:subscribe", (dealId: string) => {
      socket.join(`deal-${dealId}`);
      console.log(`${socket.id} subscribed to deal ${dealId}`);
    });

    socket.on("negotiation:unsubscribe", (dealId: string) => {
      socket.leave(`deal-${dealId}`);
      console.log(`${socket.id} unsubscribed from deal ${dealId}`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

// Broadcast helpers
export function broadcastDealCreated(deal: any) {
  try {
    const io = getIOInstance();
    io.to("deals-room").emit("deal:created", deal);
  } catch (err) {
    console.error("Error broadcasting deal:created:", err);
  }
}

export function broadcastDealUpdated(deal: any) {
  try {
    const io = getIOInstance();
    io.to("deals-room").emit("deal:updated", deal);
  } catch (err) {
    console.error("Error broadcasting deal:updated:", err);
  }
}

export function broadcastNegotiationRound(dealId: string, round: any) {
  try {
    const io = getIOInstance();
    io.to(`deal-${dealId}`).emit("negotiation:new-round", { dealId, round });
    io.to("deals-room").emit("deal:updated", {
      id: dealId,
      negotiationRounds: [round],
    });
  } catch (err) {
    console.error("Error broadcasting negotiation:new-round:", err);
  }
}

export function broadcastDealStatusChanged(
  dealId: string,
  status: string,
  finalPrice?: number,
) {
  try {
    const io = getIOInstance();
    io.to(`deal-${dealId}`).emit("deal:status-changed", {
      dealId,
      status,
      finalPrice,
    });
    io.to("deals-room").emit("deal:updated", {
      id: dealId,
      status,
      finalPrice,
    });
  } catch (err) {
    console.error("Error broadcasting deal:status-changed:", err);
  }
}
