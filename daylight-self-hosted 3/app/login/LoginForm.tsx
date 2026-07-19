"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setError(data.error ?? "That password did not match.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("The planner could not be reached. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" value={password}
        onChange={(event) => setPassword(event.target.value)} autoFocus required />
      <p className="login-error" role="alert">{error}</p>
      <button type="submit" disabled={busy}>{busy ? "Opening…" : "Open Daylight"}</button>
    </form>
  );
}
