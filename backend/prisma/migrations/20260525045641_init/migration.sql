-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SHIPPER', 'CARRIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'MATCHING', 'NEGOTIATING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('PROPOSED', 'COUNTERED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NegotiationRoundStatus" AS ENUM ('PENDING', 'RESPONDED', 'WAITING_FOR_COUNTER', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssistantSessionStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'SUBMITTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SHIPPER',
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cargoType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "requiredTempMin" INTEGER NOT NULL,
    "requiredTempMax" INTEGER NOT NULL,
    "pickup" TEXT NOT NULL,
    "dropoff" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "dropoffLat" DOUBLE PRECISION NOT NULL,
    "dropoffLng" DOUBLE PRECISION NOT NULL,
    "deliveryTime" TIMESTAMP(3) NOT NULL,
    "proposedPrice" INTEGER NOT NULL,
    "notes" TEXT,
    "strongSmell" BOOLEAN NOT NULL DEFAULT false,
    "fragile" BOOLEAN NOT NULL DEFAULT false,
    "frozenRequired" BOOLEAN NOT NULL DEFAULT false,
    "specialTemperature" BOOLEAN NOT NULL DEFAULT false,
    "allowCombine" BOOLEAN NOT NULL DEFAULT true,
    "compatibilityNote" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "maxCapacityKg" INTEGER NOT NULL,
    "remainingKg" INTEGER NOT NULL,
    "refrigerated" BOOLEAN NOT NULL DEFAULT false,
    "tempMin" INTEGER,
    "tempMax" INTEGER,
    "currentRoute" TEXT NOT NULL,
    "currentLat" DOUBLE PRECISION NOT NULL,
    "currentLng" DOUBLE PRECISION NOT NULL,
    "eta" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currentTemp" DOUBLE PRECISION,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "matchingScore" INTEGER NOT NULL,
    "compatibilityScore" INTEGER NOT NULL,
    "distanceScore" INTEGER NOT NULL,
    "capacityScore" INTEGER NOT NULL,
    "timeScore" INTEGER NOT NULL,
    "estimatedSavings" INTEGER NOT NULL,
    "warnings" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "truckId" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalPrice" INTEGER,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationRound" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "proposedPrice" INTEGER NOT NULL,
    "respondedPrice" INTEGER,
    "status" "NegotiationRoundStatus" NOT NULL DEFAULT 'PENDING',
    "proposedBy" TEXT NOT NULL,
    "respondedBy" TEXT,
    "message" TEXT,
    "responseMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "NegotiationRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "etaMinutes" INTEGER NOT NULL,
    "alert" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAssistantSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AssistantSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cargoType" TEXT,
    "category" TEXT,
    "weightKg" INTEGER,
    "requiredTempMin" INTEGER,
    "requiredTempMax" INTEGER,
    "pickup" TEXT,
    "dropoff" TEXT,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "deliveryTime" TIMESTAMP(3),
    "proposedPrice" INTEGER,
    "notes" TEXT,
    "strongSmell" BOOLEAN,
    "fragile" BOOLEAN,
    "frozenRequired" BOOLEAN,
    "specialTemperature" BOOLEAN,
    "allowCombine" BOOLEAN,
    "compatibilityNote" TEXT,
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submittedShipmentId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderAssistantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "suggestedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_plateNumber_key" ON "Truck"("plateNumber");

-- CreateIndex
CREATE INDEX "NegotiationRound_dealId_idx" ON "NegotiationRound"("dealId");

-- CreateIndex
CREATE INDEX "OrderAssistantSession_userId_status_idx" ON "OrderAssistantSession"("userId", "status");

-- CreateIndex
CREATE INDEX "AssistantMessage_sessionId_idx" ON "AssistantMessage"("sessionId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationRound" ADD CONSTRAINT "NegotiationRound_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssistantSession" ADD CONSTRAINT "OrderAssistantSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OrderAssistantSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
