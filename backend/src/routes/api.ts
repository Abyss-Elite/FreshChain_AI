import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { aggregateTrucks, scoreTruck } from "../services/matching.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import { prisma } from "../utils/prisma.js";

export const apiRouter = Router();

const shipmentSchema = z.object({
  cargoType: z.string().min(2),
  category: z.string().min(2),
  weightKg: z.number().int().positive(),
  requiredTempMin: z.number().int(),
  requiredTempMax: z.number().int(),
  pickup: z.string().min(2),
  dropoff: z.string().min(2),
  pickupLat: z.number().default(11.94),
  pickupLng: z.number().default(108.45),
  dropoffLat: z.number().default(10.82),
  dropoffLng: z.number().default(106.63),
  deliveryTime: z.coerce.date(),
  proposedPrice: z.number().int().positive(),
  notes: z.string().optional(),
  strongSmell: z.boolean().default(false),
  fragile: z.boolean().default(false),
  frozenRequired: z.boolean().default(false),
  specialTemperature: z.boolean().default(false),
  allowCombine: z.boolean().default(true),
  compatibilityNote: z.string().optional()
});

const truckSchema = z.object({
  type: z.string().min(2),
  plateNumber: z.string().min(5),
  maxCapacityKg: z.number().int().positive(),
  remainingKg: z.number().int().positive(),
  refrigerated: z.boolean(),
  tempMin: z.number().int().optional(),
  tempMax: z.number().int().optional(),
  currentRoute: z.string().min(2),
  currentLat: z.number().default(11.94),
  currentLng: z.number().default(108.45),
  eta: z.coerce.date()
});

apiRouter.get("/health", (_req, res) => res.json({ ok: true, service: "FreshChain AI API" }));

apiRouter.get("/dashboard", asyncHandler(async (_req, res) => {
  const [orders, activeTrucks, emptyTrucks, shipments] = await Promise.all([
    prisma.shipment.count(),
    prisma.truck.count({ where: { active: true } }),
    prisma.truck.count({ where: { remainingKg: { gt: 1000 } } }),
    prisma.shipment.findMany({ take: 8, orderBy: { createdAt: "desc" } })
  ]);
  res.json({
    stats: { orders, activeTrucks, emptyTrucks, loadOptimization: 82, savings: 186500000 },
    chart: [
      { day: "T2", shipments: 18, savings: 12 },
      { day: "T3", shipments: 22, savings: 15 },
      { day: "T4", shipments: 19, savings: 11 },
      { day: "T5", shipments: 31, savings: 21 },
      { day: "T6", shipments: 27, savings: 19 },
      { day: "T7", shipments: 35, savings: 24 }
    ],
    shipments
  });
}));

apiRouter.get("/shipments", asyncHandler(async (_req, res) => {
  res.json(await prisma.shipment.findMany({ orderBy: { createdAt: "desc" }, include: { owner: true, deals: true } }));
}));

apiRouter.post("/shipments", requireAuth, requireRole("SHIPPER", "ADMIN"), asyncHandler(async (req, res) => {
  const data = shipmentSchema.parse(req.body);
  const shipment = await prisma.shipment.create({ data: { ...data, ownerId: req.user!.id, status: "MATCHING" } });
  res.status(201).json(shipment);
}));

apiRouter.get("/trucks", asyncHandler(async (_req, res) => {
  res.json(await prisma.truck.findMany({ orderBy: { eta: "asc" }, include: { owner: true } }));
}));

apiRouter.post("/trucks", requireAuth, requireRole("CARRIER", "ADMIN"), asyncHandler(async (req, res) => {
  const data = truckSchema.parse(req.body);
  const truck = await prisma.truck.create({ data: { ...data, ownerId: req.user!.id } });
  res.status(201).json(truck);
}));

apiRouter.get("/match/:shipmentId", asyncHandler(async (req, res) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.shipmentId } });
  if (!shipment) throw new HttpError(404, "Shipment not found");
  const trucks = await prisma.truck.findMany({ where: { active: true }, include: { owner: true } });
  const matches = trucks
    .map((truck) => ({ truck, ...scoreTruck(shipment, truck) }))
    .sort((a, b) => b.matchingScore - a.matchingScore)
    .slice(0, 8);
  res.json({ shipment, matches, combineSuggestion: "Ghep them don rau cu Da Lat -> TP.HCM 850kg de tang load factor len 91%" });
}));

apiRouter.post("/aggregate", asyncHandler(async (req, res) => {
  const body = z.object({ shipmentId: z.string(), neededTrucks: z.number().int().min(1).max(20) }).parse(req.body);
  const shipment = await prisma.shipment.findUnique({ where: { id: body.shipmentId } });
  if (!shipment) throw new HttpError(404, "Shipment not found");
  const trucks = await prisma.truck.findMany({ where: { active: true } });
  res.json(aggregateTrucks(shipment, trucks, body.neededTrucks));
}));

apiRouter.post("/deals", requireAuth, asyncHandler(async (req, res) => {
  const data = z.object({ shipmentId: z.string(), proposedPrice: z.number().int().positive() }).parse(req.body);
  const deal = await prisma.deal.create({ data: { ...data, ownerId: req.user!.id } });
  res.status(201).json(deal);
}));

apiRouter.patch("/deals/:id", requireAuth, asyncHandler(async (req, res) => {
  const data = z.object({
    counterPrice: z.number().int().positive().optional(),
    finalPrice: z.number().int().positive().optional(),
    status: z.enum(["PROPOSED", "COUNTERED", "ACCEPTED", "REJECTED"])
  }).parse(req.body);
  res.json(await prisma.deal.update({ where: { id: req.params.id }, data }));
}));

apiRouter.get("/admin/analytics", requireAuth, requireRole("ADMIN"), asyncHandler(async (_req, res) => {
  res.json({
    revenue: 428000000,
    savedCost: 186500000,
    routes: [
      { route: "Da Lat -> TP.HCM", orders: 14, utilization: 88 },
      { route: "Can Tho -> TP.HCM", orders: 9, utilization: 79 },
      { route: "Nha Trang -> Da Nang", orders: 7, utilization: 74 }
    ]
  });
}));
