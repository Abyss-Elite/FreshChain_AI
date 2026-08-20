# 💰 Hướng Dẫn Thương Lượng Giá - FreshChain

## ❓ Thương Lượng Là Gì?

**Thương lượng giá** là quá trình mà 2 bên (Shipper và Carrier) **đi đi lại lại để tìm mức giá phù hợp cho cả hai**.

Thay vì nhận lấy hoặc từ chối ngay lập tức, 2 bên có thể:

- ✅ Chấp nhận giá
- 💭 Phản đối và đề xuất giá mới
- ❌ Từ chối

---

## 🎬 Ví Dụ Thương Lượng (3 Vòng)

### Vòng 1️⃣: Carrier Đề Nghị

```
Carrier: "Tôi vận chuyển từ TP.HCM đến Đà Nẵng
         được không? Giá 500,000 đ"

Shipper: "Quá đắt rồi! Tôi chỉ có 350,000 đ"
```

### Vòng 2️⃣: Shipper Phản Đối

```
Shipper: "Giá 350,000 đ - đó là giá tôi có thể
         chấp nhận được"

Carrier: "350,000 quá rẻ! Tôi có thể chấp nhận
         400,000 đ, không thế nào rẻ hơn"
```

### Vòng 3️⃣: Shipper Đề Nghị Lại

```
Shipper: "Được! 400,000 đ. Tôi chấp nhận"

Carrier: ✅ Đã chấp nhận
```

**Kết Quả:** Giá Chốt = **400,000 đ**

---

## 🔄 Quy Trình Thương Lượng Chi Tiết

### Step 1: Carrier Tạo Đề Nghị (Round 1)

```
- Carrier thấy đơn hàng từ Shipper
- Carrier đề nghị mức giá: 500,000 đ
- Trạng thái: ⏳ Chờ phản hồi từ Shipper
```

### Step 2: Shipper Nhận Thấy Phản Hồi

```
- Shipper thấy đề nghị từ Carrier
- Shipper có 3 lựa chọn:

  Option A: ✅ Chấp nhận
  → Thương lượng xong, giá chốt 500,000 đ

  Option B: 💭 Phản Đối
  → Shipper đề xuất giá mới (vòng tiếp theo)

  Option C: ❌ Từ Chối
  → Thương lượng kết thúc, không có deal
```

### Step 3: Tiếp Tục Vòng Lặp (Nếu Phản Đối)

```
Nếu Shipper chọn "Phản Đối":

  Shipper: Đề xuất giá 350,000 đ
  ↓
  Carrier thấy giá mới
  ↓
  Carrier có 3 lựa chọn (như Step 2)
  ↓
  ... (lặp lại cho đến khi ai đó chấp nhận)
```

---

## ✨ Các Vòng Thương Lượng Không Giới Hạn

### Round 1

Carrier: 500,000 đ

### Round 2

Shipper: 350,000 đ

### Round 3

Carrier: 400,000 đ

### Round 4

Shipper: 380,000 đ

### Round 5

Carrier: 390,000 đ

### Round 6

Shipper: ✅ Chấp nhận 390,000 đ

**Kết Quả: DEAL DONE! 🎉 Giá Chốt = 390,000 đ**

---

## 💡 Mẹo Thương Lượng

### 1. Đề Nghị Giá Lần Đầu (Carrier)

- 🎯 Để lại chỗ mặc cả cho Shipper
- ✅ Giá hợp lý, không quá cao
- 💬 Giải thích tại sao giá này

**Ví dụ:**

```
"Tôi có thể vận chuyển hàng rau sạch 500kg
từ TP.HCM đến Đà Nẵng trong 24 giờ.
Giá: 500,000 đ (gồm bảo hiểm, xăng, công nhân)"
```

### 2. Khi Nhận Đề Nghị (Shipper)

- 📊 So sánh với giá thị trường
- ✍️ Nếu quá cao, phản đối với lý do rõ ràng
- 💬 Nêu giá tối đa bạn có thể chấp nhận

**Ví dụ:**

```
"Giá hơi cao. Tôi có thể chấp nhận 350,000 đ
vì hàng này không cần điều kiện quá khắt khe"
```

### 3. Phản Đối (Counter-Offer)

- 🤝 Đi về phía đối phương
- 📉 Giá nên gần hơn, không quá xa
- ⏱️ Không kéo dài quá 5-6 vòng

**Ví dụ (Vòng 3):**

```
Vòng 1: 500,000 đ
Vòng 2: 350,000 đ
Vòng 3: 425,000 đ ← Ở giữa, gần vào nhau
```

### 4. Biết Khi Nào Dừng

- ✅ Nếu giá chấp nhận được → Chấp nhận ngay!
- ⏸️ Nếu không thỏa đáng → Phản đối lần cuối
- ❌ Nếu không bao giờ thỏa thuận → Từ chối

---

## 📱 Cách Sử Dụng Trên UI

### Đối với Carrier (Tạo Deal)

```
1. Xem đơn hàng từ Shipper
2. Click "💭 Tạo Đề Nghị"
3. Nhập giá của bạn
4. Click "📤 Gửi Đề Nghị"
5. Chờ Shipper phản hồi
```

### Đối với Shipper (Phản Hồi)

```
1. Xem các đề nghị từ Carriers
2. Click vào một đề nghị
3. Click "📊 Xem Chi Tiết" → Thấy lịch sử thương lượng
4. Lựa chọn:
   - ✅ "Chấp Nhận" → Deal hoàn thành
   - 💭 "Phản Đối Giá" → Nhập giá mới
   - ❌ "Từ Chối" → Kết thúc thương lượng
5. Click nút thích hợp
```

---

## 🔍 Xem Lịch Sử Thương Lượng

### Trên Giao Diện

```
Vòng 1
├─ Đề Nghị: 500,000 đ (Carrier)
└─ Phản Hồi: 350,000 đ (Shipper)

Vòng 2
├─ Đề Nghị: 400,000 đ (Carrier)
└─ Phản Hồi: -

Vòng 3
├─ Đề Nghị: 390,000 đ (Shipper)
└─ Status: ⏳ Chờ phản hồi
```

---

## ⚡ Tình Huống Thực Tế

### Tình Huống 1: Giá Khá Phù Hợp

```
Carrier: 450,000 đ
Shipper: 400,000 đ
Carrier: 425,000 đ
Shipper: ✅ Chấp nhận
→ KẾT QUẢ: 3 vòng, giá chốt 425,000 đ
```

### Tình Huống 2: Giá Quá Khác Biệt

```
Carrier: 600,000 đ
Shipper: 300,000 đ
Carrier: 500,000 đ
Shipper: 350,000 đ
Carrier: 450,000 đ
Shipper: ❌ Từ chối
→ KẾT QUẢ: Không có deal
```

### Tình Huống 3: Thương Lượng Kéo Dài

```
Carrier: 500,000 đ → Shipper: 350,000 đ
→ Carrier: 425,000 đ → Shipper: 375,000 đ
→ Carrier: 400,000 đ → Shipper: 380,000 đ
→ Carrier: 390,000 đ → Shipper: ✅ Chấp nhận
→ KẾT QUẢ: 7 vòng, giá chốt 390,000 đ
```

---

## ✅ Khi Thương Lượng Hoàn Thành

```
Bạn sẽ thấy:
├─ ✅ Thương Lượng Thành Công!
├─ Giá Chốt: 390,000 đ
├─ Sau 7 vòng thương lượng
└─ Nút "📋 Xem Chi Tiết Thương Lượng"
```

---

## 🚫 Khi Từ Chối

```
Nếu ai đó click "❌ Từ Chối":
├─ Thương lượng kết thúc
├─ Không có deal được tạo
└─ Có thể tạo đề nghị mới sau
```

---

## 📊 Biểu Đồ Xu Hướng Giá

Trên giao diện bạn sẽ thấy:

```
Round 1: 500,000 đ
       ↓ -150,000 đ

Round 2: 350,000 đ
       ↑ +75,000 đ

Round 3: 425,000 đ
       ↓ -45,000 đ

Round 4: 380,000 đ
```

Xu hướng: 📉 Giảm dần (tốt cho Shipper) ✅

---

## 🎯 Tóm Tắt

| Tình Huống               | Hành Động             | Kết Quả         |
| ------------------------ | --------------------- | --------------- |
| Giá OK                   | ✅ Chấp nhận          | Deal hoàn thành |
| Giá quá cao/thấp         | 💭 Phản đối + giá mới | Vòng tiếp theo  |
| Không đồng ý             | ❌ Từ chối            | Kết thúc        |
| Không bao giờ thỏa thuận | ❌ Từ chối            | Tìm người khác  |

---

**Hạnh phúc thương lượng! 🚀**

Tối ưu hóa giá = Cả hai bên đều hài lòng ✨
