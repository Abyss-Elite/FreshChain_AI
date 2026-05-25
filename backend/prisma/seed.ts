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

const hcmToDaNangTrucks = [
  { plateNumber: "51C-90001", type: "Xe lanh 8 tan", maxCapacityKg: 8000, remainingKg: 5000, tempMin: 0, tempMax: 8, etaHours: 4, currentTemp: 4 },
  { plateNumber: "51C-90002", type: "Xe lanh 10 tan", maxCapacityKg: 10000, remainingKg: 7000, tempMin: -5, tempMax: 10, etaHours: 6, currentTemp: 3 },
  { plateNumber: "51C-90003", type: "Xe lanh 6 tan", maxCapacityKg: 6000, remainingKg: 3500, tempMin: 2, tempMax: 8, etaHours: 8, currentTemp: 5 }
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

  for (const truck of hcmToDaNangTrucks) {
    await prisma.truck.create({
      data: {
        ownerId: shipper.id,
        type: truck.type,
        plateNumber: truck.plateNumber,
        maxCapacityKg: truck.maxCapacityKg,
        remainingKg: truck.remainingKg,
        refrigerated: true,
        tempMin: truck.tempMin,
        tempMax: truck.tempMax,
        currentRoute: "Ho Chi Minh -> Da Nang",
        currentLat: 10.8231,
        currentLng: 106.6297,
        eta: new Date(Date.now() + truck.etaHours * 60 * 60 * 1000),
        currentTemp: truck.currentTemp,
        active: true
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

  await prisma.shipment.create({
    data: {
      ownerId: carrier.id,
      cargoType: "Rau Da Lat test HCM Da Nang",
      category: "Thuc pham tuoi song",
      weightKg: 3000,
      requiredTempMin: 2,
      requiredTempMax: 8,
      pickup: "Ho Chi Minh",
      dropoff: "Da Nang",
      pickupLat: 10.8231,
      pickupLng: 106.6297,
      dropoffLat: 16.0471,
      dropoffLng: 108.2068,
      deliveryTime: new Date(Date.now() + 30 * 60 * 60 * 1000),
      proposedPrice: 6500000,
      notes: "Don test match voi 3 xe 51C-90001, 51C-90002, 51C-90003.",
      strongSmell: false,
      fragile: false,
      frozenRequired: false,
      specialTemperature: true,
      allowCombine: true,
      compatibilityNote: "Hang rau tuoi can xe lanh 2-8C.",
      status: "MATCHING"
    }
  });
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
