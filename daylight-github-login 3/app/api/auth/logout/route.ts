import { NextResponse } from "next/server";
import { SESSION_COOKIE, useSecureCookies } from "../../../../lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: useSecureCookies(), maxAge: 0, path: "/" });
  return response;
}
