import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "daylight_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return value;
}

export function verifyPassword(password: string) {
  const stored = process.env.PLANNER_PASSWORD_HASH ?? "";
  const [kind, salt, expectedHex] = stored.split(":");
  if (kind !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSession() {
  const payload = Buffer.from(JSON.stringify({ issued: Date.now(), nonce: randomUUID() })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(value: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { issued?: number };
    return typeof data.issued === "number" && Date.now() - data.issued < MAX_AGE_SECONDS * 1000;
  } catch { return false; }
}

export async function isAuthenticated() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? verifySession(value) : false;
}

export const sessionMaxAge = MAX_AGE_SECONDS;
