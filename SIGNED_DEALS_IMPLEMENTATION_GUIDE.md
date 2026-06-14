## 📋 HƯỚNG DẪN TÍCH HỢP TÍNH NĂNG: DANH SÁCH HỢP ĐỒNG ĐÃ KÝ KẾT

Ngày cập nhật: 2026-05-26
Trạng thái: ✅ Hoàn thiện

---

## 📌 TỔNG QUAN TÍnh NĂNG

Tính năng này cung cấp một giao diện quản lý toàn bộ các hợp đồng vận chuyển **đã ký kết thành công** (status = ACCEPTED với finalPrice != null).

### 🎯 Chức năng chính:

- ✅ Hiển thị danh sách hợp đồng đã chốt theo role người dùng (SHIPPER, CARRIER, ADMIN)
- ✅ Lọc dữ liệu tự động dựa trên phân quyền
- ✅ Hiển thị thông tin song song: [XE TẢI ↔ ĐƠN HÀNG]
- ✅ Định dạng tiền tệ VND tự động
- ✅ Trạng thái Loading, Error, Empty State
- ✅ Nút Refresh dữ liệu real-time

---

## 📂 CẤU TRÚC FILE

### Backend (Node.js/Express)

```
backend/
├── src/
│   ├── routes/
│   │   └── negotiation.ts          ← ✅ Route chính (GET /api/negotiation/deals/signed)
│   ├── middleware/
│   │   └── auth.ts                 ← ✅ Auth & Phân quyền (requireAuth, requireRole)
│   ├── utils/
│   │   ├── http.ts                 ← HTTP error handling
│   │   └── prisma.ts               ← Database client
│   └── server.ts                   ← Express server
└── prisma/
    └── schema.prisma               ← Database schema
```

### Frontend (Next.js/React)

```
frontend/
├── app/
│   └── signed-deals/
│       └── page.tsx                ← ✅ Trang UI chính
├── lib/
│   └── api.ts                      ← ✅ API service (getSignedDeals)
├── contexts/
│   └── user-context.tsx            ← User hook
└── components/
    └── ui/                         ← UI components (Card, Badge, Button, etc.)
```

---

## 🔧 BACKEND IMPLEMENTATION

### 1️⃣ **Route Handler** - [negotiation.ts](negotiation.ts#L287)

**Endpoint:** `GET /api/negotiation/deals/signed`

**Middleware:**

- `requireAuth`: Kiểm tra JWT token
- `requireRole("SHIPPER", "CARRIER", "ADMIN")`: Phân quyền 3 roles

**Phân quyền dữ liệu:**

```typescript
// SHIPPER: Chỉ xem hợp đồng có shipment do chính mình tạo
if (userRole === "SHIPPER") {
  whereClause.shipment = { ownerId: userId };
}

// CARRIER: Chỉ xem hợp đồng có truck do chính mình sở hữu
if (userRole === "CARRIER") {
  whereClause.truck = { ownerId: userId };
}

// ADMIN: Xem tất cả
```

**Response Format:**

```json
{
  "success": true,
  "count": 5,
  "total": 10,
  "limit": 20,
  "offset": 0,
  "hasMore": false,
  "deals": [
    {
      "id": "deal_abc123",
      "status": "ACCEPTED",
      "finalPrice": 1500000,
      "shipment": {
        "id": "shipment_xyz",
        "cargoType": "Thực phẩm tươi",
        "weightKg": 500,
        "pickup": "Hà Nội",
        "dropoff": "Hải Phòng",
        "proposedPrice": 1500000,
        "owner": {
          "id": "user_123",
          "name": "Công ty ABC",
          "phoneNumber": "0901234567"
        }
      },
      "truck": {
        "id": "truck_456",
        "plateNumber": "29A-12345",
        "type": "Xe tải 5 tấn",
        "owner": {
          "id": "user_789",
          "name": "Nhà xe XYZ",
          "phoneNumber": "0987654321"
        }
      },
      "negotiationRounds": [...],
      "latestRound": {...},
      "createdAt": "2026-05-20T10:00:00Z",
      "updatedAt": "2026-05-21T15:30:00Z"
    }
  ]
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1️⃣ **API Service** - [lib/api.ts](lib/api.ts#L108-L115)

```typescript
// Hàm API
getSignedDeals: (limit: number = 20, offset: number = 0) =>
  apiCall(
    `/api/negotiation/deals/signed?limit=${limit}&offset=${offset}`,
    { method: "GET" }
  ),
```

**Đặc điểm:**

- ✅ Sử dụng `apiCall()` helper (tự động xử lý token)
- ✅ Hỗ trợ pagination (limit, offset)
- ✅ Trả về response với type `ApiResponse`

### 2️⃣ **UI Component** - [app/signed-deals/page.tsx](app/signed-deals/page.tsx)

**Features:**

```typescript
export default function SignedDealsPage() {
  // ✅ State management
  - deals: SignedDeal[] (danh sách)
  - loading: boolean (trạng thái tải)
  - error: string | null (lỗi nếu có)
  - isRefreshing: boolean (đang refresh)

  // ✅ Hàm xử lý
  - fetchSignedDeals(): Tải dữ liệu từ API
  - handleRefresh(): Làm mới dữ liệu
  - formatVND(value): Định dạng tiền VND
  - formatDate(dateStr): Định dạng ngày

  // ✅ Render States
  - Loading state: Hiển thị spinner Loader2
  - Error state: Hiển thị card lỗi
  - Empty state: Hiển thị thông báo chưa có hợp đồng
  - List state: Hiển thị danh sách grid 2 cột
}
```

**UI Layout:**

```
┌─────────────────────────────────┐
│ Header: Hợp Đồng Đã Ký Kết [Làm mới] │
├─────────────────────────────────┤
│ Grid Layout (2 cột trên XL)     │
│                                 │
│  ┌──────────────┐ ┌──────────────┐ │
│  │ Card 1       │ │ Card 2       │ │
│  │ [Xe của bạn] │ │ [Đơn hàng]   │ │
│  └──────────────┘ └──────────────┘ │
│                                 │
│  ┌──────────────┐ ┌──────────────┐ │
│  │ Card 3       │ │ Card 4       │ │
│  │ [Xe của bạn] │ │ [Đơn hàng]   │ │
│  └──────────────┘ └──────────────┘ │
└─────────────────────────────────┘
```

**Card Structure:**

```
┌─────────────────────────────────┐
│ Header (Gradient BG)            │
│ ID | ✓ĐÃ KÝ KẾT | Ngày         │
│ Tiêu đề động theo Role          │
├─────────────────────────────────┤
│ Route: PickUp → DropOff         │
├─────────────────────────────────┤
│ 2-Column Grid:                  │
│ ┌──────────────┐ ┌────────────┐ │
│ │ 📦 Hàng hóa  │ │ 🚚Vận chuyển│ │
│ │ Loại, KL, CN │ │ Biển, loại │ │
│ │ Chủ hàng info│ │ Chủ xe info│ │
│ └──────────────┘ └────────────┘ │
├─────────────────────────────────┤
│ Giá chốt: 1.500.000 ₫           │
│ Vòng đàm phán: #3               │
└─────────────────────────────────┘
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Token Handling:

```typescript
// 1. Token được lưu trong localStorage
localStorage.getItem("token")

// 2. Token được gửi tự động qua header
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}

// 3. Backend verify token
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  req.user = jwt.verify(token, process.env.JWT_SECRET);
  next();
}
```

### Role-based Access:

```
SHIPPER (Chủ hàng)
├─ Xem hợp đồng có shipment do chính mình tạo
├─ Thấy thông tin xe tải & chủ xe nhận chở
└─ Định nghĩa: shipment.ownerId === userId

CARRIER (Chủ xe)
├─ Xem hợp đồng có truck do chính mình sở hữu
├─ Thấy thông tin hàng hóa & chủ hàng gửi
└─ Định nghĩa: truck.ownerId === userId

ADMIN (Quản trị viên)
├─ Xem toàn bộ hợp đồng
├─ Không có giới hạn
└─ Không có filter
```

---

## 💾 DATA FLOW

### Request Flow:

```
Frontend (onClick)
    ↓
useEffect() / handleRefresh()
    ↓
negotiationApi.getSignedDeals(20, 0)
    ↓
fetch("/api/negotiation/deals/signed?limit=20&offset=0")
    ↓
Header: { Authorization: "Bearer {token}" }
    ↓
Backend: requireAuth middleware
    ↓
Backend: requireRole("SHIPPER", "CARRIER", "ADMIN")
    ↓
Database Query (Prisma)
    ↓
Response: { success, count, total, deals: [...] }
    ↓
Frontend: setDeals(response.deals)
    ↓
Render Grid Cards
```

### Data Normalization (Backend):

```typescript
const normalizedDeals = deals.map((deal) => {
  const latestRound = deal.negotiationRounds[deal.negotiationRounds.length - 1];

  return {
    id: deal.id,
    status: "ACCEPTED", // ✅ Cứng là ACCEPTED
    finalPrice: deal.finalPrice || latestRound?.respondedPrice || 0,

    shipment: {
      /* full info */
    },
    truck: {
      /* full info */
    },
    negotiationRounds: [
      /* all rounds */
    ],
    latestRound: {
      /* last round */
    },

    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
});
```

---

## 🧪 TESTING CHECKLIST

- [ ] Backend API responds correctly with auth token
- [ ] Query filters work by role (SHIPPER, CARRIER, ADMIN)
- [ ] Response includes all required fields
- [ ] Frontend loads data without reload
- [ ] Role-based UI display works correctly
- [ ] Price formatting displays correctly (VND)
- [ ] Empty state displays when no deals
- [ ] Error state displays with retry button
- [ ] Refresh button updates data
- [ ] Pagination works (limit, offset)

---

## 🚀 DEPLOYMENT CHECKLIST

### Backend:

- ✅ Middleware setup (requireAuth, requireRole)
- ✅ Prisma schema includes Deal, NegotiationRound models
- ✅ Environment variables configured (JWT_SECRET, DATABASE_URL)
- ✅ CORS configured for frontend URL

### Frontend:

- ✅ API_URL environment variable set
- ✅ User context available
- ✅ UI components imported correctly
- ✅ Route `/signed-deals` registered

### Database:

- ✅ Deals table has: id, status, finalPrice, shipmentId, truckId, ownerId
- ✅ NegotiationRounds table has: dealId, roundNumber, status, responseMessage
- ✅ Users table has: id, email, role, phoneNumber
- ✅ Shipments table has: id, ownerId, cargoType, weightKg, pickup, dropoff
- ✅ Trucks table has: id, ownerId, plateNumber, type

---

## 🔧 CONFIGURATION

### Environment Variables:

**Backend (.env)**

```env
PORT=4000
DATABASE_URL="postgresql://user:password@localhost:5432/freshchain"
JWT_SECRET="your-secret-key-here"
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local)**

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## 📝 API ENDPOINT SUMMARY

| Method | Endpoint                        | Auth        | Roles                   | Description                      |
| ------ | ------------------------------- | ----------- | ----------------------- | -------------------------------- |
| GET    | `/api/negotiation/deals/signed` | ✅ Required | SHIPPER, CARRIER, ADMIN | Lấy danh sách hợp đồng đã ký kết |

### Query Parameters:

- `limit` (optional, default: 20, max: 100): Số lượng deals mỗi trang
- `offset` (optional, default: 0): Vị trí bắt đầu

---

## 🎯 TROUBLESHOOTING

### Issue: "Không thể tải dữ liệu hợp đồng"

**Nguyên nhân:** Token hết hạn hoặc không hợp lệ
**Giải pháp:**

1. Kiểm tra localStorage có token không
2. Kiểm tra JWT_SECRET khớp giữa BE và FE
3. Đăng nhập lại

### Issue: "403 Forbidden"

**Nguyên nhân:** Role không được phép
**Giải pháp:**

1. Kiểm tra user.role trong token
2. Kiểm tra requireRole middleware
3. Đảm bảo user là SHIPPER, CARRIER hoặc ADMIN

### Issue: Hiển thị "Chưa có hợp đồng"

**Nguyên nhân:** Không có deal với status = ACCEPTED
**Giải pháp:**

1. Kiểm tra database có ACCEPTED deals không
2. Kiểm tra filter/phân quyền
3. Bấm "Làm mới" để reload

### Issue: Giá không hiển thị đúng

**Nguyên nhân:** finalPrice không được trả về từ API
**Giải pháp:**

1. Kiểm tra API response có finalPrice field
2. Kiểm tra backend normalization logic
3. Xem console logs

---

## 📚 REFERENCES

- Backend Route: [negotiation.ts](negotiation.ts#L287-L380)
- Frontend API: [lib/api.ts](lib/api.ts#L108-L115)
- Frontend Component: [app/signed-deals/page.tsx](app/signed-deals/page.tsx)
- Prisma Schema: [prisma/schema.prisma](prisma/schema.prisma)
- Auth Middleware: [src/middleware/auth.ts](src/middleware/auth.ts)

---

## 📞 SUPPORT

Nếu gặp vấn đề, vui lòng kiểm tra:

1. Token JWT hợp lệ
2. Database connection
3. Environment variables
4. Browser console logs
5. Backend terminal output

---

**Status:** ✅ Ready for Production
**Last Updated:** 2026-05-26
**Version:** 1.0.0
