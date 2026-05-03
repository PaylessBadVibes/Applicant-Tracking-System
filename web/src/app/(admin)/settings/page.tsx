"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { JOB_TITLE_LABELS } from "@ats/shared";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { initialsFromName } from "@/lib/format";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await authClient.signOut();
    } catch {
      // best-effort
    } finally {
      router.replace("/sign-in");
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Your profile information." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !user ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{initialsFromName(user.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.displayName || user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {JOB_TITLE_LABELS[user.jobTitle]}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
