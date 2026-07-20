import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "daylight_session";
export const OAUTH_STATE_COOKIE = "daylight_oauth_state";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  githubId: number;
  login: string;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return value;
}

export function appUrl() {
  const value = process.env.APP_URL ?? "http://localhost:3000";
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("APP_URL must use http or https.");
  return url.origin;
}

export function useSecureCookies() {
  return process.env.COOKIE_SECURE === "true";
}

export function isAllowedGithubUser(user: SessionUser) {
  const allowed = (process.env.ALLOWED_GITHUB_LOGINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.login.toLowerCase());
}

export function createSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, issued: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(value: string): SessionUser | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionUser & { issued?: number };
    if (typeof data.issued !== "number" || Date.now() - data.issued >= MAX_AGE_SECONDS * 1000) return null;
    if (!Number.isInteger(data.githubId) || typeof data.login !== "string") return null;
    return { githubId: data.githubId, login: data.login };
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? verifySession(value) : null;
}

export async function isAuthenticated() {
  const user = await getSessionUser();
  return Boolean(user && isAllowedGithubUser(user));
}

export const sessionMaxAge = MAX_AGE_SECONDS;
