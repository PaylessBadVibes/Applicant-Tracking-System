"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Download } from "lucide-react";
import {
  DEPARTMENT_LABELS,
  TRADE_TEST_OUTCOME_LABELS,
} from "@ats/shared";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import type { TradeTestRow } from "./trade-test-list-table";

const HARD_CAP = 5000;
const PAGE_SIZE = 200;

interface ListResponse {
  items: TradeTestRow[];
  nextCursor: string | null;
  total: number;
}

export function ExportTradeTestsCsvButton({
  baseQueryString,
  totalCount,
}: {
  baseQueryString: string;
  totalCount: number;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const all: TradeTestRow[] = [];
      let cursor: string | null = null;
      while (all.length < HARD_CAP) {
        const sp = new URLSearchParams(baseQueryString);
        sp.set("limit", String(PAGE_SIZE));
        if (cursor) sp.set("cursor", cursor);
        const res: ListResponse = await api.get<ListResponse>(
          `/api/trade-test-attempts?${sp.toString()}`
        );
        all.push(...res.items);
        if (!res.nextCursor) break;
        cursor = res.nextCursor;
      }
      if (all.length === 0) {
        toast.error("No rows to export.");
        return;
      }
      const truncated = all.length >= HARD_CAP && totalCount > HARD_CAP;
      const rows = all.map((r) => ({
        Name: r.applicant.name,
        Email: r.applicant.email,
        Department: DEPARTMENT_LABELS[r.applicant.department] ?? r.applicant.department,
        "Attempt #": r.attemptNumber,
        "Scheduled At": r.scheduledAt,
        Outcome: TRADE_TEST_OUTCOME_LABELS[r.outcome] ?? r.outcome,
        "Recorded At": r.recordedAt ?? "",
      }));
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trade-tests-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(
        truncated
          ? `Exported ${all.length} (capped at ${HARD_CAP}; refine filters to export the rest).`
          : `Exported ${all.length} row${all.length === 1 ? "" : "s"}.`
      );
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={busy || totalCount === 0}>
      <Download className="mr-1.5 h-3.5 w-3.5" />
      {busy ? "Exporting…" : "Export to CSV"}
    </Button>
  );
}
