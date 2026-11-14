/**
 * Seeds a realistic simulation of the *status quo* — fragmented legacy cards, leakage to the affluent,
 * deceased recipients, shared agent accounts, and excluded poor — then lets Ek Porichoy's own services
 * (batches, integrity scan, card matching) run over it, so every dashboard tells a true story.
 */
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import {
  account, db, enrollments, grievances, households, legacyCards, ministries, paymentAccounts, people, personSignals, programs, user,
} from "@ep/db";
import {
  generateBatches, runIntegrityScan, settleBatch, transitionBatch, listBatches, effectiveRules, toProfile, type Actor,
} from "@ep/core";
import { AFFLUENCE_GUARD, DIVISIONS, evaluate, periodOf, povertyScore, type Provider, type RuleSet } from "@ep/domain";

// ───────────────────────── deterministic randomness ─────────────────────────
let s = 20261114;
const rand = () => ((s = (s + 0x6d2b79f5) | 0), (((s ^ (s >>> 15)) * (1 | s)) >>> 0) / 4294967296);
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const chance = (p: number) => rand() < p;
const weighted = <T,>(pairs: [T, number][]): T => {
  let r = rand() * pairs.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0]![0];
};

type NamePair = readonly [bn: string, en: string];
const MALE: NamePair[] = [["আব্দুল", "Abdul"], ["মোহাম্মদ", "Mohammad"], ["রফিক", "Rafiq"], ["করিম", "Karim"], ["জামাল", "Jamal"], ["হাসান", "Hasan"], ["সাইফুল", "Saiful"], ["আনোয়ার", "Anwar"], ["মিজান", "Mizan"], ["শফিক", "Shafiq"], ["নুরুল", "Nurul"], ["আলমগীর", "Alamgir"], ["কামাল", "Kamal"], ["বাবুল", "Babul"]];
const FEMALE: NamePair[] = [["রহিমা", "Rahima"], ["ফাতেমা", "Fatema"], ["সালমা", "Salma"], ["নাসরিন", "Nasrin"], ["রোকেয়া", "Rokeya"], ["শাহানা", "Shahana"], ["জোহরা", "Johora"], ["আমেনা", "Amena"], ["কুলসুম", "Kulsum"], ["মরিয়ম", "Moriom"], ["তাসলিমা", "Taslima"], ["পারভীন", "Parvin"], ["হালিমা", "Halima"]];
const SURNAME_M: NamePair[] = [["ইসলাম", "Islam"], ["হোসেন", "Hossain"], ["আহমেদ", "Ahmed"], ["রহমান", "Rahman"], ["উদ্দিন", "Uddin"], ["মিয়া", "Mia"], ["সরকার", "Sarkar"], ["মোল্লা", "Molla"], ["শেখ", "Sheikh"], ["খান", "Khan"]];
const SURNAME_F: NamePair[] = [["বেগম", "Begum"], ["আক্তার", "Akter"], ["খাতুন", "Khatun"], ["ইসলাম", "Islam"], ["রহমান", "Rahman"]];
const UPAZILAS = ["সদর", "উত্তর", "দক্ষিণ", "পূর্ব", "পশ্চিম"];
const UNIONS = ["১ নং", "২ নং", "৩ নং", "৪ নং", "৫ নং", "৬ নং"];

const PASSWORD = "Demo@2026!";

// ───────────────────────── reference data ─────────────────────────
const MINISTRIES = [
  { code: "MOSW", nameBn: "সমাজকল্যাণ মন্ত্রণালয়", nameEn: "Ministry of Social Welfare" },
  { code: "MOWCA", nameBn: "মহিলা ও শিশু বিষয়ক মন্ত্রণালয়", nameEn: "Ministry of Women and Children Affairs" },
  { code: "MOC", nameBn: "বাণিজ্য মন্ত্রণালয় (টিসিবি)", nameEn: "Ministry of Commerce (TCB)" },
  { code: "MOA", nameBn: "কৃষি মন্ত্রণালয়", nameEn: "Ministry of Agriculture" },
  { code: "MOFL", nameBn: "মৎস্য ও প্রাণিসম্পদ মন্ত্রণালয়", nameEn: "Ministry of Fisheries and Livestock" },
];

type ProgramSeed = Omit<typeof programs.$inferInsert, "ministryId"> & { ministry: string; rules: RuleSet };
const PROGRAMS: ProgramSeed[] = [
  {
    code: "OAA", ministry: "MOSW", amount: 600, annualBudget: 4_791_00_00_000,
    nameBn: "বয়স্ক ভাতা", nameEn: "Old Age Allowance",
    descriptionBn: "৬৫+ পুরুষ ও ৬২+ নারী, যাদের নিয়মিত আয় নেই।", descriptionEn: "Men 65+ and women 62+ without regular income.",
    legacyCardBn: "বয়স্ক ভাতা বই", legacyCardEn: "Old-age allowance book",
    rules: { all: [
      { any: [
        { all: [{ field: "gender", op: "eq", value: "male" }, { field: "age", op: "gte", value: 65 }] },
        { all: [{ field: "gender", op: "eq", value: "female" }, { field: "age", op: "gte", value: 62 }] },
      ] },
      { field: "monthlyIncome", op: "lte", value: 12000 },
    ] },
  },
  {
    code: "WA", ministry: "MOSW", amount: 550, annualBudget: 1_711_00_00_000,
    nameBn: "বিধবা ও স্বামী নিগৃহীতা ভাতা", nameEn: "Widow & Deserted Women Allowance",
    descriptionBn: "বিধবা বা তালাকপ্রাপ্ত দরিদ্র নারী।", descriptionEn: "Poor widowed or deserted women.",
    legacyCardBn: "বিধবা ভাতা বই", legacyCardEn: "Widow allowance book",
    rules: { all: [
      { field: "gender", op: "eq", value: "female" },
      { field: "maritalStatus", op: "in", value: ["widowed", "divorced"] },
      { field: "monthlyIncome", op: "lte", value: 12000 },
    ] },
  },
  {
    code: "DA", ministry: "MOSW", amount: 850, annualBudget: 2_965_00_00_000,
    nameBn: "অসচ্ছল প্রতিবন্ধী ভাতা", nameEn: "Disability Allowance",
    descriptionBn: "ডিজিএইচএস-নিবন্ধিত প্রতিবন্ধী ব্যক্তি।", descriptionEn: "Persons with a DGHS-registered disability.",
    legacyCardBn: "প্রতিবন্ধী পরিচয়পত্র", legacyCardEn: "Disability ID card",
    rules: { all: [{ field: "hasDisability", op: "eq", value: true }, { field: "monthlyIncome", op: "lte", value: 20000 }] },
  },
  {
    code: "TCB", ministry: "MOC", amount: 1100, annualBudget: 6_000_00_00_000,
    nameBn: "টিসিবি পারিবারিক খাদ্য সহায়তা", nameEn: "TCB Family Food Support",
    descriptionBn: "নিম্ন আয়ের পরিবারকে ভর্তুকি মূল্যে খাদ্য — সরাসরি টাকায়।", descriptionEn: "Subsidised food for low-income families — now as a direct transfer.",
    legacyCardBn: "টিসিবি ফ্যামিলি কার্ড", legacyCardEn: "TCB Family Card",
    rules: { all: [{ field: "monthlyIncome", op: "lte", value: 10000 }, { field: "age", op: "gte", value: 18 }] },
  },
  {
    code: "MCB", ministry: "MOWCA", amount: 800, annualBudget: 1_200_00_00_000,
    nameBn: "মা ও শিশু সহায়তা", nameEn: "Mother & Child Benefit",
    descriptionBn: "দরিদ্র গর্ভবতী মায়েদের জন্য মাসিক সহায়তা।", descriptionEn: "Monthly support for poor pregnant mothers.",
    legacyCardBn: "মাতৃত্বকালীন ভাতা কার্ড", legacyCardEn: "Maternity allowance card",
    rules: { all: [{ field: "isPregnant", op: "eq", value: true }, { field: "monthlyIncome", op: "lte", value: 15000 }] },
  },
  {
    code: "FARM", ministry: "MOA", amount: 1500, frequency: "quarterly", annualBudget: 1_906_00_00_000,
    nameBn: "কৃষি উপকরণ সহায়তা", nameEn: "Farmer Input Support",
    descriptionBn: "২.৫ একরের কম জমির প্রান্তিক কৃষক।", descriptionEn: "Marginal farmers with under 2.5 acres.",
    legacyCardBn: "কৃষি উপকরণ সহায়তা কার্ড / স্মার্ট কৃষক কার্ড", legacyCardEn: "Farmer input card / Smart Farmer Card",
    rules: { all: [{ field: "occupation", op: "eq", value: "farmer" }, { field: "landDecimals", op: "lte", value: 250 }] },
  },
  {
    code: "FISH", ministry: "MOFL", amount: 2000, frequency: "quarterly", annualBudget: 800_00_00_000,
    nameBn: "জেলে ভিজিএফ সহায়তা", nameEn: "Fisher VGF Support",
    descriptionBn: "নিষেধাজ্ঞাকালীন নিবন্ধিত জেলেদের সহায়তা।", descriptionEn: "Support for registered fishers during fishing bans.",
    legacyCardBn: "জেলে পরিচয়পত্র", legacyCardEn: "Fisher ID card",
    rules: { all: [{ field: "occupation", op: "eq", value: "fisher" }] },
  },
];

// Curated demo citizens — fixed NIDs/DOBs printed on the login page in development.
const DEMO_CITIZENS = [
  { nid: "1990000001", dob: "1956-03-14", phone: "+8801711000001", nameBn: "রহিমা বেগম", nameEn: "Rahima Begum", gender: "female", marital: "widowed", occupation: "homemaker", income: 3500, story: "oaa" },
  { nid: "1990000002", dob: "1979-07-02", phone: "+8801711000002", nameBn: "আব্দুল করিম", nameEn: "Abdul Karim", gender: "male", marital: "married", occupation: "farmer", income: 7000, story: "excluded" },
  { nid: "1990000003", dob: "1975-11-20", phone: "+8801711000003", nameBn: "তানভীর হোসেন", nameEn: "Tanvir Hossain", gender: "male", marital: "married", occupation: "business", income: 180000, story: "affluent" },
] as const;

const STAFF = [
  { email: "admin@ekporichoy.test", name: "Super Admin (Cabinet Division)", role: "super_admin" },
  { email: "auditor@ekporichoy.test", name: "Auditor (CAG Office)", role: "auditor" },
  { email: "pm@ekporichoy.test", name: "Programme Manager (DSS)", role: "program_manager" },
  { email: "officer@ekporichoy.test", name: "Field Officer — Dhaka", role: "field_officer", jurisdiction: "30" },
  { email: "officer2@ekporichoy.test", name: "Field Officer 2 — Dhaka", role: "field_officer", jurisdiction: "30" },
  { email: "bkash@ekporichoy.test", name: "bKash Disbursement Desk", role: "payer", payerOrg: "bkash" },
  { email: "nagad@ekporichoy.test", name: "Nagad Disbursement Desk", role: "payer", payerOrg: "nagad" },
  { email: "rocket@ekporichoy.test", name: "Rocket Disbursement Desk", role: "payer", payerOrg: "rocket" },
  { email: "sonali@ekporichoy.test", name: "Sonali Bank G2P Desk", role: "payer", payerOrg: "sonali_bank" },
] as const;

async function chunkInsert<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 1000) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

async function main() {
  const [{ n } = { n: 0 }] = await db.execute<{ n: number }>(sql`select count(*)::int n from people`);
  if (Number(n) > 0) {
    console.log("Database already seeded — run `pnpm db:reset` to start over.");
    process.exit(0);
  }
  console.time("seed");

  // ── staff identities ──
  const hash = await hashPassword(PASSWORD);
  const staffIds: Record<string, string> = {};
  for (const st of STAFF) {
    const id = randomUUID();
    staffIds[st.email] = id;
    await db.insert(user).values({
      id, email: st.email, name: st.name, emailVerified: true, role: st.role,
      payerOrg: "payerOrg" in st ? st.payerOrg : null, jurisdiction: "jurisdiction" in st ? st.jurisdiction : null,
    });
    await db.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
  }
  const actor = (email: string, role: Actor["role"]): Actor => ({ id: staffIds[email]!, role });
  const admin = actor("admin@ekporichoy.test", "super_admin");
  const pm = actor("pm@ekporichoy.test", "program_manager");

  // ── programmes ──
  const ministryRows = await db.insert(ministries).values(MINISTRIES).returning();
  const ministryId = Object.fromEntries(ministryRows.map((m) => [m.code, m.id]));
  const programRows = await db.insert(programs)
    .values(PROGRAMS.map(({ ministry, ...p }) => ({ ...p, ministryId: ministryId[ministry]! })))
    .returning();
  const programByCode = Object.fromEntries(programRows.map((p) => [p.code, p]));

  // ── registry: households + people + signals ──
  type P = typeof people.$inferInsert;
  type S = typeof personSignals.$inferInsert;
  const hh: (typeof households.$inferInsert)[] = [];
  const ppl: P[] = [];
  const sig: S[] = [];
  let seq = 0;
  const nextNid = () => String(2_000_000_000 + (seq++) * 1931 + int(0, 900));
  const phoneUsed = new Set<string>();
  const nextPhone = () => {
    let p: string;
    do p = `+8801${pick(["3", "5", "6", "7", "8", "9"])}${String(int(0, 99_999_999)).padStart(8, "0")}`; while (phoneUsed.has(p));
    phoneUsed.add(p);
    return p;
  };
  const dobForAge = (age: number) => `${new Date().getUTCFullYear() - age}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`;

  const HOUSEHOLDS = 1100;
  for (let h = 0; h < HOUSEHOLDS; h++) {
    const division = weighted(DIVISIONS.map((d) => [d, d.code === "30" ? 4 : d.code === "20" ? 2 : 1] as [typeof d, number]));
    const id = randomUUID();
    hh.push({ id, divisionCode: division.code, district: division.bn, upazila: pick(UPAZILAS), union: pick(UNIONS) });
    const cls = weighted<"poor" | "middle" | "rich">([["poor", 55], ["middle", 30], ["rich", 15]]);
    const income = cls === "poor" ? int(1500, 11000) : cls === "middle" ? int(15000, 45000) : int(60000, 250000);
    const base: Omit<S, "nid"> = {
      monthlyIncome: income,
      landDecimals: cls === "poor" ? int(0, 60) : cls === "middle" ? int(20, 200) : int(100, 900),
      isTaxpayer: cls === "rich" ? chance(0.85) : cls === "middle" && chance(0.25),
      ownsVehicle: cls === "rich" && chance(0.6),
      monthlyElectricityKwh: cls === "poor" ? int(0, 90) : cls === "middle" ? int(100, 260) : int(280, 900),
      isGovtEmployee: cls !== "poor" && chance(0.12),
      sources: { monthlyIncome: "nbr_tax", landDecimals: "land_office", monthlyElectricityKwh: "utility", ownsVehicle: "brta", hasDisability: "dghs" },
    };
    const occupationHead = cls === "rich" ? pick(["business", "service"]) : weighted([["farmer", 35], ["labourer", 30], ["fisher", 12], ["service", 8], ["business", 15]] as [string, number][]);
    const size = int(1, 5);
    const headAge = int(24, 88);
    const headMale = chance(0.78);
    const surnameM = pick(SURNAME_M);
    for (let m = 0; m < size; m++) {
      const isHead = m === 0;
      const isSpouse = m === 1;
      const male = isHead ? headMale : isSpouse ? !headMale : chance(0.5);
      const age = isHead ? headAge : isSpouse ? Math.max(18, headAge + int(-8, 4)) : int(18, Math.max(19, headAge - 18));
      if (!isHead && !isSpouse && age < 18) continue;
      const first = pick(male ? MALE : FEMALE);
      const last = male ? surnameM : pick(SURNAME_F);
      const marital = isHead && size === 1 && !male && age > 50 ? "widowed"
        : !male && age > 55 && chance(0.3) ? "widowed"
        : isHead || isSpouse ? "married" : chance(0.6) ? "single" : "married";
      const nid = nextNid();
      ppl.push({
        nid, nameBn: `${first[0]} ${last[0]}`, nameEn: `${first[1]} ${last[1]}`, dob: dobForAge(age),
        gender: male ? "male" : "female", maritalStatus: marital as P["maritalStatus"],
        phone: age >= 18 ? nextPhone() : null, householdId: id, divisionCode: division.code,
        occupation: isHead ? occupationHead : !male && chance(0.6) ? "homemaker" : pick(["labourer", "student", "unemployed", occupationHead]),
        isDeceased: age > 60 && chance(0.04),
      });
      sig.push({ ...base, nid, hasDisability: chance(0.04), isPregnant: !male && age >= 18 && age <= 38 && chance(0.06) });
    }
  }
  // curated demo citizens, each in their own household in Dhaka
  for (const c of DEMO_CITIZENS) {
    const id = randomUUID();
    hh.push({ id, divisionCode: "30", district: "ঢাকা", upazila: "সাভার", union: "৩ নং" });
    ppl.push({ nid: c.nid, nameBn: c.nameBn, nameEn: c.nameEn, dob: c.dob, gender: c.gender, maritalStatus: c.marital, phone: c.phone, householdId: id, divisionCode: "30", occupation: c.occupation });
    sig.push({
      nid: c.nid, monthlyIncome: c.income, landDecimals: c.story === "excluded" ? 80 : c.story === "affluent" ? 600 : 0,
      isTaxpayer: c.story === "affluent", ownsVehicle: c.story === "affluent", monthlyElectricityKwh: c.story === "affluent" ? 650 : 45,
      sources: { monthlyIncome: "nbr_tax", landDecimals: "land_office", monthlyElectricityKwh: "utility", ownsVehicle: "brta" },
    });
  }
  await chunkInsert(hh, (c) => db.insert(households).values(c));
  await chunkInsert(ppl, (c) => db.insert(people).values(c));
  await chunkInsert(sig, (c) => db.insert(personSignals).values(c));
  console.log(`✓ registry: ${ppl.length} citizens in ${hh.length} households`);

  // ── payment accounts (incl. agent accounts shared across unrelated households) ──
  const accounts: (typeof paymentAccounts.$inferInsert)[] = [];
  const agentAccounts = Array.from({ length: 6 }, () => `017${String(int(0, 99_999_999)).padStart(8, "0")}`);
  const accountOf = new Map<string, string>();
  for (const p of ppl) {
    if (!p.phone || !chance(0.86)) continue;
    const provider = weighted<Provider>([["bkash", 40], ["nagad", 25], ["rocket", 10], ["sonali_bank", 25]]);
    const shared = chance(0.012);
    const number = shared ? pick(agentAccounts) : provider === "sonali_bank" ? `4402${String(int(0, 999_999_999)).padStart(9, "0")}` : p.phone.replace("+880", "0");
    accountOf.set(p.nid, number);
    accounts.push({ nid: p.nid, provider: shared ? "bkash" : provider, accountNumber: number, kycVerified: shared || chance(0.93) });
  }
  for (const c of DEMO_CITIZENS) {
    const idx = accounts.findIndex((a) => a.nid === c.nid);
    if (idx >= 0) accounts.splice(idx, 1);
    accounts.push({ nid: c.nid, provider: "bkash", accountNumber: c.phone.replace("+880", "0"), kycVerified: true });
  }
  await chunkInsert(accounts, (c) => db.insert(paymentAccounts).values(c));

  // ── legacy enrollments: the leaky status quo ──
  const sizeOf = new Map<string, number>();
  for (const p of ppl) sizeOf.set(p.householdId, (sizeOf.get(p.householdId) ?? 0) + 1);
  const signalOf = new Map(sig.map((x) => [x.nid, x]));
  const enr: (typeof enrollments.$inferInsert)[] = [];
  const cards: (typeof legacyCards.$inferInsert)[] = [];
  let cardSeq = 100000;
  const addLegacy = (nid: string, code: string, score: number, holder: string) => {
    enr.push({ nid, programId: programByCode[code]!.id, status: "active", source: "legacy_import", povertyScore: score });
    cards.push({ cardType: code, cardNumber: `${code}-${cardSeq++}`, holderName: holder, claimedNid: nid });
  };

  for (const p of ppl) {
    if (DEMO_CITIZENS.some((c) => c.nid === p.nid)) continue;
    const s = signalOf.get(p.nid)!;
    const profile = toProfile({ ...p, isDeceased: false }, s, sizeOf.get(p.householdId)!);
    const score = povertyScore(profile);
    const affluent = !evaluate(AFFLUENCE_GUARD, profile).eligible;
    const taken = new Set<string>();
    for (const prog of programRows) {
      // Programme rules alone (legacy systems never checked tax/vehicle/utility data)
      const meetsLegacyRules = evaluate(prog.rules, profile).eligible;
      if (meetsLegacyRules && !affluent && chance(0.36)) { addLegacy(p.nid, prog.code, score, p.nameEn); taken.add(prog.code); }
    }
    // Political / elite capture: affluent people holding poverty cards
    if (affluent && chance(0.28)) {
      const code = pick(["TCB", "OAA", "FARM"]);
      if (!taken.has(code)) { addLegacy(p.nid, code, score, p.nameEn); taken.add(code); }
    }
    // Double-dipping on mutually exclusive programmes
    if (taken.has("OAA") && p.gender === "female" && !taken.has("WA") && chance(0.35)) addLegacy(p.nid, "WA", score, p.nameEn);
  }
  // demo stories
  addLegacy("1990000001", "OAA", 92, "Rahima Begum");
  addLegacy("1990000003", "TCB", 5, "Tanvir Hossain");

  // Ghost & duplicate cards (cf. 5.7M of 10M TCB cards failing NID verification)
  const ghostCount = Math.round(cards.length * 0.22);
  for (let i = 0; i < ghostCount; i++) {
    const type = weighted<string>([["TCB", 6], ["FARM", 2], ["FISH", 1], ["OAA", 1]]);
    const dup = chance(0.35) ? pick(cards) : null;
    cards.push({
      cardType: dup ? dup.cardType! : type,
      cardNumber: `${dup ? dup.cardType : type}-${cardSeq++}`,
      holderName: dup ? dup.holderName! : `${pick(MALE)[1]} ${pick(SURNAME_M)[1]}`,
      claimedNid: dup ? dup.claimedNid : chance(0.5) ? String(9_000_000_000 + int(0, 99_999_999)) : null,
    });
  }

  await chunkInsert(enr, (c) => db.insert(enrollments).values(c).onConflictDoNothing());
  await chunkInsert(cards, (c) => db.insert(legacyCards).values(c).onConflictDoNothing());
  console.log(`✓ legacy: ${enr.length} enrollments, ${cards.length} legacy cards (${ghostCount} ghosts/duplicates)`);

  // Officer-proposed enrollments awaiting a different officer's verification (maker–checker queue)
  const officer2 = staffIds["officer2@ekporichoy.test"]!;
  const enrolled = new Set(enr.map((e) => `${e.nid}:${e.programId}`));
  const pending: (typeof enrollments.$inferInsert)[] = [];
  for (const p of ppl) {
    if (pending.length >= 24 || p.divisionCode !== "30" || DEMO_CITIZENS.some((c) => c.nid === p.nid)) continue;
    const s = signalOf.get(p.nid)!;
    const profile = toProfile(p, s, sizeOf.get(p.householdId)!);
    const prog = programRows.find((pr) => evaluate(effectiveRules(pr), profile).eligible && !enrolled.has(`${p.nid}:${pr.id}`));
    if (prog) pending.push({ nid: p.nid, programId: prog.id, status: "pending", source: "officer", povertyScore: povertyScore(profile), enrolledBy: officer2 });
  }
  if (pending.length) await db.insert(enrollments).values(pending).onConflictDoNothing();

  // ── three months of historical payouts (before integrity checks existed) ──
  const now = new Date();
  for (const back of [3, 2, 1]) {
    const period = periodOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)));
    for (const code of ["OAA", "WA", "DA", "TCB"]) await generateBatches(pm, programByCode[code]!.id, period);
  }
  for (const { batch } of await listBatches(admin, 500)) {
    await transitionBatch(admin, batch.id, "approved");
    await transitionBatch(pm, batch.id, "sent");
    const payer: Actor = { id: staffIds[STAFF.find((x) => "payerOrg" in x && x.payerOrg === batch.provider)!.email]!, role: "payer", payerOrg: batch.provider };
    await settleBatch(payer, batch.id);
  }
  // Current period: drafts awaiting approval, so the maker–checker flow is visible in the UI
  for (const code of ["OAA", "DA"]) await generateBatches(pm, programByCode[code]!.id, periodOf(now));
  console.log("✓ payouts: 3 settled months + current-period drafts");

  // ── Ek Porichoy switches on: cross-registry integrity scan + legacy-card matching ──
  // Mark a few recipients deceased *after* they were paid — the classic ghost-beneficiary case.
  await db.execute(sql`
    update people set is_deceased = true, deceased_at = current_date - 40
    where nid in (select nid from enrollments where status = 'active' and source = 'legacy_import' order by md5(nid) limit 9)
      and nid not in ('1990000001','1990000002','1990000003')`);
  const scan = await runIntegrityScan(admin);
  console.log(`✓ integrity scan: ${scan.newFlags} flags from ${scan.scanned} enrollments`);

  await db.insert(grievances).values([
    { nid: "1990000001", category: "not_received", message: "গত মাসের বয়স্ক ভাতা এখনো পাইনি। ইউনিয়ন অফিসে গেলে টাকা চায়।", status: "in_review", response: "বিষয়টি তদন্তাধীন; আপনার bKash অ্যাকাউন্টে সরাসরি পাঠানো হবে।" },
    ...ppl.filter((p) => p.divisionCode === "30" && p.phone).slice(0, 6).map((p, i) => ({
      nid: p.nid,
      category: (["exclusion", "corruption", "wrong_amount", "not_received", "exclusion", "other"] as const)[i]!,
      message: ["আমি যোগ্য হলেও তালিকায় নাম নেই।", "কার্ড দেওয়ার জন্য মেম্বার ৫০০ টাকা চেয়েছে।", "ভাতার টাকা কম এসেছে।", "দুই মাস ধরে টাকা আসছে না।", "প্রতিবন্ধী সন্তানের ভাতার আবেদন করতে চাই।", "মোবাইল নম্বর পরিবর্তন করতে চাই।"][i]!,
    })),
  ]);

  console.timeEnd("seed");
  console.log(`\nStaff logins (password: ${PASSWORD})`);
  for (const st of STAFF) console.log(`  ${st.role.padEnd(16)} ${st.email}`);
  console.log("\nCitizen logins (NID + DOB, OTP shown on screen in dev)");
  for (const c of DEMO_CITIZENS) console.log(`  ${c.nid}  ${c.dob}  ${c.nameEn} (${c.story})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
