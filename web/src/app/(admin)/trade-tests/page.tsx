"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, X } from "lucide-react";
import type { RowSelectionState } from "@tanstack/react-table";
import type {
  Applicant,
  TradeTestBulkScheduleInput,
} from "@ats/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { ApplicantTable } from "@/components/applicants/applicant-table";
import {
  TradeTestBulkScheduleDialog,
  type BulkScheduleResult,
} from "@/components/applicants/trade-test-bulk-schedule-dialog";
import {
  TradeTestListTable,
  type TradeTestRow,
} from "@/components/trade-tests/trade-test-list-table";
import { ExportTradeTestsCsvButton } from "@/components/trade-tests/export-trade-tests-csv-button";
import { CenteredLoading } from "@/components/common/loading-state";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

type OutcomeFilter = "BOTH" | "PASS" | "FAIL";

interface ApplicantsResponse {
  items: Applicant[];
  nextCursor: string | null;
  total: number;
}

interface AttemptsResponse {
  items: TradeTestRow[];
  nextCursor: string | null;
  total: number;
}

export default function TradeTestsPage() {
  // ---- Schedule tab ----
  const [scheduleData, setScheduleData] = useState<Applicant[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleCursor, setScheduleCursor] = useState<string | null>(null);
  const [scheduleNextCursor, setScheduleNextCursor] = useState<string | null>(null);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [bulkOpen, setBulkOpen] = useState(false);

  const refreshSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const sp = new URLSearchParams();
      // The API can only filter by a single status at a time; we union three
      // schedulable statuses by issuing parallel requests and merging.
      const statuses = ["APPLIED", "NEEDS_RESCHEDULE", "FAILED_RE_TRADE_TEST"] as const;
      const results = await Promise.all(
        statuses.map((s) => {
          const inner = new URLSearchParams(sp);
          inner.set("status", s);
          inner.set("limit", "100");
          return api.get<ApplicantsResponse>(`/api/applicants?${inner.toString()}`);
        })
      );
      const merged: Applicant[] = ([] as Applicant[]).concat(...results.map((r) => r.items));
      // Deduplicate (defensive) and sort by dateApplied desc.
      const byId = new Map<string, Applicant>();
      for (const a of merged) byId.set(a.id, a);
      const list = Array.from(byId.values()).sort(
        (a, b) => (a.dateApplied < b.dateApplied ? 1 : -1)
      );
      setScheduleData(list);
      setScheduleTotal(list.length);
      setScheduleNextCursor(null); // pagination disabled in this aggregated view
      setScheduleCursor(null);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Could not load applicants.");
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSchedule();
  }, [refreshSchedule]);

  const selectedIds = useMemo(
    () => Object.keys(selection).filter((k) => selection[k]),
    [selection]
  );

  async function handleBulkSchedule(values: TradeTestBulkScheduleInput) {
    try {
      const res = await api.post<BulkScheduleResult>(
        "/api/trade-test-attempts/bulk",
        values
      );
      const okCount = res.scheduled.length;
      const skipCount = res.skipped.length;
      if (okCount > 0 && skipCount === 0) {
        toast.success(`Scheduled trade test for ${okCount} applicant${okCount === 1 ? "" : "s"}.`);
      } else if (okCount > 0 && skipCount > 0) {
        toast.success(`Scheduled ${okCount}, skipped ${skipCount}.`);
      } else {
        toast.error(`No applicants scheduled — ${skipCount} skipped.`);
      }
      setBulkOpen(false);
      setSelection({});
      await refreshSchedule();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Bulk schedule failed.");
    }
  }

  // ---- List tab ----
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("BOTH");
  const [listData, setListData] = useState<TradeTestRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listCursorStack, setListCursorStack] = useState<(string | null)[]>([null]);
  const [listNextCursor, setListNextCursor] = useState<string | null>(null);
  const [listTotal, setListTotal] = useState(0);

  const listBaseQueryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (outcomeFilter === "PASS") sp.set("outcome", "PASS");
    else if (outcomeFilter === "FAIL") sp.set("outcome", "FAIL");
    else sp.set("outcome", "PASS,FAIL");
    return sp.toString();
  }, [outcomeFilter]);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try {
      const sp = new URLSearchParams(listBaseQueryString);
      sp.set("limit", "50");
      const cursor = listCursorStack[listCursorStack.length - 1];
      if (cursor) sp.set("cursor", cursor);
      const res = await api.get<AttemptsResponse>(`/api/trade-test-attempts?${sp.toString()}`);
      setListData(res.items);
      setListNextCursor(res.nextCursor);
      setListTotal(res.total);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Could not load trade tests.");
    } finally {
      setListLoading(false);
    }
  }, [listBaseQueryString, listCursorStack]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    setListCursorStack([null]);
  }, [listBaseQueryString]);

  function listNext() {
    if (listNextCursor) setListCursorStack((s) => [...s, listNextCursor]);
  }
  function listPrev() {
    setListCursorStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  return (
    <>
      <PageHeader
        title="Trade Tests"
        description="Bulk-schedule trade tests and review the list of completed attempts."
      />

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="list">List of Trade Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {scheduleLoading
              ? "Loading…"
              : `${scheduleTotal} schedulable applicant${scheduleTotal === 1 ? "" : "s"}`}
          </div>

          {selectedIds.length > 0 ? (
            <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">
                {selectedIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setBulkOpen(true)}>
                  <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                  Schedule trade test
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          {scheduleLoading ? (
            <CenteredLoading />
          ) : (
            <ApplicantTable
              data={scheduleData}
              selectable
              selection={selection}
              onSelectionChange={setSelection}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Outcome:</span>
              <div className="inline-flex rounded-md border border-input">
                <OutcomeButton current={outcomeFilter} value="BOTH" onChange={setOutcomeFilter}>
                  Both
                </OutcomeButton>
                <OutcomeButton current={outcomeFilter} value="PASS" onChange={setOutcomeFilter}>
                  Passed
                </OutcomeButton>
                <OutcomeButton current={outcomeFilter} value="FAIL" onChange={setOutcomeFilter}>
                  Failed
                </OutcomeButton>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {listLoading
                  ? "Loading…"
                  : `${listTotal} record${listTotal === 1 ? "" : "s"}`}
              </span>
              <ExportTradeTestsCsvButton
                baseQueryString={listBaseQueryString}
                totalCount={listTotal}
              />
            </div>
          </div>

          {listLoading ? <CenteredLoading /> : <TradeTestListTable data={listData} />}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={listPrev}
              disabled={listCursorStack.length <= 1 || listLoading}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={listNext}
              disabled={!listNextCursor || listLoading}
            >
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <TradeTestBulkScheduleDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        applicantIds={selectedIds}
        onSubmit={handleBulkSchedule}
      />
    </>
  );
}

function OutcomeButton({
  current,
  value,
  onChange,
  children,
}: {
  current: OutcomeFilter;
  value: OutcomeFilter;
  onChange: (v: OutcomeFilter) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={
        "px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md " +
        (active
          ? "bg-primary text-primary-foreground"
          : "bg-background text-foreground hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}
