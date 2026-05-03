"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, ClipboardCheck, X } from "lucide-react";
import type { RowSelectionState } from "@tanstack/react-table";
import type { Applicant, ApplicantCreateInput, TradeTestBulkScheduleInput } from "@ats/shared";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/layout/page-header";
import {
  ApplicantFilters,
  defaultFilterState,
  type ApplicantFilterState,
} from "@/components/applicants/applicant-filters";
import { ApplicantTable } from "@/components/applicants/applicant-table";
import { ExportCsvButton } from "@/components/applicants/export-csv-button";
import { ApplicantForm } from "@/components/applicants/applicant-form";
import {
  TradeTestBulkScheduleDialog,
  type BulkScheduleResult,
} from "@/components/applicants/trade-test-bulk-schedule-dialog";
import { CenteredLoading } from "@/components/common/loading-state";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApplicants } from "@/hooks/use-applicants";

export default function ApplicantsPage() {
  const [filters, setFilters] = useState<ApplicantFilterState>(defaultFilterState);
  const debouncedSearch = useDebouncedValue(filters.search, 200);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [bulkOpen, setBulkOpen] = useState(false);

  const baseQueryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.department !== "ALL") sp.set("department", filters.department);
    if (filters.status !== "ALL") sp.set("status", filters.status);
    if (filters.outcome !== "ALL") sp.set("latestTradeTestOutcome", filters.outcome);
    if (filters.preset !== "ALL" && filters.range?.from)
      sp.set("dateAppliedFrom", filters.range.from.toISOString());
    if (filters.preset !== "ALL" && filters.range?.to)
      sp.set("dateAppliedTo", filters.range.to.toISOString());
    return sp.toString();
  }, [filters]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams(baseQueryString);
    sp.set("limit", "25");
    const cursor = cursorStack[cursorStack.length - 1];
    if (cursor) sp.set("cursor", cursor);
    return sp.toString();
  }, [baseQueryString, cursorStack]);

  const { data, loading, error, refresh } = useApplicants(queryString);
  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const nextCursor = data?.nextCursor ?? null;

  useEffect(() => {
    if (error) toast.error(error.body.message);
  }, [error]);

  useEffect(() => {
    setCursorStack([null]);
  }, [baseQueryString]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) =>
      [a.name, a.email, a.contactNumber].some((v) => v.toLowerCase().includes(q))
    );
  }, [items, debouncedSearch]);

  async function handleCreate(values: ApplicantCreateInput) {
    try {
      await api.post<Applicant>("/api/applicants", values);
      toast.success("Applicant created.");
      setCreateOpen(false);
      setCursorStack([null]);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Could not create applicant.");
    }
  }

  function nextPageFn() {
    if (nextCursor) setCursorStack((s) => [...s, nextCursor]);
  }
  function prevPageFn() {
    setCursorStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  // RowSelection keys are applicant IDs (because <ApplicantTable getRowId={row.id}>).
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
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Bulk schedule failed.");
    }
  }

  return (
    <>
      <PageHeader
        title="Applicants"
        description="Manage applicants, schedule trade tests, and update deployment status."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New applicant
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <ApplicantFilters
          state={filters}
          onChange={setFilters}
          onReset={() => setFilters(defaultFilterState)}
        />
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {loading ? "Loading…" : `${total} applicant${total === 1 ? "" : "s"}`}
        </span>
        <ExportCsvButton
          loadedItems={items}
          totalCount={total}
          baseQueryString={baseQueryString}
        />
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

      {loading ? (
        <CenteredLoading />
      ) : (
        <ApplicantTable
          data={filteredItems}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
        />
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={prevPageFn}
          disabled={cursorStack.length <= 1 || loading}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={nextPageFn}
          disabled={!nextCursor || loading}
        >
          Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>

      <TradeTestBulkScheduleDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        applicantIds={selectedIds}
        onSubmit={handleBulkSchedule}
      />

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>New applicant</SheetTitle>
            <SheetDescription>
              Capture the basics. You can attach a resume after the profile is created.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ApplicantForm
              mode="create"
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
