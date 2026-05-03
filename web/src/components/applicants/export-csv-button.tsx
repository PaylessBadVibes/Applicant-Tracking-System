"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { Applicant } from "@ats/shared";
import { Button } from "@/components/ui/button";
import { downloadApplicantsCsv } from "@/lib/csv";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

export interface ExportCsvButtonProps {
  loadedItems: Applicant[];
  totalCount: number;
  baseQueryString: string;
}

export function ExportCsvButton({ loadedItems, totalCount, baseQueryString }: ExportCsvButtonProps) {
  const [busy, setBusy] = useState(false);
  const allLoaded = loadedItems.length >= totalCount && totalCount > 0;
  const label = allLoaded
    ? `Export (${loadedItems.length})`
    : `Export all (${totalCount || loadedItems.length})`;

  async function handleClick() {
    if (allLoaded) {
      downloadApplicantsCsv(loadedItems);
      return;
    }
    setBusy(true);
    try {
      const collected: Applicant[] = [];
      let cursor: string | null = null;
      const params = new URLSearchParams(baseQueryString);
      params.set("limit", "100");
      while (true) {
        const url: string = `/api/applicants?${params.toString()}${cursor ? `&cursor=${cursor}` : ""}`;
        const pageRes: { items: Applicant[]; nextCursor: string | null } = await api.get<{
          items: Applicant[];
          nextCursor: string | null;
        }>(url);
        collected.push(...pageRes.items);
        if (!pageRes.nextCursor) break;
        cursor = pageRes.nextCursor;
        if (collected.length > 50000) break;
      }
      downloadApplicantsCsv(collected);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={busy}>
      <Download className="mr-1.5 h-3.5 w-3.5" />
      {busy ? "Exporting…" : label}
    </Button>
  );
}
