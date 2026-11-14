import { test } from "node:test";
import assert from "node:assert/strict";
import { umamiBeforeSend } from "./analytics-sanitize.ts";

test("strips NID and other personal params, keeps UTM", () => {
  const out = umamiBeforeSend("pageview", { url: "/en/officer/lookup?nid=1990000002&utm_source=reddit&utm_campaign=launch" });
  assert.equal(out.url, "/en/officer/lookup?utm_source=reddit&utm_campaign=launch");
});

test("masks long digit runs in paths, Latin and Bangla digits", () => {
  assert.equal(umamiBeforeSend("pageview", { url: "/bn/x/19900000021234567" }).url, "/bn/x/[redacted]");
  assert.equal(umamiBeforeSend("pageview", { url: "/bn/x/১৯৯০০০০০০১" }).url, "/bn/x/[redacted]");
});

test("leaves ordinary URLs and absolute referrers intact", () => {
  const out = umamiBeforeSend("pageview", { url: "/bn/citizen/payments", referrer: "https://www.reddit.com/r/bangladesh/" });
  assert.equal(out.url, "/bn/citizen/payments");
  assert.equal(out.referrer, "https://www.reddit.com/r/bangladesh/");
});

test("drops login redirect target and OTP code", () => {
  assert.equal(umamiBeforeSend("pageview", { url: "/en/login?next=%2Fen%2Fadmin&code=123456" }).url, "/en/login");
});
