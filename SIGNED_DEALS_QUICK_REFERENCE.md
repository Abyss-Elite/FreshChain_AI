# 🚀 QUICK START - SIGNED DEALS FEATURE

## What's New? (Có gì mới?)

Một tính năng quản lý **Hợp Đồng Đã Ký Kết** cho phép người dùng xem danh sách tất cả các giao dịch vận chuyển đã hoàn tất thương lượng giá (status = ACCEPTED).

---

## ✅ Files Modified/Created

### Backend

- ✅ **[backend/src/routes/negotiation.ts](backend/src/routes/negotiation.ts)** - Route `GET /api/negotiation/deals/signed`

### Frontend

- ✅ **[frontend/lib/api.ts](frontend/lib/api.ts)** - API function `getSignedDeals()`
- ✅ **[frontend/app/signed-deals/page.tsx](frontend/app/signed-deals/page.tsx)** - UI Component

---

## 🎯 How It Works

### Backend (Node.js/Express)

```
GET /api/negotiation/deals/signed
├─ Middleware: requireAuth (check JWT token)
├─ Middleware: requireRole("SHIPPER", "CARRIER", "ADMIN")
├─ Filter by role:
│  ├─ SHIPPER: shipment.ownerId === userId
│  ├─ CARRIER: truck.ownerId === userId
│  └─ ADMIN: no filter
└─ Return: { success, count, total, deals[] }
```

### Frontend (React)

```
Page Load
├─ useEffect() → fetchSignedDeals()
├─ API Call → GET /api/negotiation/deals/signed
├─ State: [loading, error, deals]
├─ Render:
│  ├─ Loading: Spinner
│  ├─ Error: Error card with retry
│  ├─ Empty: "Chưa có hợp đồng"
│  └─ List: Grid of deal cards (2 columns)
└─ Features:
   ├─ Refresh button
   ├─ Role-based title display
   ├─ VND currency formatting
   └─ Contact info (phone number)
```

---

## 📊 Data Structure

### API Response

```json
{
  "success": true,
  "count": 5,
  "total": 10,
  "deals": [
    {
      "id": "deal_abc123",
      "status": "ACCEPTED",
      "finalPrice": 1500000,
      "shipment": {
        "cargoType": "Thực phẩm tươi",
        "weightKg": 500,
        "pickup": "Hà Nội",
        "dropoff": "Hải Phòng",
        "owner": { "name": "Công ty ABC", "phoneNumber": "0901234567" }
      },
      "truck": {
        "plateNumber": "29A-12345",
        "type": "Xe tải 5 tấn",
        "owner": { "name": "Nhà xe XYZ", "phoneNumber": "0987654321" }
      },
      "latestRound": {
        /* negotiation round */
      },
      "createdAt": "2026-05-20T10:00:00Z"
    }
  ]
}
```

---

## 🎨 UI Features

### States

| State   | Display                           |
| ------- | --------------------------------- |
| Loading | Spinner + "Đang tải..."           |
| Error   | Red error card + "Thử lại" button |
| Empty   | "Chưa có hợp đồng" message        |
| Success | Grid of deal cards (2 columns)    |

### Role-based Display

```
CARRIER (Chủ xe):
├─ Title: "Xe của bạn đã nhận chở đơn hàng"
├─ Highlight: Truck info first
└─ Show: Shipper contact

SHIPPER (Chủ hàng):
├─ Title: "Đơn hàng của bạn đã được vận chuyển"
├─ Highlight: Shipment info first
└─ Show: Carrier contact

ADMIN (Quản trị):
├─ Title: "Liên kết thành công"
├─ Show: All info equally
└─ No filter
```

### Card Layout

```
╔════════════════════════════════════════╗
║ Header (Gradient)                      ║
║ [ID] [✓ĐÃ KÝ KẾT] [Date]              ║
║ Dynamic Title by Role                  ║
╠════════════════════════════════════════╣
║ Route Info: PickUp → DropOff           ║
╠════════════════════════════════════════╣
║ 2-Column Grid:                         ║
║ ┌──────────────┐ ┌──────────────┐    ║
║ │ Shipment     │ │ Truck        │    ║
║ │ Cargo Type   │ │ Plate Number │    ║
║ │ Weight (kg)  │ │ Type         │    ║
║ │ Shipper Name │ │ Carrier Name │    ║
║ │ Shipper Phone│ │ Carrier Phone│    ║
║ └──────────────┘ └──────────────┘    ║
╠════════════════════════════════════════╣
║ 💰 Final Price: 1.500.000 ₫            ║
║ Round #: 3                             ║
╚════════════════════════════════════════╝
```

---

## 🔐 Authentication & Authorization

### Token Requirements

```typescript
// 1. User must have valid JWT token
localStorage.getItem("token");

// 2. Token sent in header
headers: {
  Authorization: `Bearer ${token}`;
}

// 3. Backend verifies token
jwt.verify(token, JWT_SECRET);
```

### Access Control

```typescript
// Only SHIPPER, CARRIER, ADMIN can access
if (!["SHIPPER", "CARRIER", "ADMIN"].includes(userRole)) {
  throw new HttpError(403, "Forbidden");
}

// Data filtered by role
if (userRole === "SHIPPER") {
  // Only see deals with shipment owned by this user
  whereClause.shipment = { ownerId: userId };
}

if (userRole === "CARRIER") {
  // Only see deals with truck owned by this user
  whereClause.truck = { ownerId: userId };
}

if (userRole === "ADMIN") {
  // See all deals
}
```

---

## 🧪 Testing

### Manual Testing

```bash
# 1. Login as SHIPPER
- Navigate to /signed-deals
- Should see only your shipments

# 2. Login as CARRIER
- Navigate to /signed-deals
- Should see only your trucks

# 3. Login as ADMIN
- Navigate to /signed-deals
- Should see all deals

# 4. Test states
- No deals: See empty state
- API error: See error card with retry
- Has deals: See grid of cards
```

### API Testing

```bash
# Test endpoint directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/negotiation/deals/signed

# With pagination
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/negotiation/deals/signed?limit=20&offset=0"
```

---

## 🛠️ Common Tasks

### Add More Columns to Card

Edit [frontend/app/signed-deals/page.tsx](frontend/app/signed-deals/page.tsx) → Add fields to JSX

### Change Grid Layout (e.g., 3 columns)

```tsx
// Change this:
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

// To this (3 columns on XL):
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
```

### Modify Filters

Edit [backend/src/routes/negotiation.ts](backend/src/routes/negotiation.ts) → whereClause logic

### Change Pagination Limit

```typescript
// Default is 20, max is 100
const limit = Math.min(Number(req.query.limit) || 20, 100);

// Change 20 to desired value:
const limit = Math.min(Number(req.query.limit) || 50, 100);
```

---

## 🐛 Troubleshooting

| Issue                  | Cause                           | Solution                                       |
| ---------------------- | ------------------------------- | ---------------------------------------------- |
| 401 Unauthorized       | No token or invalid token       | Login again, check localStorage                |
| 403 Forbidden          | Wrong role                      | Check user.role, must be SHIPPER/CARRIER/ADMIN |
| 404 Not Found          | API route not registered        | Verify negotiationRouter is used in server.ts  |
| "Chưa có hợp đồng"     | No ACCEPTED deals in DB         | Create a deal and accept it                    |
| Prices not formatted   | API response missing finalPrice | Check backend normalization                    |
| Role title not showing | User context not loaded         | Wait for useUser() to load                     |

---

## 📝 Environment Setup

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/freshchain
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 🚀 Deployment

1. Ensure backend is running on port 4000
2. Ensure frontend API URL points to backend
3. Ensure JWT_SECRET is set on backend
4. Run database migrations: `npx prisma migrate deploy`
5. Build frontend: `npm run build`
6. Start frontend: `npm run start`

---

## 📚 File References

| File                                                        | Purpose                                 |
| ----------------------------------------------------------- | --------------------------------------- |
| [negotiation.ts](backend/src/routes/negotiation.ts#L287)    | GET /api/negotiation/deals/signed route |
| [api.ts](frontend/lib/api.ts#L108)                          | getSignedDeals() API function           |
| [signed-deals/page.tsx](frontend/app/signed-deals/page.tsx) | UI component                            |
| [auth.ts](backend/src/middleware/auth.ts)                   | Auth middleware                         |
| [schema.prisma](backend/prisma/schema.prisma)               | Database models                         |

---

## 💡 Tips & Tricks

1. **Pagination**: Use `limit` & `offset` to handle large datasets
2. **Refresh**: Click button to refresh without page reload
3. **Debugging**: Check browser DevTools Network tab for API response
4. **Performance**: Component uses `useCallback` to prevent unnecessary re-renders
5. **Accessibility**: All icons have text labels for clarity

---

## 📞 Need Help?

Check full documentation: [SIGNED_DEALS_IMPLEMENTATION_GUIDE.md](SIGNED_DEALS_IMPLEMENTATION_GUIDE.md)

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-05-26
