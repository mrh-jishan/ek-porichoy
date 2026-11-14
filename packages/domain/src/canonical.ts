/**
 * Canonical JSON (recursively sorted object keys). Postgres jsonb does not preserve key order,
 * so anything compared or hashed after a DB round-trip must go through this.
 * Kept free of Node APIs so client components can import it.
 */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
