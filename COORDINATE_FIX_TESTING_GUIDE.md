# 🧪 TESTING GUIDE: Xác Thực Fix Lỗi Tọa Độ

## 📋 Pre-Requisites

Trước khi test, đảm bảo:

- ✅ Code đã được sửa (xem `COORDINATE_FIX_DETAILED_DIFF.md`)
- ✅ Server đã restart (`npm run dev`)
- ✅ Database vẫn kết nối bình thường

---

## 🧪 Test Scenario 1: Đà Nẵng → TP.HCM

### Bước 1: Khởi Động Lại Server

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Expect**:

```
✅ [server listening on port 4000]
✅ [frontend running on http://localhost:3000]
```

---

### Bước 2: Làm Sạch Session Cũ

```bash
# Browser → F5 (refresh)
# Hoặc: Ctrl+Shift+Delete (xóa cache)
```

**Vì sao?** Nếu không làm sạch, `OrderAssistantSession` cũ vẫn chứa tọa độ cache.

---

### Bước 3: Tạo Chat Mới (Hoàn Toàn Fresh)

**Bước A: Vào trang AI Assistant**

```
URL: http://localhost:3000/create-order-ai
(Hoặc tìm trang chatbot/AI)
```

**Bước B: Tạo đơn từ đầu**

```
Bot: "Xin chào, bạn cần gửi hàng gì?"
Bạn: "Tôi muốn gửi rau xanh"

Bot: "Loại hàng là gì?"
Bạn: "Rau xanh"

Bot: "Danh mục?"
Bạn: "Nông sản"

Bot: "Khối lượng bao nhiêu kg?"
Bạn: "200"

Bot: "Điểm đi ở đâu?"
Bạn: "Đà Nẵng"  ← QUAN TRỌNG!

Bot: "Điểm đến ở đâu?"
Bạn: "TP.HCM"    ← QUAN TRỌNG!

Bot: "Yêu cầu nhiệt độ?"
Bạn: "5 đến 15 độ C"

Bot: "Hạn chót giao hàng?"
Bạn: "2026-05-26"

Bot: "Giá đề xuất?"
Bạn: "1200000"

Bot: "Bạn có đổi ý gì không?"
Bạn: "Không"

Bot: "Gửi đơn hàng!"
```

---

### Bước 4: Submit Đơn Hàng

**Trên UI Chatbot**:

```
[✓ Submit/Confirm button]
```

**Expect Console**:

```
✅ orderCreated: { id, shipmentId, ... }
✅ redirect to /dashboard
```

---

### Bước 5: Kiểm Tra Database

**Terminal 3: Database Check**

```bash
# Nếu dùng PostgreSQL
psql -U your_user -d your_db -c \
"SELECT id, pickup, pickupLat, pickupLng, dropoff, dropoffLat, dropoffLng, createdAt
 FROM shipments
 ORDER BY createdAt DESC
 LIMIT 1;"

# Output nên là:
# ┌────────────────────────────────────────────────────┐
# │ id    │ pickup │ pickupLat │ pickupLng │ dropoff │ dropoffLat │ dropoffLng │ createdAt   │
# ├───────┼────────┼───────────┼───────────┼─────────┼────────────┼────────────┼─────────────┤
# │ ship_ │ Đà     │ 16.0471   │ 108.2068  │ TP.HCM  │ 10.8231    │ 106.6297   │ 2026-05-... │
# │ ...   │ Nẵng   │           │           │         │            │            │             │
# └────────────────────────────────────────────────────┘
```

**✅ PASS nếu**:

```
pickupLat = 16.0471  (Đà Nẵng - ĐÚNG!)
pickupLng = 108.2068 (Đà Nẵng - ĐÚNG!)
dropoffLat = 10.8231 (TP.HCM - ĐÚNG!)
dropoffLng = 106.6297 (TP.HCM - ĐÚNG!)
```

**❌ FAIL nếu**:

```
pickupLat = 11.94    (SAI - Lâm Đồng)
pickupLng = 108.45
```

---

## 🧪 Test Scenario 2: Khánh Hòa → Cần Thơ

### Bước 1-4: Tương Tự (tạo chat mới)

```
Pickup: "Khánh Hòa"
Dropoff: "Cần Thơ"
```

### Bước 5: Kiểm Tra Database

```bash
psql ... -c \
"SELECT pickup, pickupLat, pickupLng, dropoff, dropoffLat, dropoffLng
 FROM shipments
 WHERE pickup = 'Khánh Hòa'
 ORDER BY createdAt DESC LIMIT 1;"
```

**Expected**:

```
pickup: Khánh Hòa
pickupLat: 12.2388  ✅
pickupLng: 109.1967 ✅
dropoff: Cần Thơ
dropoffLat: 10.0452 ✅
dropoffLng: 105.7469 ✅
```

---

## 🧪 Test Scenario 3: Matching Algorithm Hoạt Động

### Bước 1: Đảm Bảo Có Xe Trống

```bash
# Check có xe phù hợp không
psql ... -c \
"SELECT id, currentRoute, remainingKg FROM trucks
 WHERE active = true
 LIMIT 5;"
```

**Expect**: Có ít nhất 1 xe đang hoạt động

### Bước 2: Vào Trang Matching

```
URL: http://localhost:3000/matching
```

### Bước 3: Check Matches

**Nếu pickup/dropoff tọa độ ĐÚNG**:

```
✅ matches array sẽ có dữ liệu
✅ Mỗi match hiển thị score, warnings, etc.
```

**Nếu pickup/dropoff tọa độ SAI (như cũ)**:

```
❌ matches: []  (rỗng vì route không khớp!)
```

---

## 🐛 Debug Checklist

### Nếu Tọa Độ Vẫn Sai

#### 1️⃣ Server Restart?

```bash
# Check console
# Nên thấy: "Starting server..." hoặc tương tự

# ❌ SAI: "Server restarted" (nodemon auto-reload)
```

**Fix**:

```bash
# Tắt (Ctrl+C) rồi bật lại
npm run dev
```

#### 2️⃣ Session Được Làm Sạch?

```bash
# Check Browser
# Cookies → Application tab → localStorage

# ❌ SAI: Vẫn có sessionId cũ
# ✅ ĐÚNG: Trống (sau F5)
```

**Fix**:

```
F5 refresh hoặc Ctrl+Shift+Delete (xóa cache)
```

#### 3️⃣ Tạo Chat Mới?

```bash
# Check OrderAssistantSession table
psql ... -c "SELECT id, status, pickup, pickupLat FROM order_assistant_sessions
             ORDER BY createdAt DESC LIMIT 3;"
```

**❌ SAI**:

```
id: session_old (status: SUBMITTED, pickupLat: 11.94)
id: session_new (status: ..., pickupLat: NULL) ← Dùng cái cũ!
```

**✅ ĐÚNG**:

```
id: session_new (status: SUBMITTED, pickupLat: 16.0471) ← Mới, tọa độ chuẩn
```

**Fix**: Bắt đầu chat **hoàn toàn mới** (không dùng chat cũ)

#### 4️⃣ Code Sửa Đã Deploy?

```bash
# Check file
cat backend/src/services/orderAssistant.ts | grep -A 20 "pickupFromMap"

# ❌ SAI: Không thấy "pickupFromMap"
# ✅ ĐÚNG: Thấy code mới
```

**Fix**:

```bash
# Sao chép code sửa từ COORDINATE_FIX_DETAILED_DIFF.md
# Paste vào file
# Save
# Restart server
```

#### 5️⃣ Kiểm Tra Map

```bash
# Thêm log debug tạm thời
// Ở hàm submitOrderFromSession, thêm:
console.log("pickupLocation:", pickupLocation);
console.log("pickupFromMap:", vietnamLogisticsCoordinates[pickupLocation]);

# Restart server, submit đơn, check console
```

**Expect**:

```
pickupLocation: Đà Nẵng
pickupFromMap: { lat: 16.0471, lng: 108.2068 }
```

**❌ SAI**:

```
pickupLocation: (something undefined-like)
pickupFromMap: undefined
```

---

## 📊 Kết Quả Expected

### ✅ PASS

```
Test Case 1: Đà Nẵng → TP.HCM
  pickupLat: 16.0471 ✅
  pickupLng: 108.2068 ✅
  dropoffLat: 10.8231 ✅
  dropoffLng: 106.6297 ✅
  Matching: Có results ✅

Test Case 2: Khánh Hòa → Cần Thơ
  pickupLat: 12.2388 ✅
  pickupLng: 109.1967 ✅
  dropoffLat: 10.0452 ✅
  dropoffLng: 105.7469 ✅

All tests passed! 🎉
```

### ❌ FAIL

```
Test Case 1: Đà Nẵng → TP.HCM
  pickupLat: 11.94 ❌ (Should be 16.0471)
  pickupLng: 108.45 ❌ (Should be 108.2068)
  Matching: matches: [] ❌
```

---

## 📞 Troubleshooting

| Vấn Đề          | Nguyên Nhân                     | Giải Pháp         |
| --------------- | ------------------------------- | ----------------- |
| Tọa độ vẫn sai  | Server chưa restart             | `npm run dev`     |
| Tọa độ vẫn sai  | Session cũ không xóa            | F5 refresh        |
| Tọa độ vẫn sai  | Code chưa update                | Copy code từ DIFF |
| Matches rỗng    | Tọa độ sai nên route không khớp | Fix tọa độ trước  |
| Error undefined | Code chưa trim() location       | Update code       |

---

## 📝 Report Template

Khi test xong, ghi lại:

```markdown
## Test Results

**Date**: 2026-05-25
**Tester**: [Tên]
**Test Case**: Đà Nẵng → TP.HCM

### Database Check
```

SELECT id, pickup, pickupLat, pickupLng, dropoff, dropoffLat, dropoffLng
FROM shipments ORDER BY createdAt DESC LIMIT 1;

```

### Result
- pickupLat: 16.0471 ✅
- pickupLng: 108.2068 ✅
- dropoffLat: 10.8231 ✅
- dropoffLng: 106.6297 ✅

### Matching
- matches: 5 results ✅
- route_compatible: true ✅

### Status
✅ PASS - All tests passed!
```

---

**Happy Testing! 🚀**
