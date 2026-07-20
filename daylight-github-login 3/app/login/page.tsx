import { redirect } from "next/navigation";
import { isAuthenticated } from "../../lib/auth";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  cancelled: "GitHub sign-in was cancelled.",
  invalid_state: "That sign-in attempt expired. Please try again.",
  token: "GitHub could not complete sign-in. Please try again.",
  profile: "Your GitHub profile could not be verified.",
  not_allowed: "That GitHub account is not on this planner's allowlist.",
  configuration: "GitHub sign-in has not been configured yet.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect("/");
  const { error } = await searchParams;
  return (
    <main className="login-shell">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <section className="login-card glass">
        <div className="login-brand"><span className="brand-mark">D</span><div><strong>Daylight</strong><span>Your time, softly held.</span></div></div>
        <h1>Welcome back.</h1>
        <p>Continue with an approved GitHub account to open your private planner.</p>
        {error ? <p className="login-error" role="alert">{messages[error] ?? "Sign-in could not be completed."}</p> : null}
        <a className="github-login" href="/api/auth/github"><span aria-hidden="true">GH</span>Sign in with GitHub</a>
        <div className="login-note">Daylight requests only your public GitHub identity. Your tasks stay in this planner's private database.</div>
      </section>
    </main>
  );
}
