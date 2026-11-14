/** Bangladesh NID numbers are 10 digits (smart card) or 17 digits (legacy, includes birth year + area code). */
export const NID_PATTERN = /^(\d{10}|\d{17})$/;

export const isValidNid = (nid: string): boolean => NID_PATTERN.test(nid.trim());

/** Show only the last four digits - never render a full NID outside of the owner's own session. */
export const maskNid = (nid: string): string =>
  nid.length <= 4 ? nid : `${"•".repeat(Math.max(0, nid.length - 4))}${nid.slice(-4)}`;

export const maskAccount = (account: string): string =>
  account.length <= 4 ? account : `••••${account.slice(-4)}`;

/** Normalise a BD mobile number to E.164 (+8801XXXXXXXXX). Returns null when invalid. */
export const normalizeBdPhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^1[3-9]\d{8}$/.test(local) ? `+880${local}` : null;
};
