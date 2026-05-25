# 🚀 FreshChain AI - Implementation Guide

## ✅ What's Been Implemented

### 1. **AI Assistant for Order Creation**

A conversational AI system that guides users through creating complete orders step-by-step.

**Files Created:**

- `backend/src/services/orderAssistant.ts` - Core assistant logic
- `backend/src/routes/assistant.ts` - API endpoints
- `frontend/components/ai-order-assistant.tsx` - React UI component

**Key Features:**

- Analyzes order completeness (0-100 score)
- Generates optimal follow-up questions
- Tracks conversation history
- Auto-calculates missing fields
- Provides review form before submission
- Creates Shipment upon completion

---

### 2. **Multiple Rounds of Price Negotiation**

Support for unlimited negotiation rounds between shippers and carriers.

**Files Created:**

- `backend/src/services/negotiation.ts` - Negotiation logic
- `backend/src/routes/negotiation.ts` - API endpoints
- `frontend/components/negotiation-flow.tsx` - React UI component

**Key Features:**

- Tracks unlimited negotiation rounds
- Records all price proposals and counters
- Automatic deal completion when prices match
- Support for accepting/countering/rejecting
- Full price history tracking
- Message attachments per round

---

### 3. **Database Schema Updates**

**Modified Tables:**

- `Deal` - Restructured to use NegotiationRound model
- `User` - Added relation to OrderAssistantSession

**New Tables:**

- `NegotiationRound` - Tracks individual negotiation attempts
- `OrderAssistantSession` - Tracks AI assistant interactions
- `AssistantMessage` - Stores conversation history

**New Enums:**

- `NegotiationRoundStatus` - PENDING, RESPONDED, WAITING_FOR_COUNTER, COMPLETED
- `AssistantSessionStatus` - ACTIVE, PENDING_REVIEW, SUBMITTED, COMPLETED

---

## 📋 Quick Setup Guide

### Step 1: Database Migration

```bash
cd backend

# Generate Prisma client for new models
npx prisma generate

# Apply migration to your PostgreSQL database
npx prisma migrate deploy

# Or create and apply in one step:
npx prisma migrate dev --name add_assistant_and_negotiation
```

### Step 2: Update Backend Server

The routes have already been integrated into `backend/src/server.ts`:

```typescript
import { assistantRouter } from "./routes/assistant.js";
import { negotiationRouter } from "./routes/negotiation.js";

// Routes are mounted:
app.use("/api/assistant", assistantRouter);
app.use("/api/negotiation", negotiationRouter);
```

### Step 3: Install/Update Frontend Components

The React components are ready to use in your frontend:

1. **For AI Assistant UI:**

   ```tsx
   import { AIOrderAssistant } from "@/components/ai-order-assistant";

   export default function CreateOrderPage() {
     return <AIOrderAssistant />;
   }
   ```

2. **For Negotiation UI:**

   ```tsx
   import { NegotiationFlow } from "@/components/negotiation-flow";

   export default function NegotiationPage({ dealId }: { dealId: string }) {
     return <NegotiationFlow dealId={dealId} />;
   }
   ```

### Step 4: Verify Everything Works

```bash
# Backend
cd backend
npm run dev  # Should show routes for /api/assistant and /api/negotiation

# Frontend (in another terminal)
cd frontend
npm run dev  # Visit http://localhost:3000
```

---

## 📊 API Quick Reference

### AI Assistant Endpoints

- `POST /api/assistant/sessions` - Create/get session
- `POST /api/assistant/sessions/{id}/messages` - Send user response
- `GET /api/assistant/sessions/{id}/review` - Get review data
- `POST /api/assistant/sessions/{id}/submit` - Submit order
- `GET /api/assistant/sessions/{id}/history` - Get conversation
- `POST /api/assistant/sessions/{id}/reset` - Start new session

### Negotiation Endpoints

- `POST /api/negotiation/deals` - Create deal & start negotiation
- `GET /api/negotiation/deals/{id}` - Get deal with all rounds
- `POST /api/negotiation/deals/{id}/rounds/{rid}/respond` - Counter-offer
- `POST /api/negotiation/deals/{id}/rounds/{rid}/accept` - Accept price
- `GET /api/negotiation/shipments/{id}/negotiations` - Get all deals
- `POST /api/negotiation/deals/{id}/reject` - Reject negotiation

---

## 🔄 User Flow Examples

### Flow 1: Creating Order with AI Assistant

```
User clicks "Create Order with AI"
  ↓
POST /api/assistant/sessions
  ← AI asks: "Loại hàng hóa?"
  ↓
User: "Rau"
  ↓
POST /api/assistant/sessions/{id}/messages (cargoType: "Rau")
  ← AI asks: "Phân loại chi tiết?"
  ↓
User: "Rau sạch"
  ↓
POST /api/assistant/sessions/{id}/messages (category: "Rau sạch")
  ← AI asks: "Khối lượng?"
  ↓
... (continue until completenessScore = 100)
  ↓
GET /api/assistant/sessions/{id}/review
  ← Shows review form
  ↓
User clicks "✅ Gửi Đơn Hàng"
  ↓
POST /api/assistant/sessions/{id}/submit
  ← Shipment created! ✅
```

### Flow 2: Price Negotiation

```
Carrier finds matching Shipment
  ↓
POST /api/negotiation/deals
{
  shipmentId: "...",
  truckId: "...",
  proposedPrice: 500000
}
  ← Deal created, Round 1 created
  ↓
Shipper sees offer: 500,000 đ
  ↓
Shipper thinks price is too high
  ↓
POST /api/negotiation/deals/{id}/rounds/{rid}/respond
{
  counterPrice: 480000
}
  ← Round 1 completed, Round 2 created
  ↓
Carrier sees counter: 480,000 đ
  ↓
Carrier thinks price is acceptable
  ↓
POST /api/negotiation/deals/{id}/rounds/{rid}/accept
  ← Deal completed! Final price: 480,000 đ ✅
```

---

## 🧪 Testing

### Test AI Assistant

```bash
curl -X POST http://localhost:5000/api/assistant/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Negotiation

```bash
curl -X POST http://localhost:5000/api/negotiation/deals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "...",
    "truckId": "...",
    "proposedPrice": 500000
  }'
```

---

## 📂 Files Structure

```
freshchain-ai/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── orderAssistant.ts        ✨ NEW
│   │   │   ├── negotiation.ts            ✨ NEW
│   │   │   ├── matching.ts               (existing)
│   │   │   └── compatibility.ts          (existing)
│   │   ├── routes/
│   │   │   ├── assistant.ts              ✨ NEW
│   │   │   ├── negotiation.ts            ✨ NEW
│   │   │   ├── api.ts                    (updated)
│   │   │   └── auth.ts                   (existing)
│   │   ├── server.ts                     (updated)
│   │   └── ...
│   ├── prisma/
│   │   ├── schema.prisma                 (updated)
│   │   ├── migrations/
│   │   │   ├── add_assistant_and_negotiation/
│   │   │   │   └── migration.sql         ✨ NEW
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── frontend/
│   ├── components/
│   │   ├── ai-order-assistant.tsx        ✨ NEW
│   │   ├── negotiation-flow.tsx          ✨ NEW
│   │   └── ...
│   └── ...
├── AI_ASSISTANT_AND_NEGOTIATION_GUIDE.md ✨ NEW
└── IMPLEMENTATION_GUIDE.md                ✨ NEW
```

---

## 🎯 Required Fields for Order Completion

### Must Fill (9 fields)

1. **cargoType** - Type of cargo (text/select)
2. **category** - Detailed category (text)
3. **weightKg** - Weight in kilograms (number)
4. **requiredTempMin** - Min temperature (number)
5. **requiredTempMax** - Max temperature (number)
6. **pickup** - Pickup location (select)
7. **dropoff** - Delivery location (select)
8. **deliveryTime** - Delivery deadline (date)
9. **proposedPrice** - Initial price VND (number)

### Optional but Important

- **strongSmell** - Has strong smell?
- **fragile** - Is fragile?
- **frozenRequired** - Needs freezing?
- **specialTemperature** - Special handling?
- **notes** - Additional notes

---

## 🔐 Security Notes

✅ All endpoints require JWT authentication  
✅ Users can only access their own sessions  
✅ Users can only negotiate for their shipments  
✅ Price validation on all negotiation endpoints  
✅ Completeness validation before order submission

---

## 📞 Support & Documentation

### Full Documentation

- See `AI_ASSISTANT_AND_NEGOTIATION_GUIDE.md` for complete API reference

### Code Examples

- AI Assistant: `frontend/components/ai-order-assistant.tsx`
- Negotiation: `frontend/components/negotiation-flow.tsx`

### Backend Services

- Assistant Logic: `backend/src/services/orderAssistant.ts`
- Negotiation Logic: `backend/src/services/negotiation.ts`

---

## ⚠️ Common Issues & Solutions

### Issue: Migration fails

**Solution:**

```bash
# Ensure PostgreSQL is running
# Check DATABASE_URL in .env
npx prisma migrate resolve --rolled-back
npx prisma migrate dev --name add_assistant_and_negotiation
```

### Issue: Routes not working

**Solution:**

```bash
# Make sure imports are in server.ts
# Restart backend server
npm run dev
```

### Issue: Components not found

**Solution:**

```bash
# Ensure ui components exist (button, card, input, etc.)
# They should be in frontend/components/ui/
```

---

## 🚀 Next Steps

1. **Database:** Run migration to create tables
2. **Backend:** Start server (routes auto-loaded)
3. **Frontend:** Copy components to your UI
4. **Test:** Use the provided flow examples
5. **Customize:** Modify questions/fields as needed

---

## 📝 Notes

- All prices are in VND (Vietnamese Dong)
- Timestamps use ISO 8601 format
- Completeness score is percentage (0-100)
- Sessions can be resumed before submission
- Negotiation rounds can be unlimited
- Price must be integer (no decimals)

---

## ✨ That's It!

Your FreshChain AI platform now has:

- ✅ AI-guided order creation
- ✅ Multi-round price negotiation
- ✅ Full conversation history
- ✅ Automatic deal completion
- ✅ Comprehensive order tracking

Start using it and let users create orders and negotiate prices like never before! 🎉
