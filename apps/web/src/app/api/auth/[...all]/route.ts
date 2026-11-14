import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@ep/auth/server";

export const { GET, POST } = toNextJsHandler(auth);
