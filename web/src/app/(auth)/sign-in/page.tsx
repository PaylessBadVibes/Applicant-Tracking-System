"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result?.error) {
        setError(humanizeAuthError(result.error.code, result.error.message ?? result.error.code ?? ""));
        setSubmitting(false);
        return;
      }
      startTransition(() => router.replace(next));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      setError(humanizeAuthError(undefined, message));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Sign in
        </p>
        <h2 className="font-serif text-3xl font-light leading-tight tracking-tight text-foreground">
          Welcome back.
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Use the credentials provisioned for your administrator account.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Email
          </Label>
          <Input id="email" type="email" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)} required disabled={submitting} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Password
          </Label>
          <Input id="password" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} required disabled={submitting} className="h-11" />
        </div>
        <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting || isPending}>
          {submitting || isPending ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Not an admin? This system has no public sign-up — contact your HR lead.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function humanizeAuthError(code: string | undefined, fallback: string): string {
  if (!code && !fallback) return "Sign-in failed.";
  const normalized = (code ?? fallback ?? "").toUpperCase();
  if (normalized.includes("INVALID_CREDENTIALS") || normalized.includes("USER_NOT_FOUND") || normalized.includes("INCORRECT")) {
    return "Invalid email or password.";
  }
  if (normalized.includes("TOO_MANY")) {
    return "Too many attempts. Try again shortly.";
  }
  if (normalized.includes("DISABLED") || normalized.includes("INACTIVE")) {
    return "Account is disabled. Contact your HR lead.";
  }
  return fallback || "Sign-in failed.";
}
