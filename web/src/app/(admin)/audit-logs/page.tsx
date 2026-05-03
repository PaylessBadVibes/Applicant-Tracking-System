"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AuditLog } from "@ats/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { AuditLogTable } from "@/components/audit-logs/audit-log-table";
import {
  DateRangePicker,
  type DatePreset,
} from "@/components/common/date-range-picker";
import { CenteredLoading } from "@/components/common/loading-state";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import type { DateRange } from "react-day-picker";

interface ListResponse {
  items: AuditLog[];
  nextCursor: string | null;
}

const ENTITY_OPTIONS = ["all", "applicant", "tradeTestAttempt", "emailTemplate", "user"] as const;

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState<(typeof ENTITY_OPTIONS)[number]>("all");
  const [preset, setPreset] = useState<DatePreset>("MONTH");
  const [range, setRange] = useState<DateRange | undefined>();
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [data, setData] = useState<ListResponse>({ items: [], nextCursor: null });
  const [loading, setLoading] = useState(true);

  const baseQs = useMemo(() => {
    const sp = new URLSearchParams();
    if (entityType !== "all") sp.set("entityType", entityType);
    if (preset !== "ALL" && range?.from) sp.set("from", range.from.toISOString());
    if (preset !== "ALL" && range?.to) sp.set("to", range.to.toISOString());
    return sp.toString();
  }, [entityType, preset, range]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams(baseQs);
    sp.set("limit", "25");
    const cursor = cursorStack[cursorStack.length - 1];
    if (cursor) sp.set("cursor", cursor);
    return sp.toString();
  }, [baseQs, cursorStack]);

  useEffect(() => {
    setLoading(true);
    api
      .get<ListResponse>(`/api/audit-logs?${queryString}`)
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError) toast.error(err.body.message);
      })
      .finally(() => setLoading(false));
  }, [queryString]);

  useEffect(() => {
    setCursorStack([null]);
  }, [baseQs]);

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Field-level history of every change made by an admin."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={entityType} onValueChange={(v) => setEntityType(v as typeof entityType)}>
          <SelectTrigger className="h-8 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            <SelectItem value="applicant">Applicant</SelectItem>
            <SelectItem value="tradeTestAttempt">Trade Test Attempt</SelectItem>
            <SelectItem value="emailTemplate">Email Template</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>

        <DateRangePicker
          preset={preset}
          value={range}
          onChange={(p, r) => {
            setPreset(p);
            setRange(r);
          }}
          className="ml-auto"
        />
      </div>

      {loading ? <CenteredLoading /> : <AuditLogTable items={data.items} />}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCursorStack((s) => (s.length > 1 ? s.slice(0, -1) : s))}
          disabled={cursorStack.length <= 1 || loading}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => data.nextCursor && setCursorStack((s) => [...s, data.nextCursor])}
          disabled={!data.nextCursor || loading}
        >
          Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </>
  );
}
