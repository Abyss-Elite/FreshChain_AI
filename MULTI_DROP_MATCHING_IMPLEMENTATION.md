# 🚀 Hệ Thống Ghép Hàng Thông Minh Đa Đơn Hàng & Cảnh Báo Xung Đột Hàng Hóa

## 📋 Tổng Quan Hệ Thống

Hệ thống đã được hoàn toàn viết lại để hỗ trợ:

1. ✅ **Ghép hàng đa đơn (Multi-drop Matching)** - Gom nhiều đơn hàng trên cùng một xe dựa tải trọng lũy kế
2. ✅ **Kiểm tra xung đột hàng hóa (Goods Conflict Detection)** - Cảnh báo tự động khi hàng không tương thích
3. ✅ **Thương lượng giá hai nút** - Giao diện đơn giản với "Chấp nhận ghép" và "Thương lượng giá"
4. ✅ **Định dạng tiền tệ thực tế** - Nhập số tự động định dạng VND
5. ✅ **Thiết kế Mobile-first** - Đáp ứng hoàn hảo trên màn hình nhỏ

---

## 🔧 CÁC TỆPC CHÍNH ĐÃ CẬP NHẬT

### Backend Services

#### 1. **`/backend/src/services/compatibility.ts`**

Đã nâng cấp toàn bộ logic kiểm tra tương thích:

```typescript
// ✨ Mới: Danh sách hàng có mùi nặng
const STRONG_SMELL_GOODS = [
  "sầu riêng", "durian", "hải sản tươi", "hóa chất", ...
];

// ✨ Mới: Danh sách hàng dễ hấp thụ mùi
const ODOR_SENSITIVE_GOODS = [
  "rau xanh", "rau cuống", "bánh kẹo", "sữa", ...
];

// ✨ Mới: Bản đồ xung đột chi tiết
const INCOMPATIBLE_GOODS_MAP: Record<string, string[]> = {
  "sầu riêng": ["rau xanh", "bánh kẹo", "sữa", ...],
  "hải sản tươi": ["rau xanh", "bánh kẹo", ...],
  // ... nhiều hơn nữa
};

// ✨ Hàm kiểm tra xung đột giữa hàng mới và các hàng hiện có
function checkGoodsConflict(currentGoodsList: string[], newGoods: string): {
  hasConflict: boolean;
  conflictItems: string[];
}
```

**Kết quả trả về:**

```typescript
{
  score: number,           // 0-100
  status: "CONFLICT" | "WARNING" | "SAFE",
  warnings: string[],      // Tất cả cảnh báo chi tiết
  conflicts: Array<{
    type: "goods_odor_conflict",
    conflictingWith: string[]
  }>
}
```

#### 2. **`/backend/src/services/matching.ts`**

Thuật toán matching hoàn toàn được viết lại:

```typescript
// ✨ Mới: Kiểm tra tuyến đường con (Route Sub-segment)
function isRouteCompatible(shipment: Shipment, truck: Truck): boolean {
  // Nếu đơn từ Đà Nẵng -> Quy Nhơn
  // Xe chạy Đà Nẵng -> TP.HCM
  // Hợp lệ vì Đà Nẵng, Quy Nhơn nằm trên tuyến đường xe!
}

// ✨ Mới: Kiểm tra khoảng nhiệt độ (Temperature Overlay)
function isTemperatureCompatible(shipment: Shipment, truck: Truck): boolean {
  // Đơn yêu cầu 12°C - 16°C
  // Xe hỗ trợ 10°C - 18°C
  // → Hợp lệ (khoảng đơn nằm trong khoảng xe)
}

// ✨ Mới: Tính điểm với xét đến hàng hiện có trên xe
export function scoreTruck(
  shipment: Shipment,
  truck: Truck,
  existingShipments?: Shipment[]  // 👈 Tham số mới!
): {
  matchingScore: number;
  compatibilityScore: number;
  distanceScore: number;
  capacityScore: number;
  timeScore: number;
  estimatedSavings: number;
  warnings: string[];
  conflicts: Array<{...}>;  // 👈 Mới!
}

// ✨ Mới: Tính tải trọng lũy kế cho multi-drop
export function calculateMultiDropCapacity(
  truck: Truck,
  proposedShipments: Shipment[]
): {
  truckId: string;
  totalProposedWeight: number;
  remainingCapacity: number;
  canAcceptAllShipments: boolean;
  shipmentSequence: Array<{
    shipmentId: string;
    weight: number;
    cumulativeWeight: number;
    remainingCapacity: number;  // 👈 Giảm dần!
    canAdd: boolean;
  }>;
}
```

### Frontend Components

#### 3. **`/frontend/components/matching-card.tsx`** (Hoàn toàn mới)

Card matching với giao diện cải tiến:

- **Cảnh báo xung đột**: Banner vàng tại đầu card nếu có xung đột hàng hóa
- **Hiển thị chi tiết**: Tải còn lại (%), Nhiệt độ, Điểm phù hợp
- **Hai nút rõ ràng**:
  - "✓ Chấp nhận ghép" (xanh lá)
  - "💬 Thương lượng giá" (viền)
- **Ô nhập giá**:
  - Chỉ cho phép chữ số
  - Tự động định dạng VND thực tế (1500000 → 1,500,000 VND)
  - Mobile-first responsive

#### 4. **`/frontend/app/matching/page.tsx`** (Cập nhật MatchesSection)

```typescript
<MatchesSection
  isTruckOwner={isTruckOwner}
  detail={detail}
  // ... props khác
/>

// Nội dung:
// ✨ Hiển thị từng đơn hàng phù hợp với:
//   - Badge tỷ lệ tải (%)
//   - Cảnh báo xung đột (nếu có)
//   - Grid chi tiết: khối lượng, giá, trạng thái
//   - Ô nhập giá + Nút "Chấp nhận" + "Thương lượng"
```

---

## 🎯 TIÊU CHÍ MATCHING CHI TIẾT

### 1️⃣ Tuyến Đường Con (Route Sub-segment)

**Quy tắc:** Điểm đi và điểm đến của đơn phải nằm trên lộ trình xe

**Ví dụ:**

```
Đơn hàng: Đà Nẵng → Quy Nhơn (200kg)
Xe chạy: Đà Nẵng → TP.HCM
✅ HỢP LỆ (cả hai điểm nằm trên tuyến, Đà Nẵng trước)

Đơn hàng: Nha Trang → Quy Nhơn
Xe chạy: Đà Nẵng → TP.HCM
❌ KHÔNG HỢP LỆ (điểm khác tuyến)
```

### 2️⃣ Tải Trọng Lũy Kế (Cumulative Capacity)

**Quy tắc:** Mỗi đơn mới phải ≤ tải còn lại của xe (giảm dần)

**Ví dụ:**

```
Xe B: Tải tối đa 700kg
├─ Nhận Đơn A (500kg) → Tải còn lại: 200kg
├─ Nhận Đơn C (150kg) → Tải còn lại: 50kg  ✅
└─ Nhận Đơn D (100kg) → CẤP! (100 > 50)   ❌
```

### 3️⃣ Khoảng Nhiệt Độ (Temperature Overlay)

**Quy tắc:** Khoảng yêu cầu của đơn ⊂ khoảng của xe

**Ví dụ:**

```
Đơn yêu cầu: 12°C - 16°C
Xe hỗ trợ:   10°C - 18°C
✅ HỢP LỆ (12-16 nằm trong 10-18)

Đơn yêu cầu: 12°C - 16°C
Xe hỗ trợ:   14°C - 20°C
❌ KHÔNG HỢP LỆ (12 < 14)
```

---

## ⚠️ HỆ THỐNG CẢNH BÁO XUNG ĐỘT HÀNG HÓA

### Cơ Chế Hoạt Động

1. **Khi lấy danh sách xe phù hợp cho đơn:**
   - Backend tính điểm cho từng xe
   - Kiểm tra nếu xe đã chở hàng nào → lấy danh sách hiện có
   - So sánh hàng mới vs hàng hiện có
   - Nếu xung đột → Thêm vào `conflicts[]`

2. **Frontend nhận phản hồi:**

   ```json
   {
     "matchingScore": 75,
     "warnings": [
       "⚠️ Cảnh báo: Xe đang chở sầu riêng. Việc ghép thêm rau xanh có thể gây ám mùi, hư hỏng hàng hóa!"
     ],
     "conflicts": [
       {
         "type": "goods_odor_conflict",
         "conflictingWith": ["sầu riêng"]
       }
     ]
   }
   ```

3. **UI hiển thị:**
   - Banner vàng tại trên cùng matching card
   - Biểu tượng ⚠️ + Text cảnh báo đỏ chữ
   - Vẫn cho phép người dùng chọn nếu chấp nhận rủi ro
   - Không vô hiệu hóa nút "Chấp nhận ghép"

### Bản Đồ Xung Đột (Incompatibility Map)

| Hàng Có Mùi     | Không Tương Thích Với                                 |
| --------------- | ----------------------------------------------------- |
| 🍌 Sầu riêng    | Rau xanh, rau cuống, bánh kẹo, sữa, trái cây, rau quả |
| 🦐 Hải sản tươi | Rau xanh, bánh kẹo, sữa, trái cây                     |
| 🧂 Mắm tôm      | Rau xanh, bánh kẹo, sữa                               |
| ⚗️ Hóa chất     | Thực phẩm, rau quả, sữa                               |
| 🚗 Xăng/Dầu     | Thực phẩm, rau quả, sữa                               |

---

## 🎨 THIẾT KẾ MOBILE-FIRST RESPONSIVE

### Breakpoints

```typescript
// Tailwind Config
// Mobile: < 640px (sm)
// Tablet: >= 640px
// Desktop: >= 1024px (lg)

// Ví dụ từ matching-card.tsx:
<div className="flex flex-col gap-4 lg:flex-row">
  {/* Mobile: Cột dọc */}
  {/* Desktop: Hàng ngang */}
</div>

<div className="text-base sm:text-lg font-bold">
  {/* Mobile: text-base */}
  {/* Sm+: text-lg */}
</div>

<div className="p-4 sm:p-5">
  {/* Mobile: p-4 (16px) */}
  {/* Sm+: p-5 (20px) */}
</div>
```

### Chiến Lược Hiển Thị

**Trên Mobile (< 640px):**

- Chỉ hiển thị thông tin quan trọng
- Nút lớn dễ bấm (h-9)
- Grid 2 cột cho thông tin chi tiết
- Ô nhập giá chiếm toàn bộ độ rộng

**Trên Tablet/Desktop (≥ 640px):**

- Hiển thị đầy đủ thông tin
- Grid 3-4 cột
- Nút nhỏ hơn (sm:text-base)
- Layout ngang

---

## 🔄 QUY TRÌNH THƯƠNG LƯỢNG GIÁ

### 1. Khi Giá Khớp (Match)

```
Giá đơn hàng: 1.700.000 VND
Giá xe mong muốn: 1.700.000 VND
↓
✓ Chấp nhận ghép
  Tạo Deal với status "PROPOSED"
  Gửi yêu cầu ngay lập tức
```

### 2. Khi Giá Lệch (Mismatch)

```
Giá đơn: 1.700.000 VND
Giá xe: 1.500.000 VND
↓
💬 Thương lượng giá
  ↓
  [Ô nhập giá]  ← Chỉ cho phép số
  1500000 → Hiển thị: "1,500,000 VND"
  ↓
  [Gửi] [Hủy]
  ↓
  Nếu Gửi: Tạo Deal với giá mới
```

### 3. Validation Giá

```typescript
// Frontend
const handleConfirmNegotiate = () => {
  const price = Number(priceInput);
  if (!price || price <= 0) {
    alert("Vui lòng nhập giá hợp lệ");
    return;
  }
  // Gửi API
};

// Backend (API)
const price = Number(req.body.price);
if (price <= 0) {
  throw new HttpError(400, "Giá phải > 0");
}
```

---

## 📱 CÁC API ENDPOINT ĐÃ CẬP NHẬT

### GET /api/matching-context

**Lấy context cho trang matching**

```json
{
  "role": "SHIPPER|CARRIER",
  "myTrucks": [...],
  "myShipments": [...],
  "target": {...},
  "matches": [
    {
      "shipment": {...},
      "truck": {...},
      "matchingScore": 78,
      "compatibilityScore": 85,
      "distanceScore": 95,
      "capacityScore": 72,
      "timeScore": 65,
      "estimatedSavings": 450000,
      "warnings": [
        "Tải trọng vượt quá...",
        "⚠️ Cảnh báo: Xe đang chở sầu riêng..."
      ],
      "conflicts": [
        {
          "type": "goods_odor_conflict",
          "conflictingWith": ["sầu riêng"]
        }
      ]
    }
  ]
}
```

### GET /api/shipments/:shipmentId/matches

**Lấy danh sách xe phù hợp cho đơn hàng**

Thêm trường `conflicts` trong từng match

### GET /api/trucks/:truckId/matches

**Lấy danh sách đơn phù hợp cho xe**

Thêm trường `conflicts` trong từng match

---

## 💾 DATABASE SCHEMA (Không thay đổi)

```prisma
model Shipment {
  id                  String
  cargoType           String           // Loại hàng
  category            String           // Danh mục
  weightKg            Int              // Khối lượng
  requiredTempMin     Int              // Nhiệt độ tối thiểu yêu cầu
  requiredTempMax     Int              // Nhiệt độ tối đa yêu cầu
  pickup              String           // Điểm đi
  dropoff             String           // Điểm đến
  deliveryTime        DateTime         // Hạn chót giao
  proposedPrice       Int              // Giá đề xuất
  strongSmell         Boolean          // Có mùi nặng?
  fragile             Boolean          // Dễ vỡ?
  frozenRequired      Boolean          // Cần đông lạnh?
  specialTemperature  Boolean          // Cần nhiệt độ đặc biệt?
  allowCombine        Boolean          // Cho phép ghép?
}

model Truck {
  id                  String
  type                String           // Loại xe
  plateNumber         String           // Biển số
  maxCapacityKg       Int              // Tải trọng tối đa
  remainingKg         Int              // Tải còn lại
  refrigerated        Boolean          // Có hệ thống lạnh?
  tempMin             Int?             // Nhiệt độ tối thiểu hỗ trợ
  tempMax             Int?             // Nhiệt độ tối đa hỗ trợ
  currentRoute        String           // Tuyến đường hiện tại
  eta                 DateTime         // Giờ dự kiến đến
  active              Boolean          // Đang hoạt động?
}
```

---

## 🚀 CÁCH SỬ DỤNG TRÊN FRONTEND

### 1. Import MatchingCard (Nếu dùng standalone)

```typescript
import { MatchingCard } from "@/components/matching-card";

<MatchingCard
  shipment={shipment}
  truck={truck}
  index={0}
  onAccept={(truckId, shipmentId) => {
    // Gửi yêu cầu chấp nhận
  }}
  onNegotiate={(truckId, shipmentId) => {
    // Mở popup thương lượng
  }}
/>
```

### 2. Dùng MatchesSection (Trên trang matching)

```typescript
import { MatchesSection } from "@/app/matching/page";

<MatchesSection
  isTruckOwner={isTruckOwner}
  detail={detail}
  priceInput={priceInput}
  busyId={busyId}
  requestForPair={requestForPair}
  setPriceInput={setPriceInput}
  sendMatchRequest={sendMatchRequest}
  priceKey={priceKey}
/>
```

### 3. Xử Lý Giá

```typescript
// Chỉ chấp nhận số
const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.replace(/\D/g, "");
  setPriceInput(value);
};

// Định dạng hiển thị
const formatPriceDisplay = (value: string) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(Number(value));
};
```

---

## ✅ DANH SÁCH KIỂM TRA (Checklist)

- [x] Backend: Thuật toán matching với tuyến đường con
- [x] Backend: Kiểm tra tải trọng lũy kế
- [x] Backend: Kiểm tra khoảng nhiệt độ chính xác
- [x] Backend: Danh sách xung đột hàng hóa
- [x] Backend: Hàm `checkGoodsConflict()`
- [x] Frontend: MatchingCard component mới
- [x] Frontend: Cảnh báo xung đột banner
- [x] Frontend: Hai nút rõ ràng (Chấp nhận / Thương lượng)
- [x] Frontend: Ô nhập giá (chỉ số, định dạng VND)
- [x] Frontend: Mobile-first responsive design
- [x] Frontend: API integration
- [x] Text: Hoàn toàn tiếng Việt có dấu

---

## 🔧 TROUBLESHOOTING

### Q: Giá không định dạng VND

**A:** Kiểm tra `formatPriceDisplay()` function sử dụng `Intl.NumberFormat` với locale "vi-VN"

### Q: Xung đột hàng hóa không hiển thị

**A:** Đảm bảo backend truyền `existingShipments` param đến `scoreTruck()`

### Q: Mobile layout bị vỡ

**A:** Kiểm tra Tailwind breakpoints: `flex flex-col sm:flex-row` cho responsive

### Q: Tải trọng không giảm đúng

**A:** Kiểm tra hàm `calculateMultiDropCapacity()` - phải lặp qua từng đơn và trừ weight

---

## 📞 SUPPORT

Để báo lỗi hoặc yêu cầu tính năng, vui lòng tạo issue trên GitHub hoặc liên hệ team development.

---

**Version:** 2.0.0  
**Updated:** 2026-05-25  
**Status:** ✅ Production Ready
