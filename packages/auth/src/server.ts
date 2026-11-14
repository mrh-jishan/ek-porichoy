import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, phoneNumber } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db, people, schema, user } from "@ep/db";
import { ac, roles } from "./permissions";
import { queueOtpSms } from "./sms";

export const SESSION_TTL = { staff: 60 * 60 * 8, citizen: 60 * 60 * 24 * 7 };

export const auth = betterAuth({
  appName: "Ek Porichoy",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  // Staff accounts are provisioned by administrators only — no public sign-up.
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
  session: {
    expiresIn: SESSION_TTL.citizen,
    updateAge: 60 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    // Production: storage "secondary-storage" backed by Redis so limits hold across all replicas.
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/phone-number/send-otp": { window: 60, max: 3 },
      "/phone-number/verify": { window: 60, max: 5 },
    },
  },
  user: {
    additionalFields: {
      nid: { type: "string", required: false, input: false },
      payerOrg: { type: "string", required: false, input: false },
      jurisdiction: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Staff get short sessions (8 h); citizens keep the default (7 days).
        before: async (session) => {
          const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, session.userId)).limit(1);
          if (!u || u.role === "citizen") return { data: session };
          return { data: { ...session, expiresAt: new Date(Date.now() + SESSION_TTL.staff * 1000) } };
        },
      },
    },
    user: {
      create: {
        // A citizen identity is created on first OTP verification; bind it to the EC record that owns the phone.
        before: async (u) => {
          const phone = (u as { phoneNumber?: string }).phoneNumber;
          if (!phone) return { data: u };
          const [person] = await db.select({ nid: people.nid, nameEn: people.nameEn }).from(people).where(eq(people.phone, phone)).limit(1);
          if (!person) return false;
          return { data: { ...u, nid: person.nid, name: person.nameEn, role: "citizen" } };
        },
      },
    },
  },
  plugins: [
    admin({ ac, roles, defaultRole: "citizen", adminRoles: ["super_admin"] }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      sendOTP: async ({ phoneNumber: to, code }) => queueOtpSms(to, code),
      signUpOnVerification: {
        getTempEmail: (p) => `${p.replace(/\D/g, "")}@citizen.ekporichoy.test`,
        getTempName: (p) => p,
      },
    }),
    nextCookies(), // must be last: lets server actions set auth cookies
  ],
});

export type Auth = typeof auth;
export type AuthSession = typeof auth.$Infer.Session;
export { devPeekOtp } from "./sms";
