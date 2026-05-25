-- Create enums
CREATE TYPE "NegotiationRoundStatus" AS ENUM ('PENDING', 'RESPONDED', 'WAITING_FOR_COUNTER', 'COMPLETED');
CREATE TYPE "AssistantSessionStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'SUBMITTED', 'COMPLETED');

-- Modify Deal table
ALTER TABLE "Deal" DROP COLUMN "proposedPrice";
ALTER TABLE "Deal" DROP COLUMN "counterPrice";
ALTER TABLE "Deal" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create NegotiationRound table
CREATE TABLE "NegotiationRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "NegotiationRound_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for NegotiationRound
CREATE INDEX "NegotiationRound_dealId_idx" ON "NegotiationRound"("dealId");

-- Create OrderAssistantSession table
CREATE TABLE "OrderAssistantSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderAssistantSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for OrderAssistantSession
CREATE INDEX "OrderAssistantSession_userId_status_idx" ON "OrderAssistantSession"("userId", "status");

-- Create AssistantMessage table
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "suggestedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssistantMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OrderAssistantSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for AssistantMessage
CREATE INDEX "AssistantMessage_sessionId_idx" ON "AssistantMessage"("sessionId");
