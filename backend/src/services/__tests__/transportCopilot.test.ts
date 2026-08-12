import test from "node:test";
import assert from "node:assert/strict";
import {
  inferShipmentDraftNormalized,
  inferTruckDraftNormalized,
} from "../transportCopilot.js";

test("parses the truck sample input with Vietnamese accents and relative time", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferTruckDraftNormalized(
    "Tạo xe tải đông lạnh biển số 43C-123.45, tải trọng 5 tấn, còn trống 3 tấn, tuyến Đà Nẵng đi Huế, nhiệt độ từ âm 18 đến âm 10 độ, dự kiến đến lúc 9 giờ sáng mai",
    currentDateTime,
    {},
  );

  assert.equal(draft.type, "tai dong lanh");
  assert.equal(draft.plateNumber, "43C-123.45");
  assert.equal(draft.maxCapacityKg, 5000);
  assert.equal(draft.remainingKg, 3000);
  assert.equal(draft.refrigerated, true);
  assert.equal(draft.currentRoute, "da nang di hue");
  assert.equal(draft.tempMin, -18);
  assert.equal(draft.tempMax, -10);
  assert.equal(draft.eta?.toISOString(), "2026-08-11T02:00:00.000Z");
});

test("parses the shipment sample input with temperature, price and combine rules", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferShipmentDraftNormalized(
    "Tạo hàng hóa gồm 500 kg cá đông lạnh, lấy tại cảng cá Thọ Quang, giao đến kho lạnh Hòa Khánh lúc 15 giờ ngày mai, nhiệt độ từ âm 20 đến âm 15 độ, giá đề xuất 3 triệu đồng, không được ghép với hàng khác",
    currentDateTime,
    {},
  );

  assert.equal(draft.cargoType, "ca dong lanh");
  assert.ok(draft.category);
  assert.equal(draft.weightKg, 500);
  assert.equal(draft.requiredTempMin, -20);
  assert.equal(draft.requiredTempMax, -15);
  assert.equal(draft.pickup, "cang ca tho quang");
  assert.equal(draft.dropoff, "kho lanh hoa khanh");
  assert.equal(draft.deliveryTime?.toISOString(), "2026-08-11T08:00:00.000Z");
  assert.equal(draft.proposedPrice, 3000000);
  assert.equal(draft.frozenRequired, true);
  assert.equal(draft.allowCombine, false);
  assert.equal(draft.fragile, false);
  assert.equal(draft.strongSmell, false);
});
