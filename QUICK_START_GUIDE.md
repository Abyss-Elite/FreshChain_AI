# 🚀 QUICK START GUIDE - Hệ Thống Ghép Hàng Thông Minh

## ⏱️ 5 Phút Setup

### 1️⃣ Backend: Import Dịch Vụ Mới

```typescript
// /backend/src/routes/api.ts

import {
  isTruckEligibleForShipment,
  scoreTruck,
  calculateMultiDropCapacity, // 👈 IMPORT MỚI
} from "../services/matching.js";
```

### 2️⃣ Frontend: Import Component

```typescript
// /frontend/components/matching-card.tsx (đã sẵn có)

import { MatchingCard } from "@/components/matching-card";
```

### 3️⃣ API: Thêm Field `conflicts` vào Response

```typescript
// Backend API response phải có:
{
  matchingScore: number;
  warnings: string[];
  conflicts: Array<{              // 👈 MỚI!
    type: "goods_odor_conflict";
    conflictingWith: string[];
  }>;
}
```

### 4️⃣ Frontend: Render Conflict Warning

```typescript
// Inside MatchesSection or MatchingCard

{match.conflicts && match.conflicts.length > 0 && (
  <div className="mb-3 bg-yellow-100 border border-yellow-300 rounded-md p-3">
    <span className="text-yellow-700 font-semibold">⚠️ Cảnh báo xung đột</span>
    {match.warnings?.filter(w => w.includes("Cảnh báo:")).map((w, idx) => (
      <div key={idx} className="text-sm text-yellow-800 mt-1">{w}</div>
    ))}
  </div>
)}
```

### 5️⃣ Frontend: Price Input Validation

```typescript
// Only digits
const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.replace(/\D/g, "");
  setPriceInput(value);
};

// Format as VND
const display = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
}).format(Number(priceInput));
```

---

## 🧪 Testing Scenarios

### Test 1: Xung Đột Hàng Hóa

```bash
# Xe đã chở sầu riêng
Truck: "Sầu riêng" (700kg)
Remaining: 300kg

# Thêm đơn rau xanh
Shipment: "Rau xanh" (200kg)

# ✅ Expected Result:
# - conflict: { type: "goods_odor_conflict", conflictingWith: ["Sầu riêng"] }
# - warning: "⚠️ Cảnh báo: Xe đang chở sầu riêng..."
# - score: 68 (giảm từ 93)
# - Frontend: Hiển thị banner vàng
```

### Test 2: Không Có Xung Đột

```bash
# Xe chở rau xanh
Truck: "Rau xanh" (200kg)
Remaining: 800kg

# Thêm đơn rau cuống
Shipment: "Rau cuống" (500kg)

# ✅ Expected Result:
# - conflicts: []
# - warnings: []
# - score: 92 (cao)
# - Frontend: Không có banner vàng
```

### Test 3: Giá Khớp vs Lệch

```bash
# Giá Khớp
Shipment price: 1,700,000
Truck expected: 1,700,000
→ Bấm "Chấp nhận ghép" ngay

# Giá Lệch
Shipment price: 1,700,000
Truck expected: 1,500,000
→ Bấm "Thương lượng giá"
→ Nhập: 1500000
→ Hiển thị: 1,500,000 VND
```

---

## 📁 File Changes Summary

### Modified Files

- `/backend/src/services/compatibility.ts` ← **Nâng cấp toàn bộ**
- `/backend/src/services/matching.ts` ← **Viết lại**
- `/backend/src/routes/api.ts` ← **Cập nhật text**
- `/frontend/components/matching-card.tsx` ← **Mới hoàn toàn**
- `/frontend/app/matching/page.tsx` ← **Cập nhật MatchesSection**

### New Documentation Files

- `MULTI_DROP_MATCHING_IMPLEMENTATION.md` (📖 Hướng dẫn đầy đủ)
- `EXAMPLE_MATCHES_SECTION.tsx` (💡 Ví dụ thực tế)
- `GOODS_CONFLICT_DETECTION_EXAMPLES.ts` (💡 3 scenarios)
- `PRICE_NEGOTIATION_EXAMPLES.ts` (💡 Thương lượng)

---

## 🔍 Debug Checklist

### Backend

- [ ] `/backend/src/services/compatibility.ts` import `INCOMPATIBLE_GOODS_MAP`?
- [ ] `evaluateCompatibility()` nhận `existingShipments` param?
- [ ] `checkGoodsConflict()` trả về `{ hasConflict, conflictItems }`?
- [ ] API routes include `conflicts` trong response?

### Frontend

- [ ] `matching-card.tsx` render banner khi `conflicts.length > 0`?
- [ ] Price input chỉ chấp nhận số (replace `/\D/g`)?
- [ ] Format VND sử dụng `Intl.NumberFormat("vi-VN", ...)`?
- [ ] Mobile: `flex flex-col sm:flex-row` responsive?

### Network

- [ ] API endpoint trả về `conflicts` field?
- [ ] Cảnh báo text đúng Tiếng Việt?
- [ ] No console errors?

---

## ⚡ Performance Tips

### Backend

```typescript
// ✅ GOOD: Một lần query
const existingShipments = await prisma.shipment.findMany({
  where: {
    /* matched với truck */
  },
});
scoreTruck(newShipment, truck, existingShipments);

// ❌ BAD: N+1 query
for (const shipment of shipments) {
  const existing = await loadExistingShipments(truck);
  scoreTruck(shipment, truck, existing); // Mỗi vòng lặp query 1 lần!
}
```

### Frontend

```typescript
// ✅ GOOD: Memoize format function
const formatPrice = useCallback((value: string) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(value));
}, []);

// ✅ GOOD: Debounce input
const [priceInput, setPriceInput] = useState("");
const debouncedFormat = useMemo(
  () => debounce(() => formatPrice(priceInput), 200),
  [priceInput, formatPrice],
);
```

---

## 🎬 Live Demo Script

Để demo hệ thống hoạt động:

1. **Setup Data**: Tạo xe với hàng xung đột

   ```bash
   # Xe 1: Sầu riêng 700kg
   POST /api/trucks
   {
     "type": "Xe lạnh",
     "plateNumber": "51A-999.99",
     "maxCapacityKg": 1000,
     "remainingKg": 300,
     "cargoType": "Sầu riêng",
     "weightKg": 700
   }
   ```

2. **Tạo Đơn Xung Đột**

   ```bash
   # Đơn rau xanh
   POST /api/shipments
   {
     "cargoType": "Rau xanh",
     "category": "Nông sản",
     "weightKg": 200,
     "pickup": "Đà Lạt",
     "dropoff": "TP.HCM",
     "proposedPrice": 1200000
   }
   ```

3. **Check Matching**

   ```bash
   GET /api/shipments/{shipmentId}/matches

   # ✅ Response có conflicts!
   ```

4. **Frontend Demo**
   - Mở trang `/matching`
   - Chọn đơn rau xanh
   - Thấy xe xung đột với banner vàng ⚠️
   - Nhập giá: `1500000` → format: `1,500,000 VND`
   - Bấm "Chấp nhận ghép"

---

## 🚨 Common Mistakes

### ❌ Sai 1: Quên pass `existingShipments`

```typescript
// SAI:
scoreTruck(shipment, truck);

// ĐÚNG:
scoreTruck(shipment, truck, existingShipmentsOnTruck);
```

### ❌ Sai 2: Input price không validate

```typescript
// SAI:
<Input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />

// ĐÚNG:
<Input
  value={priceInput}
  onChange={(e) => setPriceInput(e.target.value.replace(/\D/g, ""))}
/>
```

### ❌ Sai 3: Không format VND display

```typescript
// SAI:
<div>{priceInput}</div>  // → 1500000 (xấu!)

// ĐÚNG:
<div>{new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND"
}).format(Number(priceInput))}</div>  // → 1,500,000 VND ✅
```

### ❌ Sai 4: Mobile layout cứng nhắc

```typescript
// SAI:
<div className="flex items-center gap-4">  // Mặc định desktop!
  <Button />
  <Button />
</div>

// ĐÚNG:
<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  {/* Mobile: cột dọc */}
  {/* Tablet+: hàng ngang */}
</div>
```

---

## 📞 FAQ

**Q: Có cần cập nhật database?**  
A: Không. Mã hiện tại dùng các field có sẵn.

**Q: Conflict detection hoạt động offline được không?**  
A: Không. Cần backend xử lý logic `checkGoodsConflict()`.

**Q: Có thể tự thêm hàng xung đột không?**  
A: Có! Update `INCOMPATIBLE_GOODS_MAP` trong `/backend/src/services/compatibility.ts`

**Q: Mobile UI có hoạt động trên iPhone 6 (320px)?**  
A: Có. `flex flex-col` cho mobile guarantee full width.

**Q: Làm sao test trên device thực?**  
A: `npm run dev`, sau đó truy cập từ mobile: `http://<computer-ip>:3000`

---

## 🎓 Next Steps

1. ✅ **Read**: `MULTI_DROP_MATCHING_IMPLEMENTATION.md`
2. ✅ **Copy**: Code từ các file example
3. ✅ **Test**: Chạy các scenarios trên
4. ✅ **Deploy**: Push lên production

---

## 💬 Feedback & Support

Nếu có vấn đề:

1. Check console log (browser DevTools)
2. Check network tab (API responses)
3. Đọc các file ví dụ
4. Xem troubleshooting guide

---

**Happy coding! 🚀**

---

**Last Updated:** 2026-05-25  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
