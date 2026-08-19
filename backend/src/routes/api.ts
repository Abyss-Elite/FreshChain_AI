import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  aggregateTrucks,
  isTruckEligibleForShipment,
  scoreTruck,
} from "../services/matching.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import { prisma } from "../utils/prisma.js";
import {
  getIOInstance,
  broadcastDealUpdated,
} from "../socket/deal-handlers.js";

export const apiRouter = Router();

const optionalText = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.trim() === "" ? undefined : value;
  }
  if (value === null) {
    return undefined;
  }
  return value;
}, z.string().optional());

const shipmentSchema = z.object({
  cargoType: z.string().min(2),
  category: z.string().min(2),
  weightKg: z.coerce.number().int().positive(),
  requiredTempMin: z.coerce.number().int(),
  requiredTempMax: z.coerce.number().int(),
  pickup: z.string().min(2),
  dropoff: z.string().min(2),
  pickupLat: z.coerce.number().default(11.94),
  pickupLng: z.coerce.number().default(108.45),
  dropoffLat: z.coerce.number().default(10.82),
  dropoffLng: z.coerce.number().default(106.63),
  deliveryTime: z.coerce.date(),
  proposedPrice: z.coerce.number().int().positive(),
  notes: optionalText,
  strongSmell: z.coerce.boolean().default(false),
  fragile: z.coerce.boolean().default(false),
  frozenRequired: z.coerce.boolean().default(false),
  specialTemperature: z.coerce.boolean().default(false),
  allowCombine: z.coerce.boolean().default(true),
  compatibilityNote: optionalText,
});

const truckSchema = z.object({
  type: z.string().min(2),
  plateNumber: z.string().min(5),
  maxCapacityKg: z.number().int().positive(), // Bỏ coerce nếu nhận JSON chuẩn
  remainingKg: z.number().int().nonnegative(), // Giữ số 0 không bị lỗi
  refrigerated: z.boolean(), // Nhận true/false chuẩn từ JSON
  tempMin: z.number().int().nullable().optional(), // Nhận số 0 an toàn
  tempMax: z.number().int().nullable().optional(),
  currentRoute: z.string().min(2),
  currentLat: z.number().default(11.94),
  currentLng: z.number().default(108.45),
  eta: z.coerce.date(), // Giữ lại coerce cho Date vì cần convert từ String ISO sang Date Object
});

apiRouter.get("/health", (_req, res) =>
  res.json({ ok: true, service: "FreshChain AI API" }),
);

apiRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [orders, activeTrucks, emptyTrucks, shipments] = await Promise.all([
      prisma.shipment.count(),
      prisma.truck.count({ where: { active: true } }),
      prisma.truck.count({ where: { remainingKg: { gt: 1000 } } }),
      prisma.shipment.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
    ]);
    res.json({
      stats: {
        orders,
        activeTrucks,
        emptyTrucks,
        loadOptimization: 82,
        savings: 186500000,
      },
      chart: [
        { day: "T2", shipments: 18, savings: 12 },
        { day: "T3", shipments: 22, savings: 15 },
        { day: "T4", shipments: 19, savings: 11 },
        { day: "T5", shipments: 31, savings: 21 },
        { day: "T6", shipments: 27, savings: 19 },
        { day: "T7", shipments: 35, savings: 24 },
      ],
      shipments,
    });
  }),
);

apiRouter.get(
  "/matching-context",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const role = req.user!.role; // SHIPPER = Chủ nhà xe, CARRIER = Chủ hàng

    if (role === "SHIPPER") {
      // 1. Lấy danh sách xe của chủ xe này, kèm theo các đơn hàng ĐÃ ĐƯỢC CHẤP NHẬN trên xe để tính tải lũy kế
      const myTrucks = await prisma.truck.findMany({
        where: { ownerId: userId },
        include: {
          deals: {
            where: { status: "ACCEPTED" },
            include: { shipment: true },
          },
        },
        orderBy: { eta: "asc" },
      });

      // 2. Lấy toàn bộ đơn hàng đang tìm xe trên hệ thống
      const publicShipments = await prisma.shipment.findMany({
        where: { status: "MATCHING" },
        orderBy: { createdAt: "desc" },
      });

      // Lấy chiếc xe đang được chọn để xét matching (Mặc định là chiếc đầu tiên nếu chưa chọn)
      const target = myTrucks[0] || null;
      let matches: any[] = [];

      if (target) {
        // Trích xuất danh sách các đơn hàng ĐÃ CÓ sẵn trên xe target này
        const currentShipmentsOnTruck = target.deals.map(
          (d: any) => d.shipment,
        );

        matches = publicShipments
          .filter((shipment) =>
            isTruckEligibleForShipment(
              shipment,
              target,
              currentShipmentsOnTruck,
            ),
          )
          .map((shipment) => {
            const scoring = scoreTruck(
              shipment,
              target,
              currentShipmentsOnTruck,
            );
            return {
              shipment,
              truck: target,
              matchingScore: scoring.matchingScore,
              warnings: scoring.warnings, // Trả về mảng cảnh báo kỵ hàng (nếu có)
            };
          })
          .sort((a, b) => b.matchingScore - a.matchingScore);
      }

      return res.json({ role, myTrucks, publicShipments, target, matches });
    }

    if (role === "CARRIER") {
      // 1. Chủ hàng lấy danh sách đơn hàng của chính mình
      const myShipments = await prisma.shipment.findMany({
        where: { ownerId: userId, status: { in: ["PENDING", "MATCHING"] } },
        orderBy: { createdAt: "desc" },
      });

      // 2. Lấy toàn bộ xe đang hoạt động kèm các đơn hàng đã nhận của từng xe đó
      const trucks = await prisma.truck.findMany({
        where: { active: true },
        include: {
          deals: {
            where: { status: "ACCEPTED" },
            include: { shipment: true },
          },
        },
        orderBy: { eta: "asc" },
      });

      const target = myShipments[0] || null;
      let matches: any[] = [];

      if (target) {
        matches = trucks
          .filter((truck) => {
            const currentShipmentsOnTruck = truck.deals.map(
              (d: any) => d.shipment,
            );
            return isTruckEligibleForShipment(
              target,
              truck,
              currentShipmentsOnTruck,
            );
          })
          .map((truck) => {
            const currentShipmentsOnTruck = truck.deals.map(
              (d: any) => d.shipment,
            );
            const scoring = scoreTruck(target, truck, currentShipmentsOnTruck);
            return {
              shipment: target,
              truck,
              matchingScore: scoring.matchingScore,
              warnings: scoring.warnings,
            };
          })
          .sort((a, b) => b.matchingScore - a.matchingScore);
      }

      return res.json({ role, myShipments, target, matches });
    }

    res.json({
      role,
      myTrucks: [],
      myShipments: [],
      target: null,
      matches: [],
    });
  }),
);

apiRouter.get(
  "/shipments",
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.shipment.findMany({
        orderBy: { createdAt: "desc" },
        include: { owner: true, deals: true },
      }),
    );
  }),
);

apiRouter.post(
  "/shipments",
  requireAuth,
  requireRole("CARRIER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const data = shipmentSchema.parse(req.body);
    const shipment = await prisma.shipment.create({
      data: { ...data, ownerId: req.user!.id, status: "MATCHING" },
    });
    res.status(201).json(shipment);
  }),
);

apiRouter.get(
  "/trucks",
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.truck.findMany({
        orderBy: { eta: "asc" },
        include: { owner: true },
      }),
    );
  }),
);

apiRouter.post(
  "/trucks",
  requireAuth,
  requireRole("SHIPPER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const data = truckSchema.parse(req.body);
    if (data.remainingKg > data.maxCapacityKg) {
      throw new HttpError(
        400,
        "Tải trọng còn trống không được lớn hơn tải trọng tối đa",
      );
    }
    if (data.refrigerated && (data.tempMin == null || data.tempMax == null)) {
      throw new HttpError(400, "Xe lạnh cần nhập nhiệt độ tối thiểu và tối đa");
    }
    if (data.refrigerated && data.tempMin! > data.tempMax!) {
      throw new HttpError(400, "Nhiệt độ tối thiểu không được lớn hơn tối đa");
    }
    const truck = await prisma.truck.create({
      data: {
        ...data,
        tempMin: data.refrigerated ? data.tempMin : null,
        tempMax: data.refrigerated ? data.tempMax : null,
        ownerId: req.user!.id,
      },
    });
    res.status(201).json(truck);
  }),
);

apiRouter.get(
  "/match/:shipmentId",
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.shipmentId },
    });
    if (!shipment) throw new HttpError(404, "Shipment not found");
    const trucks = await prisma.truck.findMany({
      where: { active: true },
      include: { owner: true },
    });
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    let matches = trucks
      .filter((truck) => isTruckEligibleForShipment(shipment, truck))
      .map((truck) => ({ truck, ...scoreTruck(shipment, truck) }))
      .sort((a, b) => b.matchingScore - a.matchingScore);

    if (limit && Number.isInteger(limit) && limit > 0) {
      matches = matches.slice(0, limit);
    }

    res.json({
      shipment,
      matches,
      combineSuggestion:
        "Ghép thêm đơn rau cú Đà Lạt -> TP.HCM 850kg để tăng load factor lên 91%",
    });
  }),
);

apiRouter.get(
  "/shipments/:shipmentId/matches",
  requireAuth,
  requireRole("CARRIER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.shipmentId },
      include: { owner: true },
    });
    if (!shipment) throw new HttpError(404, "Shipment not found");
    if (shipment.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(
        403,
        "Bạn không có quyền xem yêu cầu của đơn hàng này",
      );
    }

    const trucks = await prisma.truck.findMany({
      where: { active: true },
      include: { owner: true },
    });

    const matches = trucks
      .filter((truck) => isTruckEligibleForShipment(shipment, truck))
      .map((truck) => ({ truck, ...scoreTruck(shipment, truck) }))
      .sort((a, b) => b.matchingScore - a.matchingScore);

    const requests = await prisma.deal.findMany({
      where: { shipmentId: shipment.id },
      include: {
        truck: true,
        owner: true,
        negotiationRounds: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ shipment, matches, requests });
  }),
);

apiRouter.get(
  "/trucks/:truckId/matches",
  requireAuth,
  requireRole("SHIPPER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId },
      include: { owner: true },
    });
    if (!truck) throw new HttpError(404, "Truck not found");
    if (truck.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(
        403,
        "Bạn không có quyền xem yêu cầu của chiếc xe này",
      );
    }

    const shipments = await prisma.shipment.findMany({
      where: { status: "MATCHING" },
      include: { owner: true },
    });

    const matches = shipments
      .filter((shipment) => isTruckEligibleForShipment(shipment, truck))
      .map((shipment) => ({ shipment, ...scoreTruck(shipment, truck) }))
      .sort((a, b) => b.matchingScore - a.matchingScore);

    const requests = await prisma.deal.findMany({
      where: { truckId: truck.id },
      include: {
        shipment: true,
        owner: true,
        negotiationRounds: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ truck, matches, requests });
  }),
);

apiRouter.post(
  "/aggregate",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        shipmentId: z.string(),
        neededTrucks: z.number().int().min(1).max(20),
      })
      .parse(req.body);
    const shipment = await prisma.shipment.findUnique({
      where: { id: body.shipmentId },
    });
    if (!shipment) throw new HttpError(404, "Shipment not found");
    const trucks = await prisma.truck.findMany({ where: { active: true } });
    const eligibleTrucks = trucks.filter((truck) =>
      isTruckEligibleForShipment(shipment, truck),
    );
    res.json(aggregateTrucks(shipment, eligibleTrucks, body.neededTrucks));
  }),
);

//
// ⚠️ DEPRECATED
// Use: POST /api/negotiation/deals
//
// New system supports:
// - Multi-round negotiation
// - Quick match using shipment.proposedPrice
// - Full negotiation history
// - Counter offers
//

apiRouter.post(
  "/deals",
  requireAuth,
  requireRole("SHIPPER", "CARRIER", "ADMIN"),
  asyncHandler(async (_req, res) => {
    return res.status(410).json({
      success: false,

      error: "DEPRECATED_ENDPOINT",

      message:
        "This endpoint has been removed. Please use POST /api/negotiation/deals instead.",

      migration: {
        oldEndpoint: "POST /api/deals",
        newEndpoint: "POST /api/negotiation/deals",
      },

      supportedFlows: {
        quickMatch: {
          description:
            "Automatically use shipment.proposedPrice as Round 1 price",

          requestBody: {
            shipmentId: "shipment_id",
            truckId: "truck_id",
          },
        },

        customNegotiation: {
          description: "Start negotiation with custom proposed price",

          requestBody: {
            shipmentId: "shipment_id",
            truckId: "truck_id",
            proposedPrice: 500000,
            message: "Optional negotiation message",
          },
        },
      },

      note: "The new negotiation system supports unlimited negotiation rounds and full price history tracking.",
    });
  }),
);

apiRouter.get(
  "/admin/analytics",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    res.json({
      revenue: 428000000,
      savedCost: 186500000,
      routes: [
        { route: "Da Lat -> TP.HCM", orders: 14, utilization: 88 },
        { route: "Can Tho -> TP.HCM", orders: 9, utilization: 79 },
        { route: "Nha Trang -> Da Nang", orders: 7, utilization: 74 },
      ],
    });
  }),
);

// Thêm các hàm này vào file router hiện tại của bạn

// ==========================================
// 1. CÁC API LUỒNG DEAL (THƯƠNG LƯỢNG GIÁ)
// ==========================================

/**
 * GET /deals
 * Lấy danh sách deal liên quan đến user hiện tại
 * - Nếu là SHIPPER: Xem các deal liên quan đến xe của mình HOẶC deal do chính mình tạo ra
 * - Nếu là CARRIER: Xem các deal đánh vào các Shipment do mình sở hữu
 */
apiRouter.get(
  "/deals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const userRole = req.user!.role; // Giả định req.user có chứa role từ middleware auth

    let deals;

    if (userRole === "SHIPPER") {
      // Tìm các deal liên quan đến xe của Shipper (chủ nhà xe) HOẶC deal do chính mình tạo ra
      deals = await prisma.deal.findMany({
        where: {
          OR: [
            // Deal liên quan tới xe của mình
            {
              truck: {
                ownerId: userId,
              },
            },
            // Deal do mình tạo ra
            {
              ownerId: userId,
            },
          ],
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
      // Tìm các deal thuộc về đơn hàng của Carrier (chủ hàng) này
      deals = await prisma.deal.findMany({
        where: {
          shipment: {
            ownerId: userId,
          },
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
      // Nếu là ADMIN thì trả về toàn bộ
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

    // Broadcast deals list to all connected clients
    try {
      const io = getIOInstance();
      io.to("deals-room").emit("deals:refreshed", {
        count: deals.length,
        deals,
      });
    } catch (err) {
      console.error("Error broadcasting deals:refreshed:", err);
    }

    res.json(deals);
  }),
);

// ⚠️ DEPRECATED SCHEMA: Use NegotiationRound endpoints for price negotiation
const updateDealSchema = z.object({
  counterPrice: z.number().int().positive().optional(),
  finalPrice: z.number().int().positive().optional(),
  status: z.enum(["PROPOSED", "COUNTERED", "ACCEPTED", "REJECTED"]),
});

//
// ⚠️ DEPRECATED
//
// Old single-round deal update endpoint
//
// Replaced by:
// - POST /api/negotiation/deals/:dealId/rounds/:roundId/respond
// - POST /api/negotiation/deals/:dealId/rounds/:roundId/accept
//

apiRouter.patch(
  "/deals/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    return res.status(410).json({
      success: false,

      error: "DEPRECATED_ENDPOINT",

      message:
        "This endpoint has been removed. Use negotiation round endpoints instead.",

      deprecatedEndpoint: `PATCH /api/deals/${id}`,

      replacementEndpoints: {
        acceptPrice: {
          method: "POST",
          endpoint: "/api/negotiation/deals/:dealId/rounds/:roundId/accept",

          description: "Accept the proposed price of a negotiation round",
        },

        counterOffer: {
          method: "POST",
          endpoint: "/api/negotiation/deals/:dealId/rounds/:roundId/respond",

          requestBody: {
            counterPrice: 450000,
            message: "Optional counter message",
          },

          description: "Respond with a counter-offer to continue negotiation",
        },

        negotiationInfo: {
          method: "GET",
          endpoint: "/api/negotiation/deals/:dealId",

          description: "Get negotiation details and full round history",
        },
      },

      note: "The new negotiation system supports unlimited rounds, counter offers, acceptance tracking, and negotiation history.",
    });
  }),
);

// ==========================================
// 2. API QUẢN LÝ SHIPMENT & TRUCK LIFECYCLE
// ==========================================

/**
 * PATCH /shipments/:id
 * Cập nhật thông tin/trạng thái đơn hàng (Dành cho CARRIER sở hữu đơn hoặc Admin)
 */
const updateShipmentSchema = shipmentSchema.partial().extend({
  status: z
    .enum(["MATCHING", "BOOKED", "IN_TRANSIT", "DELIVERED", "CANCELLED"])
    .optional(),
});

apiRouter.patch(
  "/shipments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Parse dữ liệu qua schema của bạn mượt mà
    const data = updateShipmentSchema.parse(req.body);

    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new HttpError(404, "Không tìm thấy đơn hàng");

    if (shipment.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Bạn không có quyền chỉnh sửa đơn hàng này");
    }

    // Ép kiểu 'as any' ở đây để TypeScript bỏ qua việc so khớp Enum giữa Zod và Prisma
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: data as any,
    });

    res.json(updatedShipment);
  }),
);

apiRouter.delete(
  "/shipments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new HttpError(404, "Không tìm thấy đơn hàng");

    if (shipment.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Bạn không có quyền xóa đơn hàng này");
    }

    await prisma.$transaction(async (tx) => {
      await tx.deal.deleteMany({
        where: { shipmentId: id },
      });

      await tx.match.deleteMany({
        where: { shipmentId: id },
      });

      await tx.shipment.delete({
        where: { id },
      });
    });

    res.status(204).send();
  }),
);

/**
 * PATCH /trucks/:id
 * Cập nhật trạng thái xe, tọa độ thực tế, tải trọng (Dành cho SHIPPER sở hữu xe hoặc Admin)
 */
const updateTruckSchema = truckSchema.partial().extend({
  active: z.boolean().optional(),
});

apiRouter.patch(
  "/trucks/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = updateTruckSchema.parse(req.body);

    const truck = await prisma.truck.findUnique({ where: { id } });
    if (!truck) throw new HttpError(404, "Không tìm thấy thông tin xe");

    // Kiểm tra quyền: Chỉ chủ xe hoặc ADMIN mới được sửa
    if (truck.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Bạn không có quyền chỉnh sửa thông tin xe này");
    }

    const updatedTruck = await prisma.truck.update({
      where: { id },
      data,
    });

    res.json(updatedTruck);
  }),
);

apiRouter.delete(
  "/trucks/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const truck = await prisma.truck.findUnique({ where: { id } });
    if (!truck) throw new HttpError(404, "Không tìm thấy thông tin xe");

    if (truck.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Bạn không có quyền xóa xe này");
    }

    await prisma.truck.delete({ where: { id } });
    res.status(204).send();
  }),
);

// ==========================================
// 3. API QUẢN LÝ USER / PROFILE
// ==========================================

/**
 * GET /user/profile
 * Xem thông tin profile cá nhân của user đang đăng nhập
 */
apiRouter.get(
  "/user/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        // Thêm các trường mở rộng nếu schema của bạn có lưu
        // phone: true,
        // company: true,
        // rating: true
      },
    });

    if (!user) throw new HttpError(404, "Không tìm thấy thông tin tài khoản");
    res.json(user);
  }),
);

/**
 * PUT /user/profile
 * Cập nhật thông tin profile cá nhân
 */
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(9).optional(),
  company: z.string().optional(),
  // Tránh việc tùy tiện đổi password trực tiếp ở đây, nên viết riêng api đổi pass nếu cần bảo mật cao.
  // Nhưng nếu làm tinh gọn, bạn có thể băm (hash) password mới ở đây trước khi lưu vào DB.
  password: z.string().min(6).optional(),
});

apiRouter.put(
  "/user/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);

    // Nếu có cập nhật password, bạn cần import bcrypt hoặc thư viện mã hóa đang dùng để hash nó
    // if (data.password) {
    //   data.password = await bcrypt.hash(data.password, 10);
    // }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        // không trả password về client
      },
    });

    res.json(updatedUser);
  }),
);
