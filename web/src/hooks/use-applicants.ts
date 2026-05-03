"use client";

import { useCallback, useEffect, useState } from "react";
import type { Applicant } from "@ats/shared";
import { api, ApiError } from "@/lib/api-client";

export interface ApplicantsListResponse {
  items: Applicant[];
  nextCursor: string | null;
  total: number;
}

export interface UseApplicantsResult {
  data: ApplicantsListResponse | null;
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useApplicants(queryString: string): UseApplicantsResult {
  const [data, setData] = useState<ApplicantsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApplicantsListResponse>(
        `/api/applicants?${queryString}`
      );
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) setError(err);
      else setError(new ApiError(500, { message: "Unknown error" }));
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
