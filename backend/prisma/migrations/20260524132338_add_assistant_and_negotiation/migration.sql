-- DropForeignKey
ALTER TABLE "OrderAssistantSession" DROP CONSTRAINT "OrderAssistantSession_userId_fkey";

-- AlterTable
ALTER TABLE "Deal" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderAssistantSession" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "OrderAssistantSession" ADD CONSTRAINT "OrderAssistantSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
