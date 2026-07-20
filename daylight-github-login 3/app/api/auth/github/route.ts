import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, appUrl, useSecureCookies } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=configuration", appUrl()));

  const state = randomBytes(32).toString("base64url");
  const callback = new URL("/api/auth/github/callback", appUrl());
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callback.toString());
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies(),
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
