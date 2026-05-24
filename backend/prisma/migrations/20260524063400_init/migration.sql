-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "truckId" TEXT;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
