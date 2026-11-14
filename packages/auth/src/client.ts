"use client";
import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, phoneNumberClient } from "better-auth/client/plugins";
import type { Auth } from "./server";
import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles }), phoneNumberClient(), inferAdditionalFields<Auth>()],
});

export const { useSession, signIn, signOut } = authClient;
