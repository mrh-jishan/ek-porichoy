/**
 * Privacy filter for Umami (runs in the browser via data-before-send, before any event leaves the page).
 * Removes query parameters that can carry personal data and masks long digit runs (NIDs, phone numbers)
 * anywhere in the URL, while keeping campaign parameters such as utm_source.
 *
 * Must stay self-contained (no imports, no closures) and avoid syntax that compiles to helpers
 * (spread, destructuring): it is serialised with Function#toString() into an inline script.
 */
export function umamiBeforeSend(_type: string, payload: { url?: string; referrer?: string } & Record<string, unknown>) {
  const SENSITIVE = ["nid", "dob", "phone", "phonenumber", "code", "otp", "email", "token", "next"];
  const scrub = (raw?: string) => {
    if (!raw) return raw;
    try {
      const u = new URL(raw, "https://placeholder.invalid");
      for (const key of Array.from(u.searchParams.keys())) {
        if (SENSITIVE.includes(key.toLowerCase())) u.searchParams.delete(key);
      }
      // URL() percent-encodes non-ASCII (e.g. Bangla digits), so decode before masking.
      let path = u.pathname;
      try { path = decodeURIComponent(path); } catch { /* keep encoded */ }
      const masked = (path + u.search).replace(/[0-9০-৯]{10,}/g, "[redacted]");
      return u.origin === "https://placeholder.invalid" ? masked : u.origin + masked;
    } catch {
      return raw.replace(/[0-9০-৯]{10,}/g, "[redacted]");
    }
  };
  return Object.assign({}, payload, { url: scrub(payload.url), referrer: scrub(payload.referrer) });
}
