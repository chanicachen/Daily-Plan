import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  appUrl,
  createSession,
  isAllowedGithubUser,
  sessionMaxAge,
  useSecureCookies,
  type SessionUser,
} from "../../../../../lib/auth";

export const runtime = "nodejs";

function loginRedirect(error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, appUrl()));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const oauthError = request.nextUrl.searchParams.get("error");
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  let response: NextResponse;
  if (oauthError) {
    response = loginRedirect("cancelled");
  } else if (!clientId || !clientSecret) {
    response = loginRedirect("configuration");
  } else if (!code || !state || !expectedState || state !== expectedState) {
    response = loginRedirect("invalid_state");
  } else {
    try {
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: new URL("/api/auth/github/callback", appUrl()).toString(),
        }),
        cache: "no-store",
      });
      const tokenData = await tokenResponse.json() as { access_token?: string };
      if (!tokenResponse.ok || !tokenData.access_token) throw new Error("token");

      const profileResponse = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "Daylight-Planner",
        },
        cache: "no-store",
      });
      const profile = await profileResponse.json() as { id?: number; login?: string };
      if (!profileResponse.ok || !Number.isInteger(profile.id) || typeof profile.login !== "string") throw new Error("profile");

      const user: SessionUser = { githubId: profile.id!, login: profile.login };
      if (!isAllowedGithubUser(user)) {
        response = loginRedirect("not_allowed");
      } else {
        response = NextResponse.redirect(new URL("/", appUrl()));
        response.cookies.set(SESSION_COOKIE, createSession(user), {
          httpOnly: true,
          sameSite: "strict",
          secure: useSecureCookies(),
          maxAge: sessionMaxAge,
          path: "/",
        });
      }
    } catch (error) {
      response = loginRedirect(error instanceof Error && error.message === "profile" ? "profile" : "token");
    }
  }

  response.cookies.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
