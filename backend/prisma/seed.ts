import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Hệ thống tuyến đường mẫu chuẩn hóa tiếng Việt có dấu và tọa độ thực tế địa phương
const routes = [
  {
    pickup: "Đà Nẵng",
    dropoff: "Hồ Chí Minh",
    pickupLat: 16.0471,
    pickupLng: 108.2068,
    dropoffLat: 10.8231,
    dropoffLng: 106.6297,
  },
  {
    pickup: "Đà Nẵng",
    dropoff: "Quảng Ngãi",
    pickupLat: 16.0471,
    pickupLng: 108.2068,
    dropoffLat: 15.1214,
    dropoffLng: 108.8044,
  },
  {
    pickup: "Đà Nẵng",
    dropoff: "Khánh Hòa",
    pickupLat: 16.0471,
    pickupLng: 108.2068,
    dropoffLat: 12.2388,
    dropoffLng: 109.1967,
  },
  {
    pickup: "Đà Lạt",
    dropoff: "Hồ Chí Minh",
    pickupLat: 11.9404,
    pickupLng: 108.4583,
    dropoffLat: 10.8231,
    dropoffLng: 106.6297,
  },
  {
    pickup: "Cần Thơ",
    dropoff: "Hồ Chí Minh",
    pickupLat: 10.0452,
    pickupLng: 105.7469,
    dropoffLat: 10.8231,
    dropoffLng: 106.6297,
  },
];

// Danh mục hàng hóa mẫu bao gồm các mã hàng test của bạn để phục vụ thuật toán kỵ hàng
const cargo = [
  {
    cargoType: "CAAAAA",
    category: "Thực phẩm tươi sống",
    min: 0,
    max: 8,
    fragile: false,
    strongSmell: false,
  },
  {
    cargoType: "TOMMMM",
    category: "Thực phẩm tươi sống",
    min: 0,
    max: 10,
    frozenRequired: true,
    specialTemperature: true,
  },
  {
    cargoType: "Rau xà lách Đà Lạt",
    category: "Rau củ",
    min: 2,
    max: 8,
    fragile: true,
  },
  {
    cargoType: "Sầu riêng Ri6",
    category: "Trái cây",
    min: 8,
    max: 14,
    strongSmell: true,
    allowCombine: true,
  },
  {
    cargoType: "Hải sản tươi sống",
    category: "Hải sản",
    min: -2,
    max: 2,
    frozenRequired: true,
    specialTemperature: true,
    strongSmell: true,
  },
  {
    cargoType: "Dâu tây New Zealand",
    category: "Trái cây",
    min: 2,
    max: 6,
    fragile: true,
  },
];

async function main() {
  console.log(
    "🔄 Đang dọn dẹp dữ liệu cũ tránh xung đột ràng buộc ngoại (FK)...",
  );
  await prisma.trackingEvent.deleteMany();
  await prisma.negotiationRound.deleteMany();
  await prisma.match.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("123456", 10);

  console.log("👤 Đang khởi tạo tài khoản phân quyền hệ thống...");
  const shipper = await prisma.user.create({
    data: {
      name: "Linh Nguyen",
      email: "shipper@freshchain.vn",
      password,
      role: "SHIPPER",
      company: "Da Lat Fresh Farm",
    },
  });

  const carrier = await prisma.user.create({
    data: {
      name: "Minh Tran",
      email: "carrier@freshchain.vn",
      password,
      role: "CARRIER",
      company: "Nam Viet Cold Truck",
    },
  });

  await prisma.user.create({
    data: {
      name: "Admin FreshChain",
      email: "admin@freshchain.vn",
      password,
      role: "ADMIN",
      company: "FreshChain AI",
    },
  });

  console.log("🚚 Đang cấu hình danh sách 20 xe tải chạy tuyến liên tỉnh...");
  for (let i = 0; i < 20; i++) {
    const route = routes[i % routes.length];
    const refrigerated = i % 4 !== 0; // Tỷ lệ xe lạnh chiếm 75%

    const maxCapacity = 3000 + (i % 4) * 1000; // 3000kg - 6000kg
    const remaining = maxCapacity; // Ban đầu xe trống hoàn toàn để chờ gom đơn tích lũy

    await prisma.truck.create({
      data: {
        ownerId: shipper.id,
        type: refrigerated ? "Xe lạnh" : "Xe tải thùng kín",
        plateNumber: `88A-${(10000 + i).toString()}`,
        maxCapacityKg: maxCapacity,
        remainingKg: remaining,
        refrigerated,
        tempMin: refrigerated ? [0, -5, -18, -22][i % 4] : null,
        tempMax: refrigerated ? [10, 5, -2, -10][i % 4] : null,
        currentRoute: `${route.pickup} -> ${route.dropoff}`,
        // Đặt định vị chuẩn xác tại tọa độ gốc của Điểm Bốc để thuật toán Haversine không loại bỏ xe
        currentLat: route.pickupLat,
        currentLng: route.pickupLng,
        eta: new Date(Date.now() + (2 + i) * 60 * 60 * 1000),
        currentTemp: refrigerated ? 2 : null,
        active: true,
      },
    });
  }

  console.log(
    "📦 Đang sinh dữ liệu 30 đơn hàng vận chuyển mẫu để khớp lệnh...",
  );
  for (let i = 0; i < 30; i++) {
    const route = routes[i % routes.length];
    const item = cargo[i % cargo.length];

    await prisma.shipment.create({
      data: {
        ownerId: carrier.id,
        cargoType: item.cargoType,
        category: item.category,
        weightKg: 500 + (i % 5) * 200, // 500kg - 1300kg
        requiredTempMin: item.min ?? 0,
        requiredTempMax: item.max ?? 10,
        pickup: route.pickup,
        dropoff: route.dropoff,
        pickupLat: route.pickupLat,
        pickupLng: route.pickupLng,
        dropoffLat: route.dropoffLat,
        dropoffLng: route.dropoffLng,
        deliveryTime: new Date(Date.now() + (24 + i) * 60 * 60 * 1000),
        proposedPrice: 1500000 + (i % 5) * 300000,
        notes:
          i % 6 === 0
            ? "Yêu cầu bốc dỡ nhẹ tay, đảm bảo đúng dải nhiệt độ lạnh."
            : null,
        strongSmell: Boolean(item.strongSmell),
        fragile: Boolean(item.fragile),
        frozenRequired: Boolean(item.frozenRequired),
        specialTemperature: Boolean(item.specialTemperature),
        allowCombine: true,
        compatibilityNote: item.strongSmell
          ? "Hàng có mùi đặc thù, lưu ý khi xếp chung hàng nhạy cảm"
          : null,
        status: "MATCHING", // Đặt mặc định trạng thái chờ Matching để hệ thống quét ra lập tức
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log(
      "🎉 [Thành công] Toàn bộ dữ liệu tiếng Việt chuẩn phối ghép đa đơn hàng đã được nạp thành công vào Database!",
    );
  })
  .catch(async (error) => {
    console.error("❌ Lỗi trong quá trình chạy seed dữ liệu:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
