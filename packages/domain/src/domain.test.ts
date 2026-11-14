import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, AFFLUENCE_GUARD, type CitizenProfile } from "./eligibility.ts";
import { detectFindings } from "./fraud.ts";
import { assertTransition, TransitionError } from "./disbursement.ts";
import { hashEntry, verifyChain, GENESIS_HASH } from "./audit.ts";
import { isValidNid, maskNid, normalizeBdPhone } from "./nid.ts";

const base: CitizenProfile = {
  age: 67, gender: "female", maritalStatus: "widowed", monthlyIncome: 4000, householdSize: 3,
  landDecimals: 0, isTaxpayer: false, ownsVehicle: false, monthlyElectricityKwh: 40, isGovtEmployee: false,
  hasDisability: false, isPregnant: false, occupation: "homemaker", isDeceased: false,
};

test("eligibility: old-age rule passes and explains failures", () => {
  const rules = { all: [{ field: "age" as const, op: "gte" as const, value: 65 }, AFFLUENCE_GUARD] };
  assert.equal(evaluate(rules, base).eligible, true);
  const r = evaluate(rules, { ...base, isTaxpayer: true });
  assert.equal(r.eligible, false);
  assert.equal(r.failed[0]?.field, "isTaxpayer");
  assert.equal(evaluate(rules, { ...base, isDeceased: true }).eligible, false);
});

test("fraud: deceased, affluent, shared account, exclusive programmes", () => {
  const mk = (o: Partial<Parameters<typeof detectFindings>[0][number]>) => ({
    enrollmentId: "e", nid: "1", programCode: "OAA", status: "active", isDeceased: false, isAffluent: false,
    povertyTargeted: true, accountNumber: null, householdId: "h", ...o,
  });
  const f = detectFindings([
    mk({ nid: "1", isDeceased: true }),
    mk({ nid: "2", isAffluent: true }),
    mk({ nid: "3", accountNumber: "X", householdId: "a" }),
    mk({ nid: "4", accountNumber: "X", householdId: "b" }),
    mk({ nid: "5", accountNumber: "X", householdId: "c" }),
    mk({ nid: "6", programCode: "OAA" }),
    mk({ nid: "6", programCode: "WA" }),
  ]);
  const types = f.map((x) => x.type);
  assert.ok(types.includes("deceased_recipient"));
  assert.ok(types.includes("affluent_recipient"));
  assert.equal(types.filter((t) => t === "shared_payment_account").length, 3);
  assert.ok(types.includes("exclusive_program_conflict"));
});

test("disbursement: maker-checker enforced", () => {
  assert.throws(() => assertTransition("draft", "approved", { role: "super_admin", actorId: "u1", createdBy: "u1" }), TransitionError);
  assert.doesNotThrow(() => assertTransition("draft", "approved", { role: "super_admin", actorId: "u2", createdBy: "u1" }));
  assert.throws(() => assertTransition("draft", "sent", { role: "super_admin", actorId: "u2", createdBy: "u1" }), TransitionError);
});

test("audit chain detects tampering", () => {
  const p1 = { actorId: "a", action: "x", entity: "e", entityId: "1", data: {}, at: "t" };
  const h1 = hashEntry(GENESIS_HASH, p1);
  const p2 = { ...p1, action: "y" };
  const h2 = hashEntry(h1, p2);
  assert.equal(verifyChain([{ prevHash: GENESIS_HASH, hash: h1, payload: p1 }, { prevHash: h1, hash: h2, payload: p2 }]).valid, true);
  assert.equal(verifyChain([{ prevHash: GENESIS_HASH, hash: h1, payload: { ...p1, data: { tampered: 1 } } }]).valid, false);
});

test("nid + phone helpers", () => {
  assert.ok(isValidNid("1234567890"));
  assert.ok(!isValidNid("12345"));
  assert.equal(maskNid("1234567890"), "••••••7890");
  assert.equal(normalizeBdPhone("01712345678"), "+8801712345678");
  assert.equal(normalizeBdPhone("123"), null);
});

test("audit hash is independent of key order (jsonb round-trip)", () => {
  const a = { actorId: "a", action: "x", entity: "e", entityId: null, data: { b: 1, a: { d: 2, c: 3 } }, at: "t" };
  const b = { at: "t", data: { a: { c: 3, d: 2 }, b: 1 }, entityId: null, entity: "e", action: "x", actorId: "a" };
  assert.equal(hashEntry(GENESIS_HASH, a), hashEntry(GENESIS_HASH, b));
});

test("rule validation catches bad fields, operators, values and empty groups", async () => {
  const { validateRuleSet } = await import("./rule-fields.ts");
  assert.deepEqual(validateRuleSet({ all: [{ field: "age", op: "gte", value: 65 }] }), []);
  assert.deepEqual(validateRuleSet({ all: [] }), ["empty_group"]);
  assert.deepEqual(validateRuleSet({ all: [{ field: "age", op: "in", value: 65 }] }), ["bad_operator:age"]);
  assert.deepEqual(validateRuleSet({ any: [{ field: "gender", op: "eq", value: "robot" }] }), ["bad_value:gender"]);
  assert.deepEqual(validateRuleSet({ all: [{ field: "isDeceased", op: "eq", value: false }] }), ["unknown_field:isDeceased"]);
});
