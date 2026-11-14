import { desc, sql } from "drizzle-orm";
import { db, outbox } from "@ep/db";

/**
 * SMS gateway port. OTPs are written to the transactional outbox and delivered by a worker
 * (Teletalk/Robi/GP A2P gateway adapter), which purges the code after delivery.
 * In development the latest code can be read back to show on screen.
 */
export async function queueOtpSms(phoneNumber: string, code: string) {
  await db.insert(outbox).values({ topic: "sms.otp", payload: { to: phoneNumber, code } });
  if (process.env.NODE_ENV !== "production") console.info(`[sms] OTP for ${phoneNumber}: ${code}`);
}

export async function devPeekOtp(phoneNumber: string): Promise<string | null> {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") return null;
  const [row] = await db
    .select({ payload: outbox.payload })
    .from(outbox)
    .where(sql`${outbox.topic} = 'sms.otp' and ${outbox.payload}->>'to' = ${phoneNumber}`)
    .orderBy(desc(outbox.createdAt))
    .limit(1);
  return (row?.payload as { code?: string } | undefined)?.code ?? null;
}

