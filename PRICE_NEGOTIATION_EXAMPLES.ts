/**
 * EXAMPLE: Price Negotiation UI & Logic
 * Shows how to handle price input, validation, and formatting
 */

// ============================================
// SCENARIO 1: Price Match (Giá Khớp)
// ============================================

const priceMatch = {
  shipmentPrice: 1_700_000, // VND
  truckExpectedPrice: 1_700_000, // VND

  userAction: "Bấm 'Chấp nhận ghép'",

  result: `
    API gửi: POST /api/negotiation/deals
    {
      "shipmentId": "ship_123",
      "proposedPrice": 1_700_000
    }
    
    Backend tạo Deal:
    - status: "PROPOSED"
    - proposedPrice: 1_700_000
    
    Người nhận sẽ nhận thông báo với giá này
  `,

  uiFlow: `
    Matching Card hiển thị:
    
    Giá đề xuất:  1,700,000 VND
    Giá xe:       1,700,000 VND
    
    ✅ GIÁ KHỚP!
    
    [✓ Chấp nhận ghép] ← Bấm ngay lập tức
    [💬 Thương lượng giá] ← Có thể bấm nếu muốn
  `,
};

// ============================================
// SCENARIO 2: Price Mismatch (Giá Lệch) - Thương Lượng
// ============================================

const priceMismatch = {
  shipmentPrice: 1_700_000, // Chủ hàng đề xuất
  truckExpectedPrice: 1_500_000, // Chủ xe mong muốn
  difference: 200_000, // Chênh lệch

  userAction: "Bấm 'Thương lượng giá'",

  uiFlow: `
    Matching Card hiển thị:
    
    Giá đề xuất:  1,700,000 VND
    Giá xe:       1,500,000 VND  ← Chênh lệch 200k!
    
    ⚠️ Giá chênh lệch
    
    [✓ Chấp nhận ghép] ← Có thể bấm để chốt 1.7M
    [💬 Thương lượng giá] ← Hoặc bấm để đề xuất giá khác
  `,

  negotiationUI: `
    Sau khi bấm "Thương lượng giá":
    
    ┌──────────────────────────────────────┐
    │ [Ô nhập giá...]                      │
    │                                       │
    │ Hiển thị khi nhập:  1,500,000 VND   │
    └──────────────────────────────────────┘
    
    [Gửi] [Hủy]
  `,

  inputHandling: `
    // Component state
    const [priceInput, setPriceInput] = useState("");
    
    // Xử lý input
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\\D/g, "");  // 👈 Chỉ lấy số!
      setPriceInput(value);
    };
    
    // Hiển thị định dạng
    const formatPriceDisplay = (value: string) => {
      if (!value) return "";
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0
      }).format(Number(value));
    };
    
    // Validation trước gửi
    const handleConfirmNegotiate = () => {
      const price = Number(priceInput);
      if (!price || price <= 0) {
        alert("Vui lòng nhập giá hợp lệ");
        return;
      }
      sendMatchRequest(shipmentId, truckId, "COUNTERED");
    };
  `,

  userInput: {
    step1: {
      action: "Gõ: 1500000",
      display: "1,500,000 VND", // Tự động format!
    },
    step2: {
      action: "Bấm [Gửi]",
      apiCall: {
        endpoint: "POST /api/negotiation/deals",
        payload: {
          shipmentId: "ship_123",
          proposedPrice: 1_500_000,
        },
      },
    },
    step3: {
      result: `
        Backend tạo Deal với giá 1.5M
        Người nhận nhận thông báo:
        "Chủ hàng đề xuất: 1,500,000 VND"
        
        Họ có thể:
        ✓ Chấp nhận 1.5M
        💬 Thương lượng lại (ví dụ: 1.6M)
      `,
    },
  },

  mobileUI: `
    Trên iPhone:
    
    ┌─────────────────────┐
    │ Giá... 1,500,000... │  ← Hiển thị format
    │ [Gửi] [Hủy]         │  ← Nút full width
    └─────────────────────┘
  `,

  desktopUI: `
    Trên Desktop:
    
    [Ô nhập giá...] [Gửi] [Hủy]
    Hiển thị: 1,500,000 VND
  `,
};

// ============================================
// SCENARIO 3: Multiple Counter-offers (Thương Lượng Liên Tiếp)
// ============================================

const multipleCounters = {
  scenario: "Thương lượng qua lại nhiều vòng",

  round1: {
    initiator: "Chủ hàng",
    proposedPrice: 1_700_000,
    message: "Giá gốc",
  },

  round2: {
    initiator: "Chủ xe",
    respondedPrice: 1_500_000,
    message: "Tôi có thể chạy được với giá này",
  },

  round3: {
    initiator: "Chủ hàng",
    respondedPrice: 1_600_000,
    message: "Giữa giữa được không?",
  },

  round4: {
    initiator: "Chủ xe",
    respondedPrice: 1_580_000,
    message: "Thương lượng được 1.58M",
  },

  round5: {
    initiator: "Chủ hàng",
    action: "ACCEPTED",
    finalPrice: 1_580_000,
    message: "Đồng ý! Chốt 1.58M",
  },

  frontendDisplay: `
    Lịch sử thương lượng:
    
    Round 1 (Chủ hàng):
    💰 Đề xuất: 1,700,000 VND
    📝 "Giá gốc"
    ├─ Status: Đang chờ
    
    Round 2 (Chủ xe):
    💰 Đề xuất: 1,500,000 VND
    📝 "Tôi có thể chạy được với giá này"
    ├─ Status: Thương lượng
    
    Round 3 (Chủ hàng):
    💰 Đề xuất: 1,600,000 VND
    📝 "Giữa giữa được không?"
    ├─ Status: Thương lượng
    
    Round 4 (Chủ xe):
    💰 Đề xuất: 1,580,000 VND
    📝 "Thương lượng được 1.58M"
    ├─ Status: Thương lượng
    
    Round 5 (Chủ hàng):
    💰 Chốt: 1,580,000 VND ✅
    📝 "Đồng ý! Chốt 1.58M"
    ├─ Status: Đã chấp nhận
    
    ═══════════════════════════
    DEAL HOÀN THÀNH!
    Giá cuối cùng: 1,580,000 VND
    ═══════════════════════════
  `,
};

// ============================================
// API EXAMPLE: Price Negotiation Flow
// ============================================

const apiFlow = {
  create_deal: {
    endpoint: "POST /api/negotiation/deals",
    description: "Tạo Deal mới hoặc bắt đầu thương lượng",
    request: {
      shipmentId: "ship_123",
      proposedPrice: 1_500_000,
    },
    response: {
      deal: {
        id: "deal_456",
        shipmentId: "ship_123",
        status: "PROPOSED",
        createdAt: "2026-05-25T10:00:00Z",
      },
    },
  },

  get_deal: {
    endpoint: "GET /api/negotiation/deals/{dealId}",
    description: "Lấy chi tiết deal và lịch sử thương lượng",
    response: {
      deal: {
        id: "deal_456",
        status: "ACCEPTED",
        finalPrice: 1_580_000,
      },
      summary: {
        currentRound: 5,
        totalRounds: 5,
        initialPrice: 1_700_000,
        currentProposedPrice: 1_580_000,
        priceHistory: [
          { round: 1, proposed: 1_700_000, by: "CARRIER" },
          { round: 2, counter: 1_500_000, by: "SHIPPER" },
          { round: 3, counter: 1_600_000, by: "CARRIER" },
          { round: 4, counter: 1_580_000, by: "SHIPPER" },
          { round: 5, accepted: 1_580_000, by: "CARRIER" },
        ],
      },
    },
  },

  respond_to_round: {
    endpoint: "POST /api/negotiation/deals/{dealId}/respond",
    description: "Gửi counter-offer",
    request: {
      roundId: "round_456",
      respondedPrice: 1_600_000,
      message: "Optional message",
    },
  },

  accept_price: {
    endpoint: "POST /api/negotiation/deals/{dealId}/rounds/{roundId}/accept",
    description: "Chấp nhận giá được đề xuất",
    request: {
      // Không cần payload
    },
    response: {
      deal: {
        status: "ACCEPTED",
        finalPrice: 1_580_000,
      },
    },
  },
};

// ============================================
// MOBILE-FIRST PRICE INPUT EXAMPLE
// ============================================

const mobileFirstPriceInput = `
// Mobile (< 640px)
<div className="flex flex-col gap-2">
  <Input
    type="text"
    inputMode="numeric"
    placeholder="Giá (VND)"
    value={priceInput}
    onChange={handlePriceChange}
    className="w-full h-9"  // ← Full width, nút size nhỏ
  />
  {priceInput && (
    <div className="text-xs text-slate-500">
      {formatPriceDisplay(priceInput)}
    </div>
  )}
  <div className="flex gap-2">
    <Button className="flex-1 h-9">Gửi</Button>
    <Button className="flex-1 h-9" variant="outline">Hủy</Button>
  </div>
</div>

// Tablet/Desktop (>= 640px)
<div className="flex gap-2 items-end">
  <div className="flex-1">
    <Input
      type="text"
      inputMode="numeric"
      placeholder="Giá thương lượng"
      value={priceInput}
      onChange={handlePriceChange}
      className="h-10"  // ← Nút size lớn hơn
    />
    {priceInput && (
      <div className="text-xs text-slate-500 mt-1">
        {formatPriceDisplay(priceInput)}
      </div>
    )}
  </div>
  <Button className="h-10">Gửi</Button>
  <Button className="h-10" variant="outline">Hủy</Button>
</div>
`;

// ============================================
// VALIDATION & ERROR HANDLING
// ============================================

const validation = {
  frontend: {
    emptyPrice: {
      userInput: "",
      validation: "❌ Không hợp lệ",
      message: "Vui lòng nhập giá",
    },
    zeroPrice: {
      userInput: "0",
      validation: "❌ Không hợp lệ",
      message: "Giá phải > 0",
    },
    negativPrice: {
      userInput: "-1000",
      regex: "/\\D/g", // Xoá non-digit
      result: "1000", // Chỉ lấy con số
      validation: "✅ Hợp lệ",
    },
    validPrice: {
      userInput: "1500000",
      validation: "✅ Hợp lệ",
      display: "1,500,000 VND",
    },
  },

  backend: {
    validation: `
      const price = Number(req.body.price);
      
      if (!price || price <= 0) {
        throw new HttpError(400, "Giá phải lớn hơn 0");
      }
      
      if (price > 10_000_000) {
        throw new HttpError(400, "Giá vượt quá giới hạn tối đa");
      }
      
      // Thực hiện thương lượng
    `,
  },
};

// ============================================
// REAL-TIME FORMATTING EXAMPLES
// ============================================

const realtimeFormatting = [
  { input: "1", display: "1 VND" },
  { input: "12", display: "12 VND" },
  { input: "123", display: "123 VND" },
  { input: "1234", display: "1,234 VND" },
  { input: "12345", display: "12,345 VND" },
  { input: "123456", display: "123,456 VND" },
  { input: "1234567", display: "1,234,567 VND" },
  { input: "12345678", display: "12,345,678 VND" },
  { input: "1500000", display: "1,500,000 VND" }, // Phổ biến nhất
  { input: "2500000", display: "2,500,000 VND" },
  { input: "5000000", display: "5,000,000 VND" },
];

export {
  priceMatch,
  priceMismatch,
  multipleCounters,
  apiFlow,
  mobileFirstPriceInput,
  validation,
  realtimeFormatting,
};
