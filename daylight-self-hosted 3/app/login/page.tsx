import { redirect } from "next/navigation";
import { isAuthenticated } from "../../lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");
  return (
    <main className="login-shell">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <section className="login-card glass">
        <div className="login-brand"><span className="brand-mark">D</span><div><strong>Daylight</strong><span>Your time, softly held.</span></div></div>
        <h1>Welcome back.</h1>
        <p>Enter the private password stored on this computer to open your planner.</p>
        <LoginForm />
        <div className="login-note">No account, email address, or internet connection required.</div>
      </section>
    </main>
  );
}
