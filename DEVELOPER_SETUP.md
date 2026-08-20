# 🛠️ FreshChain - Developer Setup Guide (Enhanced Version)

## 📦 Prerequisites

Before starting, ensure you have:

- Node.js 18+
- PostgreSQL 12+
- Git
- npm or yarn

---

## 🚀 Quick Setup

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd Start\ up

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Back to root
cd ..
```

### 2. Setup Environment Variables

#### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/freshchain"
JWT_SECRET="your-secret-key-here"
PORT=5000
NODE_ENV="development"
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_APP_NAME="FreshChain"
```

### 3. Database Setup

```bash
cd backend

# Create migration for new models (if not already done)
npx prisma migrate dev --name add_assistant_and_negotiation

# Seed database (optional)
npx prisma db seed

# Verify Prisma client
npx prisma generate
```

### 4. Start Services

#### Terminal 1: Backend

```bash
cd backend
npm start

# Should see:
# Server running on http://localhost:5000
```

#### Terminal 2: Frontend

```bash
cd frontend
npm run dev

# Should see:
# http://localhost:3000
```

---

## 🧪 Testing Features

### Test AI Assistant

**URL:** `http://localhost:3000/ai-assistant`

**Flow:**

1. Click "Bắt Đầu Cuộc Hội Thoại"
2. Answer questions one by one
3. Complete all 9 required fields
4. Review form appears at 100%
5. Click "✅ Gửi Đơn Hàng"
6. Check database: new Shipment should be created

**Expected Results:**

```
✅ Session created
✅ Questions generated correctly
✅ Progress shows 0% → 100%
✅ Review form displays all data
✅ Shipment created in database
✅ Status shows success message
```

### Test Negotiation Flow

**Setup:**

1. Create account as **Shipper**
2. Create account as **Carrier**
3. Shipper: Create order using AI Assistant
4. Carrier: Browse shipments

**Flow:**

1. Carrier: Click order → "💭 Tạo Đề Nghị"
2. Carrier: Enter price (e.g., 500,000) → Send
3. Shipper: Check notifications → See offer
4. Shipper: Options appear:
   - ✅ Accept
   - 💭 Counter-offer
   - ❌ Reject
5. Shipper: Choose counter-offer → Enter new price
6. Carrier: See new offer → Respond again
7. Continue until prices match

**Expected Results:**

```
✅ Deal created with Round 1
✅ Multiple rounds can be created
✅ Price history tracked
✅ Status updates correctly
✅ Final price recorded when matched
✅ UI shows timeline of all rounds
```

---

## 📊 Database Schema (Verification)

```bash
# View all tables
npx prisma db push --skip-generate

# Inspect schema
npx prisma studio

# Then check these tables:
# - OrderAssistantSession
# - AssistantMessage
# - NegotiationRound
# - Deal
```

---

## 🔍 API Testing

### Using Postman/cURL

#### 1. Create Assistant Session

```bash
curl -X POST http://localhost:5000/api/assistant/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

**Expected Response:**

```json
{
  "sessionId": "cln123abc",
  "status": "ACTIVE",
  "completenessScore": 0,
  "isComplete": false,
  "nextQuestion": {
    "question": "Loại hàng hóa của bạn là gì?",
    "fieldName": "cargoType",
    "type": "select",
    "options": ["Rau", "Hải sản", ...],
    "required": true
  },
  "summary": "Cần thêm 9 thông tin"
}
```

#### 2. Send Response to Assistant

```bash
curl -X POST http://localhost:5000/api/assistant/sessions/SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fieldName": "cargoType",
    "value": "Rau",
    "message": "Rau"
  }'
```

**Expected Response:**

```json
{
  "sessionId": "cln123abc",
  "analysis": {
    "completenessScore": 11,
    "missingFields": ["category", "weightKg", ...],
    "isComplete": false
  },
  "nextQuestion": {
    "question": "Phân loại chi tiết?",
    "fieldName": "category",
    ...
  },
  "completenessScore": 11,
  "isComplete": false
}
```

#### 3. Get Review Data

```bash
curl -X GET http://localhost:5000/api/assistant/sessions/SESSION_ID/review \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**

```json
{
  "sessionId": "cln123abc",
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

#### 4. Submit Order

```bash
curl -X POST http://localhost:5000/api/assistant/sessions/SESSION_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Order submitted successfully",
  "shipmentId": "ship_123abc",
  "shipment": {
    "id": "ship_123abc",
    "cargoType": "Rau",
    "status": "PENDING",
    ...
  }
}
```

---

## 🐛 Troubleshooting

### Issue: Database Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:5432

Solution:
1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in .env
3. Check credentials are correct
4. Restart PostgreSQL service
```

### Issue: Prisma Client Not Generated

```
Error: @prisma/client not found

Solution:
cd backend
npm install
npx prisma generate
```

### Issue: API Responses 401 Unauthorized

```
Error: Missing or invalid token

Solution:
1. Get valid JWT token from login endpoint
2. Include in Authorization header: Bearer YOUR_TOKEN
3. Check token is not expired
```

### Issue: AI Questions Not Appearing

```
Error: nextQuestion is null

Solution:
1. Check analyzeOrderCompleteness() returns correct missingFields
2. Verify generateNextQuestion() matches field names
3. Check database session was created
```

### Issue: Multiple Negotiation Rounds Not Working

```
Error: Can't create Round 2

Solution:
1. Check NegotiationRound table exists
2. Verify respondToNegotiation() logic
3. Check roundNumber increments correctly
```

---

## 📈 Performance Tips

### Optimize Database Queries

```typescript
// ✅ Good: Use include for relations
const deal = await prisma.deal.findUnique({
  where: { id: dealId },
  include: {
    negotiationRounds: { orderBy: { createdAt: "asc" } },
  },
});

// ❌ Bad: Multiple queries
const deal = await prisma.deal.findUnique({ where: { id: dealId } });
const rounds = await prisma.negotiationRound.findMany({ where: { dealId } });
```

### Add Indexes for Common Queries

```prisma
// In schema.prisma
model OrderAssistantSession {
  id     String   @id @default(cuid())
  userId String
  status String

  @@index([userId])
  @@index([status])
}

model NegotiationRound {
  id     String @id @default(cuid())
  dealId String
  roundNumber Int

  @@index([dealId])
  @@unique([dealId, roundNumber])
}
```

---

## 🚀 Deployment

### Build for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run start
```

### Using Docker (Optional)

```dockerfile
# Create Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "start"]
```

---

## 📝 Code Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── orderAssistant.ts     ← AI logic
│   │   └── negotiation.ts         ← Negotiation logic
│   ├── routes/
│   │   ├── assistant.ts           ← AI endpoints
│   │   └── negotiation.ts         ← Negotiation endpoints
│   ├── middleware/
│   │   └── auth.ts                ← Auth validation
│   └── server.ts                  ← Main server
├── prisma/
│   ├── schema.prisma              ← DB schema
│   └── migrations/                ← DB migrations

frontend/
├── components/
│   ├── ai-order-assistant.tsx     ← AI UI
│   ├── negotiation-flow.tsx       ← Negotiation UI
│   └── ui/                        ← Reusable components
├── app/
│   ├── page.tsx                   ← Home page
│   ├── ai-assistant/              ← AI routes
│   └── negotiation/               ← Negotiation routes
└── lib/
    └── api.ts                     ← API calls
```

---

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL running
- [ ] .env files configured
- [ ] Database migrations applied
- [ ] Backend starts without errors
- [ ] Frontend connects to API
- [ ] AI Assistant creates sessions
- [ ] Negotiation creates deals
- [ ] Multiple rounds can be created
- [ ] Review form displays correctly
- [ ] Shipments created after submission

---

## 📞 Support Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version

# View logs
tail -f backend.log

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

---

## 🎓 Next Steps

1. ✅ Set up development environment
2. ✅ Test AI Assistant flow
3. ✅ Test Negotiation flow
4. ✅ Review database schema
5. ⭕ Add more features (email notifications, etc.)
6. ⭕ Optimize performance
7. ⭕ Deploy to production

---

**Happy Coding! 🚀**

For issues or questions, check logs and verify all prerequisites are met.
