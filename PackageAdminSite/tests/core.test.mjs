import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyCategoryTemplate,
  createEmptyContact,
  duplicateContact,
  normalizeContacts,
  normalizeDialNumber,
  reorderContacts,
  serializeContacts,
  todayISO,
  validateContacts
} from "../core.mjs";

const regions = [
  { code: "320000", level: "province", parentCode: null, name: { zhHans: "江苏省", en: "Jiangsu" } },
  { code: "320100", level: "city", parentCode: "320000", name: { zhHans: "南京市", en: "Nanjing" } }
];

function deterministicGenerator(prefix) {
  deterministicGenerator.counter = (deterministicGenerator.counter || 0) + 1;
  return `${prefix}-00000000-0000-4000-8000-${String(deterministicGenerator.counter).padStart(12, "0")}`;
}

function validContact() {
  return {
    ...createEmptyContact({ id: "contact-service-nanjing", serviceKey: "service-emergency" }),
    category: "other",
    name: { zhHans: "示例服务", en: "Example Service" },
    description: { zhHans: "服务说明", en: "Service description" },
    displayNumber: "12345",
    dialNumber: "12345",
    coverageScopes: [{ type: "city", regionCode: "320100" }],
    sourceURL: "https://www.nanjing.gov.cn/service",
    verifiedAt: "2026-09-01",
    sortOrder: 10
  };
}

test("creates immutable technical identifiers without editor input", () => {
  deterministicGenerator.counter = 0;
  const contact = createEmptyContact({ generateID: deterministicGenerator });
  assert.match(contact.id, /^contact-/);
  assert.match(contact.serviceKey, /^service-/);
  assert.notEqual(contact.id, contact.serviceKey);
  assert.equal(contact.verifiedAt, "");
  assert.equal(contact.sortOrder, 10);
});

test("creates a regional replacement with a new ID and the same service key", () => {
  const original = validContact();
  const replacement = duplicateContact(original, { generateID: () => "contact-replacement", sortOrder: 20 });
  assert.equal(replacement.id, "contact-replacement");
  assert.equal(replacement.serviceKey, original.serviceKey);
  assert.deepEqual(replacement.coverageScopes, [{ type: "province", regionCode: null }]);
  assert.equal(replacement.verifiedAt, "");
  assert.equal(replacement.sortOrder, 20);
});

test("derives a safe dialing value from the display number", () => {
  assert.equal(normalizeDialNumber("＋86 (10) 1234-5678"), "+861012345678");
  assert.equal(normalizeDialNumber("  123 45  "), "12345");
});

test("applies bilingual category templates while preserving custom copy", () => {
  const empty = createEmptyContact({ id: "contact-one", serviceKey: "service-one" });
  const templated = applyCategoryTemplate(empty, "medical");
  assert.equal(templated.name.zhHans, "医疗急救");
  assert.equal(templated.name.en, "Medical Emergency");
  templated.description.zhHans = "已经人工确认的说明";
  const changed = applyCategoryTemplate(templated, "fire");
  assert.equal(changed.description.zhHans, "已经人工确认的说明");
  assert.equal(changed.name.zhHans, "消防救援");
});

test("reorders contacts and regenerates deterministic sort values", () => {
  const first = { ...validContact(), id: "first", sortOrder: 90 };
  const second = { ...validContact(), id: "second", sortOrder: 5 };
  const reordered = reorderContacts([first, second], 1, 0);
  assert.deepEqual(reordered.map((contact) => contact.id), ["second", "first"]);
  assert.deepEqual(reordered.map((contact) => contact.sortOrder), [10, 20]);
});

test("validates a complete bilingual city contact", () => {
  assert.deepEqual(validateContacts([validContact()], regions), []);
});

test("rejects duplicate IDs, derived dialing mismatches and invalid region levels", () => {
  const first = validContact();
  const second = {
    ...validContact(),
    dialNumber: "12-345",
    coverageScopes: [{ type: "province", regionCode: "320100" }]
  };
  const errors = validateContacts([first, second], regions);
  assert.ok(errors.some((error) => error.message.includes("id must be unique")));
  assert.ok(errors.some((error) => error.message.includes("automatically normalized")));
  assert.ok(errors.some((error) => error.message.includes("valid province")));
});

test("requires explicit source verification instead of filling today's date on save", () => {
  const contact = { ...validContact(), verifiedAt: "" };
  assert.ok(validateContacts([contact], regions).some((error) => error.field === "verifiedAt"));
  assert.equal(todayISO(new Date("2026-09-01T23:45:00Z")), "2026-09-01");
});

test("normalizes imported legacy contacts and serializes deterministically", () => {
  const normalized = normalizeContacts([{ id: "one", displayNumber: "123-45", sortOrder: "20" }]);
  assert.deepEqual(normalized[0].name, { zhHans: "", en: "" });
  assert.match(normalized[0].serviceKey, /^service-/);
  assert.equal(normalized[0].dialNumber, "12345");
  assert.equal(normalized[0].sortOrder, 20);
  assert.equal(serializeContacts(normalized), serializeContacts(normalized));
  assert.ok(serializeContacts(normalized).endsWith("\n"));
});
