import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, sessionMaxAge, verifyPassword } from "../../../../lib/auth";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function POST(request: Request) {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const existing = attempts.get(client);
  const record = !existing || existing.resetAt < now ? { count: 0, resetAt: now + WINDOW_MS } : existing;
  if (record.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Please wait fifteen minutes." }, { status: 429 });
  }
  const { password } = await request.json() as { password?: string };
  if (!password || !verifyPassword(password)) {
    record.count += 1;
    attempts.set(client, record);
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "That password did not match." }, { status: 401 });
  }
  attempts.delete(client);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSession(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: sessionMaxAge,
    path: "/",
  });
  return response;
}
