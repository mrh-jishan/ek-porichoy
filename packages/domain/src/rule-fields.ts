import type { Condition, Operator, ProfileField, RuleSet } from "./eligibility.ts";

/**
 * Metadata for every profile field a programme rule may use. Single source of truth for
 * the visual rule builder (inputs, operators), server-side rule validation and plain-language summaries.
 * `isDeceased` is intentionally absent: it is enforced globally and cannot be configured.
 */
export type FieldType = "number" | "boolean" | "enum";

export interface FieldMeta {
  type: FieldType;
  /** For enums: allowed values. */
  options?: readonly string[];
  /** For numbers: display unit and input hints. */
  unit?: "money" | "years" | "decimals" | "kwh" | "people";
  step?: number;
  min?: number;
  /** Registry the value comes from (shown in the builder). */
  source: "ec_nid" | "nbr_tax" | "land_office" | "utility" | "brta" | "dghs";
}

export const RULE_FIELDS = {
  age: { type: "number", unit: "years", step: 1, min: 0, source: "ec_nid" },
  gender: { type: "enum", options: ["male", "female", "other"], source: "ec_nid" },
  maritalStatus: { type: "enum", options: ["single", "married", "widowed", "divorced"], source: "ec_nid" },
  occupation: {
    type: "enum",
    options: ["farmer", "fisher", "labourer", "service", "business", "homemaker", "unemployed", "student"],
    source: "ec_nid",
  },
  householdSize: { type: "number", unit: "people", step: 1, min: 1, source: "ec_nid" },
  monthlyIncome: { type: "number", unit: "money", step: 500, min: 0, source: "nbr_tax" },
  landDecimals: { type: "number", unit: "decimals", step: 10, min: 0, source: "land_office" },
  monthlyElectricityKwh: { type: "number", unit: "kwh", step: 10, min: 0, source: "utility" },
  isTaxpayer: { type: "boolean", source: "nbr_tax" },
  ownsVehicle: { type: "boolean", source: "brta" },
  isGovtEmployee: { type: "boolean", source: "nbr_tax" },
  hasDisability: { type: "boolean", source: "dghs" },
  isPregnant: { type: "boolean", source: "dghs" },
} as const satisfies Partial<Record<ProfileField, FieldMeta>>;

export type RuleField = keyof typeof RULE_FIELDS;
export const RULE_FIELD_LIST = Object.keys(RULE_FIELDS) as RuleField[];

export const OPERATORS_BY_TYPE: Record<FieldType, readonly Operator[]> = {
  number: ["gte", "lte", "gt", "lt", "eq", "neq"],
  enum: ["eq", "neq", "in"],
  boolean: ["eq"],
};

export const operatorsFor = (field: RuleField) => OPERATORS_BY_TYPE[RULE_FIELDS[field].type];

/** A sensible starting condition when a user picks a field. */
export function defaultCondition(field: RuleField = "age"): Condition {
  const meta: FieldMeta = RULE_FIELDS[field];
  const op = OPERATORS_BY_TYPE[meta.type][0]!;
  const value = meta.type === "boolean" ? false : meta.type === "enum" ? meta.options![0]! : meta.unit === "years" ? 18 : 0;
  return { field, op, value };
}

/** Structural validation of a rule tree against field metadata. Returns a list of problems (empty = valid). */
export function validateRuleSet(rules: RuleSet, depth = 0): string[] {
  const children = "all" in rules ? rules.all : rules.any;
  if (depth > 3) return ["too_deep"];
  if (children.length === 0) return ["empty_group"];
  return children.flatMap((node): string[] => {
    if (!("field" in node)) return validateRuleSet(node, depth + 1);
    const meta = (RULE_FIELDS as Record<string, FieldMeta>)[node.field];
    if (!meta) return [`unknown_field:${node.field}`];
    if (!OPERATORS_BY_TYPE[meta.type].includes(node.op)) return [`bad_operator:${node.field}`];
    const ok =
      meta.type === "number" ? typeof node.value === "number" && Number.isFinite(node.value)
      : meta.type === "boolean" ? typeof node.value === "boolean"
      : node.op === "in"
        ? Array.isArray(node.value) && node.value.length > 0 && node.value.every((v) => meta.options!.includes(String(v)))
        : meta.options!.includes(String(node.value));
    return ok ? [] : [`bad_value:${node.field}`];
  });
}
