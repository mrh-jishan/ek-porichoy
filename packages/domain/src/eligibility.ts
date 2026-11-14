/**
 * Declarative eligibility rules. Program managers configure these as data (stored as JSON),
 * so new safety-net programmes need NO new card, survey or code - only a rule set
 * evaluated against the citizen's linked-registry profile.
 */
export interface CitizenProfile {
  age: number;
  gender: "male" | "female" | "other";
  maritalStatus: "single" | "married" | "widowed" | "divorced";
  monthlyIncome: number;
  householdSize: number;
  landDecimals: number;
  isTaxpayer: boolean;
  ownsVehicle: boolean;
  monthlyElectricityKwh: number;
  isGovtEmployee: boolean;
  hasDisability: boolean;
  isPregnant: boolean;
  occupation: "farmer" | "fisher" | "labourer" | "service" | "business" | "homemaker" | "unemployed" | "student";
  isDeceased: boolean;
}

export type ProfileField = keyof CitizenProfile;
export type Operator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";

export interface Condition {
  field: ProfileField;
  op: Operator;
  value: string | number | boolean | Array<string | number>;
}

export type RuleSet = { all: Array<Condition | RuleSet> } | { any: Array<Condition | RuleSet> };

const isCondition = (node: Condition | RuleSet): node is Condition => "field" in node;

const compare = (actual: unknown, { op, value }: Condition): boolean => {
  switch (op) {
    case "eq": return actual === value;
    case "neq": return actual !== value;
    case "gt": return Number(actual) > Number(value);
    case "gte": return Number(actual) >= Number(value);
    case "lt": return Number(actual) < Number(value);
    case "lte": return Number(actual) <= Number(value);
    case "in": return Array.isArray(value) && value.includes(actual as never);
  }
};

export interface EvaluationResult {
  eligible: boolean;
  /** Conditions that failed - shown to citizens/officers so decisions are explainable. */
  failed: Condition[];
}

export function evaluate(rules: RuleSet, profile: CitizenProfile): EvaluationResult {
  const failed: Condition[] = [];
  const walk = (node: Condition | RuleSet): boolean => {
    if (isCondition(node)) {
      const ok = compare(profile[node.field], node);
      if (!ok) failed.push(node);
      return ok;
    }
    if ("all" in node) return node.all.map(walk).every(Boolean);
    return node.any.map(walk).some(Boolean);
  };
  // Deceased citizens are never eligible, regardless of programme rules.
  const eligible = !profile.isDeceased && walk(rules);
  return { eligible, failed: profile.isDeceased ? [{ field: "isDeceased", op: "eq", value: false }] : failed };
}

/**
 * Universal affluence guard applied to every poverty-targeted programme.
 * Addresses the World Bank finding that ~31% of wealthy households receive allowances.
 */
export const AFFLUENCE_GUARD: RuleSet = {
  all: [
    { field: "isTaxpayer", op: "eq", value: false },
    { field: "ownsVehicle", op: "eq", value: false },
    { field: "isGovtEmployee", op: "eq", value: false },
    { field: "monthlyElectricityKwh", op: "lte", value: 250 },
  ],
};

/** Proxy-means score 0–100 (higher = poorer). Used to rank households when budgets are capped. */
export function povertyScore(p: CitizenProfile): number {
  const perCapita = p.monthlyIncome / Math.max(1, p.householdSize);
  let score = 100;
  score -= Math.min(45, perCapita / 200);
  score -= Math.min(20, p.landDecimals / 5);
  score -= Math.min(15, p.monthlyElectricityKwh / 20);
  if (p.isTaxpayer) score -= 25;
  if (p.ownsVehicle) score -= 20;
  if (p.hasDisability) score += 8;
  if (p.maritalStatus === "widowed") score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}
