CREATE TYPE "Role" AS ENUM ('SHIPPER', 'CARRIER', 'ADMIN');
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'MATCHING', 'NEGOTIATING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
CREATE TYPE "DealStatus" AS ENUM ('PROPOSED', 'COUNTERED', 'ACCEPTED', 'REJECTED');

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

CREATE TABLE "Deal" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "proposedPrice" INTEGER NOT NULL,
  "counterPrice" INTEGER,
  "finalPrice" INTEGER,
  "status" "DealStatus" NOT NULL DEFAULT 'PROPOSED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Truck_plateNumber_key" ON "Truck"("plateNumber");
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
