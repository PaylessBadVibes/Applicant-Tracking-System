"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { JobTitle } from "@ats/shared";

export interface CurrentUserDto {
  uid: string;
  email: string;
  displayName: string;
  jobTitle: JobTitle;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get<CurrentUserDto>("/api/me")
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
