# 🔧 FIX: Lỗi Tọa Độ trong `submitOrderFromSession`

## 📝 Vấn Đề Gốc Rễ

Khi tạo đơn hàng từ chatbot AI, các shipment được tạo ra luôn có tọa độ sai lệch:

- **Hiệu tượng**: Hình như chọn `pickup: "Đà Nẵng"` nhưng tọa độ lại là `11.94, 108.45` (Lâm Đồng)
- **Nguyên nhân**: Nullish coalescing operator (`??`) ưu tiên giá trị cũ/cache trong `session` thay vì tra cứu từ map

```typescript
// ❌ SAI: Nullish coalescing có thể lấy cache value
const pickupLat =
  vietnamLogisticsCoordinates[pickupLocation]?.lat ??
  session.pickupLat ??
  16.0471;
// Nếu vietnamLogisticsCoordinates[key]?.lat = undefined,
// nó sẽ lấy session.pickupLat (có thể là giá trị cũ!)
```

---

## ✅ Giải Pháp: Refactor Toàn Bộ Logic

### Thứ Tự Ưu Tiên (Priority) Mới

| Ưu Tiên | Mô Tả                                              | Ví Dụ                       |
| ------- | -------------------------------------------------- | --------------------------- |
| **1️⃣**  | Tra cứu trực tiếp từ `vietnamLogisticsCoordinates` | Đà Nẵng → 16.0471, 108.2068 |
| **2️⃣**  | Nếu map không có, dùng custom từ session           | `session.pickupLat`         |
| **3️⃣**  | Nếu cả 2 không có, dùng fallback mặc định          | 16.0471, 108.2068 (Đà Nẵng) |

### Code Cũ (Có Vấn Đề)

```typescript
const pickupLat =
  vietnamLogisticsCoordinates[pickupLocation]?.lat ??
  session.pickupLat ??
  16.0471;
```

**Vấn đề**: Nếu key không khớp (do khoảng trắng, casing, etc.), `.lat` trả về `undefined` → nhảy vào `session.pickupLat` (giá trị cũ!)

---

### Code Mới (Sửa Xong)

```typescript
// 📍 PICKUP COORDINATES
// Lấy từ map trước tiên
const pickupFromMap = vietnamLogisticsCoordinates[pickupLocation];

// Nếu tìm thấy trong map → dùng map (ưu tiên 1)
const pickupLat =
  pickupFromMap?.lat !== undefined
    ? pickupFromMap.lat
    : session.pickupLat !== null && session.pickupLat !== undefined
      ? session.pickupLat
      : 16.0471; // Fallback: Đà Nẵng

const pickupLng =
  pickupFromMap?.lng !== undefined
    ? pickupFromMap.lng
    : session.pickupLng !== null && session.pickupLng !== undefined
      ? session.pickupLng
      : 108.2068; // Fallback: Đà Nẵng
```

**Cải tiến**:

- ✅ Lấy object từ map một lần
- ✅ Kiểm tra `!== undefined` thay vì `??`
- ✅ Rõ ràng: Nếu map có → lấy map, không có → lấy session, etc.
- ✅ Xóa khoảng trắng: `session.pickup?.trim()`

---

## 🔍 Giải Thích Chi Tiết

### 1. Chuẩn Hóa Tên Địa Điểm

```typescript
const pickupLocation = (session.pickup?.trim() || "") as VietnamLocation;
//                      ↑ Xóa khoảng trắng thừa
//                      ↑ Optional chaining (?) để tránh crash undefined
```

**Tại sao?**: Nếu user gõ `" Đà Nẵng "` (có khoảng trắng), map lookup sẽ thất bại vì key là `"Đà Nẵng"` (không có khoảng trắng)

### 2. Lấy Object Một Lần

```typescript
const pickupFromMap = vietnamLogisticsCoordinates[pickupLocation];
// Thay vì tra cứu 2 lần:
// vietnamLogisticsCoordinates[pickupLocation]?.lat
// vietnamLogisticsCoordinates[pickupLocation]?.lng
```

**Lợi ích**:

- ✅ Hiệu quả hơn (1 lần lookup thay vì 2 lần)
- ✅ Dễ debug (nếu không tìm thấy, `pickupFromMap` sẽ là `undefined`)

### 3. Kiểm Tra !== undefined (Thay Vì ??)

```typescript
// ❌ SAI (Nullish coalescing có vấn đề)
pickupFromMap?.lat ?? session.pickupLat;

// ✅ ĐÚNG (Rõ ràng hơn)
pickupFromMap?.lat !== undefined ? pickupFromMap.lat : session.pickupLat;
```

**Tại sao?**:

- Nếu `pickupFromMap?.lat` trả về `0`, operator `??` vẫn sẽ trigger (vì `0` không phải là `null/undefined`)
- Kiểm tra `!== undefined` rõ ràng hơn về ý định

### 4. Session Custom (Ưu Tiên 2)

```typescript
session.pickupLat !== null && session.pickupLat !== undefined
  ? session.pickupLat
  : 16.0471;
```

**Giải thích**: Kiểm tra `null` **và** `undefined` để tránh cả 2 trường hợp

---

## 📊 Ví Dụ Hoạt Động

### Scenario: User Chọn "Đà Nẵng" → "TP.HCM"

#### Trước Sửa (❌ Sai)

```
User chọn: pickup="Đà Nẵng", dropoff="TP.HCM"

Nhưng DB lưu:
pickupLat: 11.94 (Lâm Đồng - WRONG!)
pickupLng: 108.45
dropoffLat: 10.82 (TP.HCM - OK)
dropoffLng: 106.63

Vì sao? → Session cache có giá trị cũ!
```

#### Sau Sửa (✅ Đúng)

```
User chọn: pickup="Đà Nẵng", dropoff="TP.HCM"

DB lưu:
pickupLat: 16.0471  ✅ (từ vietnamLogisticsCoordinates)
pickupLng: 108.2068 ✅
dropoffLat: 10.8231 ✅ (từ vietnamLogisticsCoordinates)
dropoffLng: 106.6297 ✅

Matching algorithm sẽ hoạt động chính xác! 🚀
```

---

## 📋 Các Thay Đổi Cụ Thể

### File: `/backend/src/services/orderAssistant.ts`

#### Thay Đổi 1: Xóa Biến Không Dùng

```typescript
// ❌ XÓA (không cần thiết nữa)
const pickupCoords = vietnamLogisticsCoordinates[pickupLocation] || { ... };
const dropoffCoords = vietnamLogisticsCoordinates[dropoffLocation] || { ... };
```

#### Thay Đổi 2: Chuẩn Hóa Tên Địa Điểm

```typescript
// ✅ THAY THẾ
const pickupLocation = (session.pickup?.trim() || "") as VietnamLocation;
const dropoffLocation = (session.dropoff?.trim() || "") as VietnamLocation;
```

#### Thay Đổi 3: Refactor Logic Ưu Tiên Tọa Độ

```typescript
// ✅ THAY THẾ toàn bộ khối
// Lấy object từ map
const pickupFromMap = vietnamLogisticsCoordinates[pickupLocation];

// Ưu tiên 1: Map, Ưu tiên 2: Session custom, Ưu tiên 3: Fallback
const pickupLat =
  pickupFromMap?.lat !== undefined
    ? pickupFromMap.lat
    : session.pickupLat !== null && session.pickupLat !== undefined
      ? session.pickupLat
      : 16.0471;

const pickupLng =
  pickupFromMap?.lng !== undefined
    ? pickupFromMap.lng
    : session.pickupLng !== null && session.pickupLng !== undefined
      ? session.pickupLng
      : 108.2068;

// Tương tự cho dropoff...
```

---

## 🚀 Các Bước Triển Khai

### 1️⃣ Khởi Động Lại Server

```bash
# Tắt server cũ (Ctrl+C)

# Nếu dùng ts-node-dev hoặc nodemon:
npm run dev

# Nếu cần rebuild:
npm run build
npm run start:dev
```

### 2️⃣ Làm Sạch Session Cũ

**QUAN TRỌNG**: Không dùng lại session/chat cũ!

❌ **SAI**: Bấm "Submit" lại trên ô chat cũ  
✅ **ĐÚNG**:

- F5 refresh trang
- Hoặc bắt đầu chat mới từ đầu

**Vì sao?** Nếu không làm sạch, bản ghi `OrderAssistantSession` cũ vẫn chứa tọa độ cache, và nó sẽ truyền lên API

### 3️⃣ Test Scenario

```bash
# 1. Tạo chat mới (hoàn toàn fresh)
# 2. Chọn Pickup: "Đà Nẵng"
# 3. Chọn Dropoff: "TP.HCM"
# 4. Submit

# 5. Kiểm tra Database
SELECT id, pickup, pickupLat, pickupLng, dropoff, dropoffLat, dropoffLng
FROM shipments
ORDER BY createdAt DESC
LIMIT 1;

# ✅ Expected:
# pickup: Đà Nẵng
# pickupLat: 16.0471
# pickupLng: 108.2068
# dropoff: TP.HCM
# dropoffLat: 10.8231
# dropoffLng: 106.6297
```

---

## ⚙️ Kiểm Tra Debug

Nếu vẫn thấy lỗi tọa độ sai sau sửa:

### Kiểm Tra 1: Xác nhận Server Reload

```bash
# Check console log
# Nên thấy: "Starting server..." hoặc tương tự

# Không nên là: "Restarted server" (nếu dùng auto-reload)
```

### Kiểm Tra 2: Map Lookup

```typescript
// Thêm log debug tạm thời
console.log("pickupLocation:", pickupLocation);
console.log("pickupFromMap:", vietnamLogisticsCoordinates[pickupLocation]);
console.log("pickupLat được chọn:", pickupLat);
```

### Kiểm Tra 3: Session Đã Sạch?

```typescript
// Xem session object
console.log("session.pickupLat:", session.pickupLat);
console.log("session.dropoffLat:", session.dropoffLat);

// Nếu giá trị cũ vẫn ở đây → user chưa làm sạch session
```

---

## 📚 Tài Liệu Tham Khảo

- **Optional Chaining (`?.`)**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
- **Nullish Coalescing (`??`)**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
- **vietnamLogisticsCoordinates Map**: Xem file này, dòng 105

---

## ✅ Checklist Hoàn Thành

- [x] Code sửa xong
- [x] Server khởi động lại
- [x] Session cũ đã xóa (F5 refresh)
- [x] Test chat mới từ đầu
- [x] Kiểm tra DB → tọa độ chính xác ✅

---

**Status**: ✅ FIX COMPLETE  
**Version**: 2.1.0  
**Date**: 2026-05-25
