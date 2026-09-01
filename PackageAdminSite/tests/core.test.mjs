import assert from "node:assert/strict";
import { test } from "node:test";
import { createEmptyContact, normalizeContacts, serializeContacts, validateContacts } from "../core.mjs";

const regions = [
  { code: "CN-32", level: "province", parentCode: null, name: { zhHans: "江苏省", en: "Jiangsu" } },
  { code: "CN-32-01", level: "city", parentCode: "CN-32", name: { zhHans: "南京市", en: "Nanjing" } }
];

function validContact() {
  return {
    ...createEmptyContact(),
    id: "service-nanjing",
    serviceKey: "service",
    category: "other",
    name: { zhHans: "示例服务", en: "Example Service" },
    description: { zhHans: "服务说明", en: "Service description" },
    displayNumber: "12345",
    dialNumber: "12345",
    coverageScopes: [{ type: "city", regionCode: "CN-32-01" }],
    sourceURL: "https://www.nanjing.gov.cn/service",
    verifiedAt: "2026-09-01",
    sortOrder: 10
  };
}

test("validates a complete bilingual city contact", () => {
  assert.deepEqual(validateContacts([validContact()], regions), []);
});

test("rejects duplicate IDs, malformed dialing and invalid region levels", () => {
  const first = validContact();
  const second = { ...validContact(), dialNumber: "12-345", coverageScopes: [{ type: "province", regionCode: "CN-32-01" }] };
  const errors = validateContacts([first, second], regions);
  assert.ok(errors.some((error) => error.message.includes("id must be unique")));
  assert.ok(errors.some((error) => error.message.includes("dialNumber")));
  assert.ok(errors.some((error) => error.message.includes("valid province")));
});

test("normalizes missing optional object members and serializes deterministically", () => {
  const normalized = normalizeContacts([{ id: "one" }]);
  assert.deepEqual(normalized[0].name, { zhHans: "", en: "" });
  assert.equal(serializeContacts(normalized), serializeContacts(normalized));
  assert.ok(serializeContacts(normalized).endsWith("\n"));
});
