import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWeightToKg,
  normalizeMoneyToVnd,
  normalizePlateNumber,
  parseRelativeDate,
} from "../logisticsCopilot.js";

test("normalizeWeightToKg converts tons to kilograms", () => {
  assert.equal(normalizeWeightToKg("5 tấn"), 5000);
  assert.equal(normalizeWeightToKg("3,5 tấn"), 3500);
  assert.equal(normalizeWeightToKg("500 kg"), 500);
});

test("normalizeMoneyToVnd converts Vietnamese currency strings", () => {
  assert.equal(normalizeMoneyToVnd("3 triệu đồng"), 3000000);
  assert.equal(normalizeMoneyToVnd("2,5 triệu"), 2500000);
  assert.equal(normalizeMoneyToVnd("500000"), 500000);
});

test("normalizePlateNumber removes spaces and uppercases letters", () => {
  assert.equal(normalizePlateNumber("43c-123.45"), "43C-123.45");
  assert.equal(normalizePlateNumber(" 29b 123 45 "), "29B12345");
});

test("parseRelativeDate converts common phrases to ISO strings", () => {
  const base = new Date("2026-07-29T08:00:00+07:00");
  const tomorrow = parseRelativeDate("ngày mai", base);
  assert.ok(tomorrow?.includes("2026-07-30"));
  const nextWeek = parseRelativeDate("tuần sau", base);
  assert.ok(nextWeek?.includes("2026-08-05"));
});
