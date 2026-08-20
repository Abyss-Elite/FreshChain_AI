# 🤖 AI Assistant - Hướng Dẫn Chi Tiết

## 1️⃣ AI Assistant Là Gì?

AI Assistant là một **trợ lý hỏi tương tác** giúp người dùng (Shipper/Carrier) **tạo đơn hàng hoàn chỉnh** một cách dễ dàng.

**Thay vì:** Phải điền một biểu mẫu dài với 15+ trường dữ liệu cùng lúc 😰

**AI Assistant:** Hỏi từng câu hỏi một, và tự động kiểm tra thông tin 🤖

---

## 2️⃣ AI Assistant Ở Đâu?

### A. Backend (Phía Máy Chủ)

- **Dịch vụ logic**: `backend/src/services/orderAssistant.ts`
- **API endpoints**: `backend/src/routes/assistant.ts`
- **Database**: Bảng `OrderAssistantSession` và `AssistantMessage`

### B. Frontend (Phía Người Dùng)

- **React Component**: `frontend/components/ai-order-assistant.tsx`
- **UI**: Chat interface - nhìn giống ứng dụng chat

### C. Database Models

```
OrderAssistantSession
├── Lưu thông tin người dùng & session
├── Lưu dữ liệu đơn hàng từng phần
├── Điểm hoàn thành (0-100%)
└── Lịch sử hội thoại

AssistantMessage
├── Lưu tin nhắn từ user
├── Lưu tin nhắn từ AI
└── Lưu các trường được hỏi
```

---

## 3️⃣ AI Assistant Thực Hiện Được Gì?

### 🎯 Các Chức Năng Chính

#### 1. Hỏi Câu Hỏi Tối Ưu

- Hỏi 1 câu tại một thời điểm
- Hỏi câu nào cần trước nhất
- Ví dụ:
  ```
  AI: "Loại hàng hóa của bạn là gì?"
  User: "Rau"
  AI: "Phân loại chi tiết? (vd: Rau sạch, Rau muống, ...)"
  User: "Rau sạch"
  ...
  ```

#### 2. Phân Tích Độ Hoàn Chỉnh

- Theo dõi **% hoàn thành** (0-100%)
- Biết **nên hỏi gì tiếp theo**
- Ví dụ:
  ```
  Sau khi điền loại hàng: 11% hoàn chỉnh
  Sau khi điền phân loại: 22% hoàn chỉnh
  ...
  Khi đủ 100%: Tất cả thông tin đã có ✅
  ```

#### 3. Kiểm Tra Dữ Liệu Tự Động

- Không cho phép thiếu trường thông tin bắt buộc
- Gợi ý thêm thông tin nếu cần
- Ví dụ:
  ```
  ❌ Chưa có:
  - cargoType (loại hàng)
  - category (phân loại)
  - weightKg (khối lượng)
  - ...
  ```

#### 4. Lưu Lịch Sử Hội Thoại

- Mỗi tin nhắn được lưu
- Có thể xem lại cuộc trò chuyện
- Có thể chỉnh sửa lại thông tin

#### 5. Tạo Biểu Mẫu Xác Nhận

- Sau khi hết câu hỏi: Hiển thị **toàn bộ dữ liệu**
- Người dùng **kiểm tra lại** trước khi gửi
- Nếu sai có thể chỉnh sửa

#### 6. Tự Động Tạo Đơn Hàng

- Khi người dùng click "Gửi"
- Tự động tạo **Shipment** trong database
- Đơn hàng sẵn sàng cho xe tải tìm kiếm

---

## 4️⃣ Các Bước Sử Dụng AI Assistant

### 📱 Trên UI Frontend

```
[1] User vào trang "Create Order with AI"
                ↓
[2] Click nút "Start Conversation"
                ↓
[3] AI hỏi: "Loại hàng hóa của bạn là gì?"
    - Có 6 lựa chọn dropdown
                ↓
[4] User chọn "Rau"
                ↓
[5] AI hỏi tiếp: "Phân loại chi tiết?"
    - User nhập "Rau sạch"
                ↓
[6] AI hỏi tiếp: "Khối lượng bao nhiêu kg?"
    - User nhập "500"
                ↓
... (tiếp tục 6-9 câu hỏi)
                ↓
[X] Sau ~10-15 câu hỏi → 100% hoàn chỉnh
                ↓
[Y] Hiển thị form xác nhận với toàn bộ thông tin
    - Loại hàng: Rau
    - Phân loại: Rau sạch
    - Khối lượng: 500 kg
    - Từ: TP.HCM
    - Đến: Đà Nẵng
    - Giao trước: 26/5/2026 10:00
    - Giá: 500,000 đ
    - ...
                ↓
[Z] User click "✅ Gửi Đơn Hàng"
                ↓
✨ Đơn hàng được tạo thành công!
   Mã đơn: SHIP-12345
```

---

## 5️⃣ Các Trường Dữ Liệu Mà AI Hỏi

### 🔴 BẮT BUỘC (9 trường)

1. **cargoType** - Loại hàng (Rau/Hải sản/Thịt/...)
2. **category** - Phân loại (Rau sạch/Cá tươi/...)
3. **weightKg** - Khối lượng (kg)
4. **requiredTempMin** - Nhiệt độ tối thiểu (°C)
5. **requiredTempMax** - Nhiệt độ tối đa (°C)
6. **pickup** - Điểm lấy hàng (TP.HCM/Đà Nẵng/...)
7. **dropoff** - Điểm giao hàng
8. **deliveryTime** - Thời gian giao
9. **proposedPrice** - Giá đề xuất (VND)

### 🟡 TÙY CHỌN (4 trường)

- **strongSmell** - Có mùi mạnh?
- **fragile** - Dễ vỡ?
- **frozenRequired** - Cần đông lạnh?
- **specialTemperature** - Cần xử lý đặc biệt?

---

## 6️⃣ Các API Endpoints Của AI Assistant

### 📡 Backend API (cho lập trình viên)

#### 1. Tạo Session (Bắt Đầu Cuộc Trò Chuyện)

```
POST /api/assistant/sessions
Headers: Authorization: Bearer {token}

Response:
{
  "sessionId": "clu1234567",
  "status": "ACTIVE",
  "completenessScore": 0,
  "isComplete": false,
  "nextQuestion": {
    "question": "Loại hàng hóa của bạn là gì?",
    "fieldName": "cargoType",
    "type": "select",
    "options": ["Rau", "Hải sản", "Thịt", ...]
  }
}
```

#### 2. Gửi Phản Hồi (User Trả Lời)

```
POST /api/assistant/sessions/{sessionId}/messages
Headers: Authorization: Bearer {token}
Body:
{
  "fieldName": "cargoType",
  "value": "Rau",
  "message": "Rau"
}

Response:
{
  "analysis": {
    "completenessScore": 11,
    "missingFields": [...],
    "isComplete": false
  },
  "nextQuestion": {
    "question": "Phân loại chi tiết?",
    "fieldName": "category",
    ...
  },
  "nextMessage": "Phân loại chi tiết hàng hóa? (vd: Rau sạch, ...)"
}
```

#### 3. Xem Lại Đơn Hàng (Trước Khi Gửi)

```
GET /api/assistant/sessions/{sessionId}/review
Headers: Authorization: Bearer {token}

Response:
{
  "summary": {
    "cargoType": "Rau",
    "category": "Rau sạch",
    "weightKg": 500,
    "requiredTempMin": 2,
    "requiredTempMax": 8,
    "pickup": "TP.HCM",
    "dropoff": "Đà Nẵng",
    "deliveryTime": "2026-05-26T10:00:00Z",
    "proposedPrice": 500000,
    ...
  },
  "completenessScore": 100
}
```

#### 4. Gửi Đơn Hàng

```
POST /api/assistant/sessions/{sessionId}/submit
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Order submitted successfully",
  "shipmentId": "ship1234567",
  "shipment": { ... }
}
```

#### 5. Lấy Lịch Sử Hội Thoại

```
GET /api/assistant/sessions/{sessionId}/history
Headers: Authorization: Bearer {token}

Response:
{
  "conversation": [
    {
      "role": "user",
      "content": "Rau"
    },
    {
      "role": "assistant",
      "content": "Phân loại chi tiết?"
    },
    ...
  ]
}
```

#### 6. Bắt Đầu Lại (Tạo Session Mới)

```
POST /api/assistant/sessions/{sessionId}/reset
Headers: Authorization: Bearer {token}

Response:
{
  "newSessionId": "clu9876543",
  "message": "New session started"
}
```

---

## 7️⃣ Cách Hiển Thị AI Assistant Trên Frontend

### 📍 Bước 1: Import Component

```tsx
import { AIOrderAssistant } from "@/components/ai-order-assistant";
```

### 📍 Bước 2: Tạo Page/Route

```tsx
// app/create-order/page.tsx
export default function CreateOrderPage() {
  return (
    <div className="container">
      <h1>Tạo Đơn Hàng Với AI</h1>
      <AIOrderAssistant />
    </div>
  );
}
```

### 📍 Bước 3: Thêm Vào Navigation

```tsx
// components/sidebar.tsx
<Link href="/create-order">🤖 Create with AI Assistant</Link>
```

---

## 8️⃣ Ví Dụ Thực Tế - Quy Trình Đầy Đủ

### Scenario: Chủ Hàng Muốn Gửi Rau Sạch

```
Bước 1: Chủ hàng vào ứng dụng
       → Click "Create Order with AI"

Bước 2: AI hỏi câu 1
       AI: "Loại hàng hóa?"
       User: Chọn "Rau"
       Progress: 11% ✓

Bước 3: AI hỏi câu 2
       AI: "Phân loại?"
       User: Gõ "Rau sạch"
       Progress: 22% ✓

Bước 4: AI hỏi câu 3
       AI: "Khối lượng (kg)?"
       User: Gõ "500"
       Progress: 33% ✓

Bước 5: AI hỏi câu 4-5 (Nhiệt độ)
       AI: "Nhiệt độ tối thiểu?"
       User: "2"
       AI: "Nhiệt độ tối đa?"
       User: "8"
       Progress: 55% ✓

Bước 6: AI hỏi câu 6-7 (Địa điểm)
       AI: "Lấy hàng ở đâu?"
       User: Chọn "TP.HCM"
       AI: "Giao hàng ở đâu?"
       User: Chọn "Đà Nẵng"
       Progress: 77% ✓

Bước 7: AI hỏi câu 8-9 (Thời gian & Giá)
       AI: "Giao trước ngày nào?"
       User: Chọn "26/5/2026 10:00"
       AI: "Giá dự kiến?"
       User: Gõ "500000"
       Progress: 100% ✓ HOÀN CHỈNH!

Bước 8: Xác nhận
       AI hiển thị form xác nhận toàn bộ thông tin
       User kiểm tra lại, tất cả đúng
       Click "✅ Gửi Đơn Hàng"

Bước 9: Hoàn tất ✨
       Đơn hàng được tạo: SHIP-abc123def
       Thông báo: "Chờ xe tải gửi yêu cầu"
```

---

## 9️⃣ So Sánh: Trước & Sau AI Assistant

### ❌ TRƯỚC (Biểu Mẫu Truyền Thống)

```
[Biểu Mẫu Tạo Đơn Hàng]

Loại hàng hóa: [ _______ ]
Phân loại: [ _______ ]
Khối lượng: [ _______ ]
Nhiệt độ min: [ _______ ]
Nhiệt độ max: [ _______ ]
Lấy hàng: [ _______ ]
Giao hàng: [ _______ ]
Giao trước: [ _______ ]
Giá: [ _______ ]
Mùi mạnh: [ ☐ ]
Dễ vỡ: [ ☐ ]
Đông lạnh: [ ☐ ]
Nhiệt độ đặc biệt: [ ☐ ]
Ghi chú: [ _____________ ]

[SUBMIT]

❌ Phải điền cùng lúc 15 trường
❌ Dễ bỏ sót thông tin
❌ Không biết cần gì
❌ Kinh nghiệm user kém
```

### ✅ SAU (AI Assistant)

```
┌─────────────────────────────┐
│ 🤖 AI Assistant             │
│ Hoàn thành: 11%            │
├─────────────────────────────┤
│                             │
│ AI: "Loại hàng hóa của    │
│      bạn là gì?"           │
│                             │
│ [Rau] [Hải sản] [Thịt]  │
│                             │
└─────────────────────────────┘

✅ Hỏi 1 câu tại 1 thời điểm
✅ Không bỏ sót được thông tin
✅ Hướng dẫn rõ ràng
✅ Kinh nghiệm user tốt
✅ Progress bar theo dõi được
```

---

## 🔟 Tóm Tắt

| Khía Cạnh           | Chi Tiết                                                     |
| ------------------- | ------------------------------------------------------------ |
| **Tên**             | AI Order Assistant                                           |
| **Mục đích**        | Giúp user tạo đơn hàng hoàn chỉnh                            |
| **Vị trí Backend**  | `src/services/orderAssistant.ts` + `src/routes/assistant.ts` |
| **Vị trí Frontend** | `components/ai-order-assistant.tsx`                          |
| **Database**        | `OrderAssistantSession`, `AssistantMessage`                  |
| **Cách hoạt động**  | Hỏi từng câu, kiểm tra hoàn chỉnh, tạo đơn hàng              |
| **Số câu hỏi**      | 9-10 câu hỏi bắt buộc + 4 tùy chọn                           |
| **Kết quả**         | Shipment được tạo tự động trong database                     |
| **Lợi ích**         | Trải nghiệm user tốt, không bỏ sót thông tin                 |

---

## ❓ Câu Hỏi Thường Gặp

**Q: AI nó thực sự là AI không?**
A: Không. Đây là một hệ thống hỏi tương tác lập trình sẵn. Nếu muốn thực sự AI (GPT, Claude...), cần tích hợp thêm.

**Q: Tôi có thể tùy chỉnh câu hỏi không?**
A: Có! Edit trong `services/orderAssistant.ts` - hàm `generateNextQuestion()`

**Q: Có thể thêm câu hỏi khác không?**
A: Có! Thêm vào `REQUIRED_FIELDS` hoặc `OPTIONAL_BUT_IMPORTANT` trong `orderAssistant.ts`

**Q: Nó hoạt động ở đâu?**
A: Trên trang `/create-order` hoặc bất kỳ trang nào bạn nhúng component `<AIOrderAssistant />`

**Q: Data được lưu ở đâu?**
A: Trong bảng `OrderAssistantSession` (trong quá trình hỏi) → `Shipment` (khi hoàn thành)
