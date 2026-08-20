# FreshChain AI - New Features Documentation

## 🆕 Features Added

### 1. AI Assistant for Order Creation

An intelligent AI assistant helps users create complete orders by:

- Analyzing what information is missing from their order
- Asking optimal follow-up questions to gather required data
- Tracking completeness score (0-100%)
- Guiding users step-by-step until all required fields are filled
- Providing a review form before final submission

### 2. Multiple Rounds of Price Negotiation

Instead of a single offer/counter-offer, the system now supports:

- Unlimited negotiation rounds between shippers and carriers
- Each round tracks proposed and responded prices
- History of all negotiation attempts
- Automatic deal completion when both parties agree on a price
- Support for accepting, rejecting, or countering offers

---

## 📊 Database Schema Changes

### New Tables

#### `OrderAssistantSession`

Tracks AI assistant interactions with users for order creation.

```prisma
model OrderAssistantSession {
  id                    String          @id @default(cuid())
  userId                String          // User creating the order
  status                AssistantSessionStatus  // ACTIVE, PENDING_REVIEW, SUBMITTED, COMPLETED

  // Incrementally collected order data
  cargoType             String?
  category              String?
  weightKg              Int?
  requiredTempMin       Int?
  requiredTempMax       Int?
  pickup                String?
  dropoff               String?
  deliveryTime          DateTime?
  proposedPrice         Int?
  notes                 String?
  strongSmell           Boolean?
  fragile               Boolean?
  frozenRequired        Boolean?
  specialTemperature    Boolean?
  allowCombine          Boolean?
  compatibilityNote     String?

  // Completion tracking
  completenessScore     Float           // 0-100%
  missingFields         String[]        // List of fields still needed
  conversationHistory   AssistantMessage[]

  submittedShipmentId   String?         // References created Shipment
  submittedAt           DateTime?
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
}
```

#### `AssistantMessage`

Stores conversation history between user and AI assistant.

```prisma
model AssistantMessage {
  id                  String          @id @default(cuid())
  sessionId           String
  session             OrderAssistantSession @relation(...)
  role                String          // "user" or "assistant"
  content             String          // Message content
  suggestedFields     String[]        // Fields the assistant asked about
  createdAt           DateTime        @default(now())
}
```

#### `NegotiationRound`

Tracks individual rounds of price negotiation.

```prisma
model NegotiationRound {
  id                String        @id @default(cuid())
  dealId            String
  deal              Deal          @relation(...)
  roundNumber       Int           // 1, 2, 3, ...
  proposedPrice     Int           // Original offer
  respondedPrice    Int?          // Counter-offer
  status            NegotiationRoundStatus  // PENDING, RESPONDED, WAITING_FOR_COUNTER, COMPLETED
  proposedBy        String        // "SHIPPER" or "CARRIER"
  respondedBy       String?       // "SHIPPER" or "CARRIER"
  message           String?       // Optional message with the proposal
  responseMessage   String?       // Optional message with the response
  createdAt         DateTime      @default(now())
  respondedAt       DateTime?     // When the counter was made
}
```

### Modified Tables

#### `Deal`

- Removed: `proposedPrice`, `counterPrice` (now in NegotiationRound)
- Added: `negotiationRounds` (relation to NegotiationRound)
- Added: `updatedAt` timestamp
- `finalPrice` remains for the accepted price

---

## 🔌 API Endpoints

### AI Assistant Routes (`/api/assistant`)

#### 1. Create/Get Assistant Session

```
POST /api/assistant/sessions
Headers: Authorization: Bearer {token}

Response:
{
  "sessionId": "...",
  "status": "ACTIVE",
  "completenessScore": 0,
  "isComplete": false,
  "nextQuestion": {
    "question": "Loại hàng hóa của bạn là gì?",
    "fieldName": "cargoType",
    "type": "select",
    "options": ["Rau củ quả", "Hải sản", ...],
    "required": true
  },
  "summary": "Cần thêm 9 thông tin..."
}
```

#### 2. Send User Response

```
POST /api/assistant/sessions/{sessionId}/messages
Headers: Authorization: Bearer {token}
Body:
{
  "fieldName": "cargoType",
  "value": "Rau củ quả",
  "message": "Loại hàng hóa của tôi là rau"
}

Response:
{
  "sessionId": "...",
  "analysis": {
    "completenessScore": 11,
    "missingFields": [...],
    "isComplete": false,
    "summary": "Cần thêm 8 thông tin..."
  },
  "nextQuestion": { ... },
  "nextMessage": "Phân loại chi tiết hàng hóa?",
  "completenessScore": 11,
  "isComplete": false
}
```

#### 3. Get Review Data

```
GET /api/assistant/sessions/{sessionId}/review
Headers: Authorization: Bearer {token}

Response:
{
  "sessionId": "...",
  "summary": {
    "cargoType": "Rau củ quả",
    "category": "Rau sạch",
    "weightKg": 500,
    "requiredTempMin": 2,
    "requiredTempMax": 8,
    "pickup": "TP.HCM",
    "dropoff": "Da Nang",
    "deliveryTime": "2026-05-26T10:00:00Z",
    "proposedPrice": 500000,
    ...
  },
  "completenessScore": 100,
  "conversationHistory": [...]
}
```

#### 4. Submit Order

```
POST /api/assistant/sessions/{sessionId}/submit
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Order submitted successfully",
  "shipmentId": "...",
  "shipment": { ... }
}
```

#### 5. Get Conversation History

```
GET /api/assistant/sessions/{sessionId}/history
Headers: Authorization: Bearer {token}

Response:
{
  "sessionId": "...",
  "conversation": [
    { "role": "user", "content": "Rau" },
    { "role": "assistant", "content": "Phân loại chi tiết?" },
    ...
  ]
}
```

#### 6. Reset/Start New Session

```
POST /api/assistant/sessions/{sessionId}/reset
Headers: Authorization: Bearer {token}

Response:
{
  "newSessionId": "...",
  "message": "New session started"
}
```

---

### Negotiation Routes (`/api/negotiation`)

#### 1. Create Deal (Start Negotiation)

```
POST /api/negotiation/deals
Headers: Authorization: Bearer {token}
Body:
{
  "shipmentId": "...",
  "truckId": "...",
  "proposedPrice": 500000,
  "message": "Optional message"
}

Response:
{
  "success": true,
  "dealId": "...",
  "roundId": "...",
  "deal": { ... },
  "firstRound": {
    "id": "...",
    "roundNumber": 1,
    "proposedPrice": 500000,
    "proposedBy": "SHIPPER",
    "status": "WAITING_FOR_COUNTER",
    ...
  }
}
```

#### 2. Get Deal with All Rounds

```
GET /api/negotiation/deals/{dealId}
Headers: Authorization: Bearer {token}

Response:
{
  "deal": { ... },
  "summary": {
    "dealId": "...",
    "currentRound": 3,
    "totalRounds": 3,
    "initialPrice": 500000,
    "currentProposedPrice": 480000,
    "lastCounterPrice": 490000,
    "finalPrice": null,
    "priceHistory": [
      { "round": 1, "proposed": 500000, "counter": null, "by": "SHIPPER" },
      { "round": 2, "proposed": 490000, "counter": 480000, "by": "CARRIER" },
      ...
    ],
    "rounds": [...]
  }
}
```

#### 3. Respond with Counter-Offer

```
POST /api/negotiation/deals/{dealId}/rounds/{roundId}/respond
Headers: Authorization: Bearer {token}
Body:
{
  "counterPrice": 490000,
  "message": "Có thể giảm tới 490k không?"
}

Response:
{
  "success": true,
  "dealAccepted": false,
  "message": "Counter-offer proposed: 490000 VND",
  "currentRound": { ... },
  "nextRound": {
    "id": "...",
    "roundNumber": 2,
    "proposedPrice": 490000,
    "proposedBy": "CARRIER",
    "status": "WAITING_FOR_COUNTER"
  }
}

// If prices match:
{
  "success": true,
  "dealAccepted": true,
  "finalPrice": 490000,
  "message": "Negotiation completed! Final price: 490000 VND",
  "deal": { "finalPrice": 490000, ... }
}
```

#### 4. Accept Proposed Price

```
POST /api/negotiation/deals/{dealId}/rounds/{roundId}/accept
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Negotiation completed! Price accepted: 490000 VND",
  "deal": { "finalPrice": 490000, ... }
}
```

#### 5. Get Shipment Negotiations

```
GET /api/negotiation/shipments/{shipmentId}/negotiations
Headers: Authorization: Bearer {token}

Response:
{
  "shipmentId": "...",
  "deals": [...],
  "totalDeals": 3,
  "activeDeals": 1,
  "completedDeals": 2
}
```

#### 6. Reject Negotiation

```
POST /api/negotiation/deals/{dealId}/reject
Headers: Authorization: Bearer {token}
Body:
{
  "reason": "Optional rejection reason"
}

Response:
{
  "success": true,
  "message": "Negotiation rejected",
  "dealId": "..."
}
```

---

## 🎯 Usage Flow

### For Order Creation with AI Assistant

1. **User initiates**: `POST /api/assistant/sessions`
   - Gets first question: "Loại hàng hóa?"

2. **User responds**: `POST /api/assistant/sessions/{id}/messages`
   - Provides: `{ fieldName: "cargoType", value: "Rau" }`
   - Gets next question: "Phân loại chi tiết?"

3. **Repeat steps** until completenessScore = 100

4. **Review order**: `GET /api/assistant/sessions/{id}/review`
   - Shows full form for user to verify

5. **Submit order**: `POST /api/assistant/sessions/{id}/submit`
   - Creates Shipment in database
   - Session marked as SUBMITTED

### For Price Negotiation

1. **Shipper proposes**: `POST /api/negotiation/deals`
   - Creates Round 1 with proposed price
   - Deal status: waiting for carrier response

2. **Carrier counters**: `POST /api/negotiation/deals/{id}/rounds/{rid}/respond`
   - Creates Round 2 with counter price
   - If prices don't match, creates new round waiting for shipper

3. **Either party accepts**: `POST /api/negotiation/deals/{id}/rounds/{rid}/accept`
   - Marks deal as completed with final price

4. **Repeat** until agreement or rejection

---

## 📋 Required Fields for Order Completion

### Required (must be filled)

- `cargoType` - Type of cargo
- `category` - Detailed category
- `weightKg` - Weight in kg
- `requiredTempMin` - Minimum temperature
- `requiredTempMax` - Maximum temperature
- `pickup` - Pickup location
- `dropoff` - Delivery location
- `deliveryTime` - Delivery deadline
- `proposedPrice` - Initial price

### Optional but Important

- `strongSmell` - Has strong smell?
- `fragile` - Is fragile?
- `frozenRequired` - Needs freezing?
- `specialTemperature` - Special temperature handling?
- `notes` - Additional notes

---

## 🚀 Migration Instructions

```bash
# Generate new Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_assistant_and_negotiation

# Or apply migration directly
npx prisma migrate deploy
```

---

## 💡 Key Features

### AI Assistant Highlights

✅ Progressive form filling (one field at a time)  
✅ Completeness analysis (0-100 score)  
✅ Optimal question sequencing  
✅ Conversation history tracking  
✅ Review form before submission  
✅ Automatic Shipment creation upon completion

### Negotiation Highlights

✅ Unlimited negotiation rounds  
✅ Price history tracking  
✅ Round status management  
✅ Auto-completion when prices match  
✅ Support for accept/counter/reject flows  
✅ Message attachments per round

---

## 🔒 Authorization

- All endpoints require JWT authentication
- Users can only access their own sessions
- Users can only negotiate for their shipments/trucks

---

## 📝 Notes

- Prices are stored in VND (Vietnamese Dong)
- Timestamps use ISO 8601 format
- Session status: ACTIVE → PENDING_REVIEW → SUBMITTED → COMPLETED
- Negotiation status: PENDING → RESPONDED → WAITING_FOR_COUNTER → COMPLETED
