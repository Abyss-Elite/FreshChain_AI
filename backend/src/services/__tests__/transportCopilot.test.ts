import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreateShipment,
  canCreateTruck,
  inferShipmentDraftNormalized,
  inferTruckDraftNormalized,
  isTruckTemperatureSensitive,
  validateShipmentDraft,
} from "../transportCopilot.js";

test("parses the truck sample input with Vietnamese accents and relative time", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferTruckDraftNormalized(
    "Tao xe tai dong lanh bien so 43C-123.45, tai trong 5 tan, con trong 3 tan, tuyen Da Nang di Hue, nhiet do tu am 18 den am 10 do, du kien den luc 9 gio sang mai",
    currentDateTime,
    {},
  );

  assert.equal(draft.type, "Xe tải đông lạnh");
  assert.equal(draft.plateNumber, "43C-123.45");
  assert.equal(draft.maxCapacityKg, 5000);
  assert.equal(draft.remainingKg, 3000);
  assert.equal(draft.refrigerated, true);
  assert.equal(draft.currentRoute, "Đà Nẵng -> Huế");
  assert.equal(draft.tempMin, -18);
  assert.equal(draft.tempMax, -10);
  assert.equal(draft.eta?.toISOString(), "2026-08-11T02:00:00.000Z");
});

test("parses compact plate numbers and 'di tu ... den ...' truck routes", () => {
  const currentDateTime = new Date("2026-08-18T08:00:00+07:00");
  const draft = inferTruckDraftNormalized(
    "Tao 1 xe cho trai cay, bien so xe 92A-12345, tai trong 5 tan, con trong 3 tan, di tu Da Nang den Ca Mau",
    currentDateTime,
    {},
  );

  assert.equal(draft.type, "Chở trái cây");
  assert.equal(draft.plateNumber, "92A-123.45");
  assert.equal(draft.maxCapacityKg, 5000);
  assert.equal(draft.remainingKg, 3000);
  assert.equal(draft.currentRoute, "Đà Nẵng -> Cà Mau");
  assert.equal(draft.refrigerated, true);
  assert.equal(draft.eta, undefined);
});

test("treats fruit trucks as temperature-sensitive", () => {
  assert.equal(isTruckTemperatureSensitive({ type: "Chở trái cây" }), true);
  assert.equal(isTruckTemperatureSensitive({ type: "Xe thường" }), false);
});

test("parses the shipment sample input with temperature, price and combine rules", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom 500 kg ca dong lanh, lay tai cang ca Tho Quang, giao den kho lanh Hoa Khanh luc 15 gio ngay mai, nhiet do tu am 20 den am 15 do, gia de xuat 3 trieu dong, khong duoc ghep voi hang khac",
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

test("extracts an explicit shipment category from the phrase nhom hang", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom 2 tan co dong lanh Nhom hang thuc pham dong lanh lay tai cang ca tho hoang Da Nang do den kho lanh Hoa Khanh ghe do vao luc 8:00 sang mai nhiet do tu Am 18 Do den am 10 do gia de xuat 3 trieu dong khong ghep hang voi cac don hang khac",
    currentDateTime,
    {},
  );

  assert.equal(draft.category, "Thuc pham dong lanh");
  assert.equal(draft.weightKg, 2000);
  assert.equal(draft.proposedPrice, 3000000);
  assert.equal(draft.allowCombine, false);
});

test("parses 'di tu X den Y' route phrasing even when a temperature range with 'den' comes first", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom tom dong lanh 30kg, nhiet do tu 10 den 15 do C, di tu Da Nang den Ca Mau, gia de xuat 200 nghin",
    currentDateTime,
    {},
  );

  assert.equal(draft.requiredTempMin, 10);
  assert.equal(draft.requiredTempMax, 15);
  assert.equal(draft.pickup, "Đà Nẵng");
  assert.equal(draft.dropoff, "Cà Mau");
});

test("flags a shipment location that is not in the supported location list", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom tom dong lanh 30kg, nhiet do tu 10 den 15 do C, di tu Da Nang den Da Lat, gia de xuat 200 nghin, giao luc 8 gio sang mai",
    currentDateTime,
    {},
  );

  assert.equal(draft.pickup, "Đà Nẵng");
  // "Đà Lạt" is not in the supported province list, so it falls through unnormalized.
  assert.equal(draft.dropoff, "da lat");

  const validation = validateShipmentDraft(draft);
  assert.equal(validation.missingFields.length, 0);
  assert.ok(
    validation.validationErrors.some((error) =>
      error.includes("Địa điểm giao hàng"),
    ),
  );
  assert.ok(
    !validation.validationErrors.some((error) =>
      error.includes("Địa điểm lấy hàng"),
    ),
  );
});

test("infers the fruit category for fruit shipments", () => {
  const currentDateTime = new Date("2026-08-10T08:00:00+07:00");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom 2 tan trai cay tuoi, lay tai Can Tho, giao den Da Nang, giao luc 8 gio sang mai, nhiet do tu 4 den 8 do, gia de xuat 3 trieu dong",
    currentDateTime,
    {},
  );

  assert.equal(draft.category, "Trái cây");
  assert.equal(draft.cargoType?.toLowerCase().includes("trai cay"), true);
});

test("parses 10h sang ngay mai as the next day in Vietnam time", () => {
  const currentDateTime = new Date("2026-08-16T01:54:31.950Z");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom 2 tan xoai, lay tai Ca Mau, giao den Da Nang, giao luc 10h sang ngay mai, nhiet do tu 10 den 15 do, gia de xuat 3 trieu dong",
    currentDateTime,
    {},
  );

  assert.equal(draft.deliveryTime?.toISOString(), "2026-08-17T03:00:00.000Z");
});

test("parses 3h chieu mai as 15h on the next day", () => {
  const currentDateTime = new Date("2026-08-18T01:54:31.950Z");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom 1 tan xoai, lay tai Ca Mau, giao den Da Nang, giao luc 3h chieu mai, nhiet do tu 10 den 15 do, gia de xuat 3 trieu dong",
    currentDateTime,
    {},
  );

  assert.equal(draft.deliveryTime?.toISOString(), "2026-08-19T08:00:00.000Z");
});

test("parses 7h ngay mot as the day after tomorrow", () => {
  const currentDateTime = new Date("2026-08-18T01:54:31.950Z");
  const draft = inferShipmentDraftNormalized(
    "Tao hang hoa gom 1 tan xoai, lay tai Ca Mau, giao den Da Nang, giao luc 7h ngay mot, nhiet do tu 10 den 15 do, gia de xuat 3 trieu dong",
    currentDateTime,
    {},
  );

  assert.equal(draft.deliveryTime?.toISOString(), "2026-08-20T00:00:00.000Z");
});

test("parses ngay mot, ngay kia and mai kia as two days later", () => {
  const currentDateTime = new Date("2026-08-16T01:54:31.950Z");
  const cases = [
    "giao luc 10h sang ngay mot",
    "giao luc 10h sang ngay kia",
    "giao luc 10h sang mai kia",
  ];

  for (const input of cases) {
    const draft = inferShipmentDraftNormalized(
      `Tao hang hoa gom 2 tan xoai, lay tai Ca Mau, giao den Da Nang, ${input}, nhiet do tu 10 den 15 do, gia de xuat 3 trieu dong`,
      currentDateTime,
      {},
    );

    assert.equal(draft.deliveryTime?.toISOString(), "2026-08-18T03:00:00.000Z");
  }
});

test("uses the corrected role mapping for copilot permissions", () => {
  assert.equal(canCreateTruck("SHIPPER"), true);
  assert.equal(canCreateTruck("CARRIER"), false);
  assert.equal(canCreateShipment("CARRIER"), true);
  assert.equal(canCreateShipment("SHIPPER"), false);
  assert.equal(canCreateTruck("ADMIN"), true);
  assert.equal(canCreateShipment("ADMIN"), true);
});
