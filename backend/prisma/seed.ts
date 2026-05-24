import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const routes = [
  { pickup: "Da Lat", dropoff: "TP.HCM", pickupLat: 11.9404, pickupLng: 108.4583, dropoffLat: 10.8231, dropoffLng: 106.6297 },
  { pickup: "Can Tho", dropoff: "TP.HCM", pickupLat: 10.0452, pickupLng: 105.7469, dropoffLat: 10.8231, dropoffLng: 106.6297 },
  { pickup: "Nha Trang", dropoff: "Da Nang", pickupLat: 12.2388, pickupLng: 109.1967, dropoffLat: 16.0471, dropoffLng: 108.2068 }
];

const cargo = [
  { cargoType: "Rau la Da Lat", category: "Rau cu", min: 2, max: 8, fragile: true },
  { cargoType: "Sau rieng", category: "Trai cay", min: 8, max: 14, strongSmell: true, allowCombine: false },
  { cargoType: "Tom dong lanh", category: "Hai san", min: -18, max: -5, frozenRequired: true, specialTemperature: true },
  { cargoType: "Ca ngu tuoi", category: "Hai san", min: -2, max: 2, frozenRequired: true, specialTemperature: true },
  { cargoType: "Dau tay", category: "Trai cay", min: 2, max: 6, fragile: true },
  { cargoType: "Hang dong lanh tong hop", category: "Hang dong lanh", min: -22, max: -12, frozenRequired: true, specialTemperature: true }
];

async function main() {
  await prisma.trackingEvent.deleteMany();
  await prisma.match.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("123456", 10);
  const shipper = await prisma.user.create({ data: { name: "Linh Nguyen", email: "shipper@freshchain.vn", password, role: "SHIPPER", company: "Da Lat Fresh Farm" } });
  const carrier = await prisma.user.create({ data: { name: "Minh Tran", email: "carrier@freshchain.vn", password, role: "CARRIER", company: "Nam Viet Cold Truck" } });
  await prisma.user.create({ data: { name: "Admin FreshChain", email: "admin@freshchain.vn", password, role: "ADMIN", company: "FreshChain AI" } });

  for (let i = 0; i < 20; i++) {
    const route = routes[i % routes.length];
    const refrigerated = i % 4 !== 0;
    await prisma.truck.create({
      data: {
        ownerId: shipper.id,
        type: refrigerated ? "Xe lanh 5 tan" : "Xe tai thung kin",
        plateNumber: `51C-${(78000 + i).toString()}`,
        maxCapacityKg: 3500 + (i % 5) * 900,
        remainingKg: 900 + (i % 7) * 650,
        refrigerated,
        tempMin: refrigerated ? [-22, -18, -5, 0][i % 4] : null,
        tempMax: refrigerated ? [6, 8, 12, 16][i % 4] : null,
        currentRoute: `${route.pickup} -> ${route.dropoff}`,
        currentLat: route.pickupLat + i * 0.012,
        currentLng: route.pickupLng + i * 0.01,
        eta: new Date(Date.now() + (2 + i) * 60 * 60 * 1000),
        currentTemp: refrigerated ? -4 + (i % 8) : null,
        active: i % 9 !== 0
      }
    });
  }

  for (let i = 0; i < 30; i++) {
    const route = routes[i % routes.length];
    const item = cargo[i % cargo.length];
    await prisma.shipment.create({
      data: {
        ownerId: carrier.id,
        cargoType: item.cargoType,
        category: item.category,
        weightKg: 450 + (i % 8) * 420,
        requiredTempMin: item.min,
        requiredTempMax: item.max,
        pickup: route.pickup,
        dropoff: route.dropoff,
        pickupLat: route.pickupLat,
        pickupLng: route.pickupLng,
        dropoffLat: route.dropoffLat,
        dropoffLng: route.dropoffLng,
        deliveryTime: new Date(Date.now() + (8 + i) * 60 * 60 * 1000),
        proposedPrice: 2800000 + (i % 9) * 420000,
        notes: i % 5 === 0 ? "Can uu tien xe lanh sach, giao dung hen." : null,
        strongSmell: Boolean(item.strongSmell),
        fragile: Boolean(item.fragile),
        frozenRequired: Boolean(item.frozenRequired),
        specialTemperature: Boolean(item.specialTemperature),
        allowCombine: item.allowCombine ?? true,
        compatibilityNote: item.strongSmell
          ? "Sau rieng co mui manh, khong ghep voi trai cay khac"
          : item.frozenRequired
            ? "Hai san can nhiet do duoi 0C"
            : item.fragile
              ? "Hang de dap, khong ghep hang nang"
              : null,
        status: ["PENDING", "MATCHING", "NEGOTIATING", "IN_TRANSIT", "DELIVERED"][i % 5] as any
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded FreshChain AI demo data");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
