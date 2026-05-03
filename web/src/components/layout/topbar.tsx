"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { JOB_TITLE_LABELS, type JobTitle } from "@ats/shared";
import { initialsFromName } from "@/lib/format";
import { authClient } from "@/lib/auth-client";

export function Topbar({ email, displayName, jobTitle }: {
  email: string; displayName: string; jobTitle: JobTitle;
}) {
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
    <header className="flex h-16 items-center justify-between gap-1 border-b border-border bg-background px-4 sm:px-6 lg:px-12">
      <div className="flex items-center gap-2 lg:hidden">
        <MobileNav />
        <span className="inline-block h-2 w-2 rounded-full bg-primary" />
        <span className="font-serif text-base font-medium tracking-tight text-foreground">ATS</span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[11px] font-medium">
                  {initialsFromName(displayName) || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium leading-none">{displayName || email}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {JOB_TITLE_LABELS[jobTitle] ?? "Admin"}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
