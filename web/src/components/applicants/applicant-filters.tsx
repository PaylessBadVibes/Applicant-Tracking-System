"use client";

import { Search, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  STATUSES,
  STATUS_LABELS,
  TRADE_TEST_OUTCOMES,
  TRADE_TEST_OUTCOME_LABELS,
  type ApplicantStatus,
  type Department,
  type TradeTestOutcome,
} from "@ats/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangePicker,
  type DatePreset,
} from "@/components/common/date-range-picker";

export interface ApplicantFilterState {
  search: string;
  department: Department | "ALL";
  status: ApplicantStatus | "ALL";
  outcome: TradeTestOutcome | "ALL";
  preset: DatePreset;
  range?: DateRange;
}

export const defaultFilterState: ApplicantFilterState = {
  search: "",
  department: "ALL",
  status: "ALL",
  outcome: "ALL",
  preset: "ALL",
  range: undefined,
};

export function ApplicantFilters({
  state,
  onChange,
  onReset,
}: {
  state: ApplicantFilterState;
  onChange: (next: ApplicantFilterState) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={state.search}
          onChange={(e) => onChange({ ...state, search: e.target.value })}
          placeholder="Search name, email, contact"
          className="h-8 w-64 pl-8"
        />
      </div>

      <Select
        value={state.department}
        onValueChange={(v) => onChange({ ...state, department: v as Department | "ALL" })}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All departments</SelectItem>
          {DEPARTMENTS.map((d) => (
            <SelectItem key={d} value={d}>
              {DEPARTMENT_LABELS[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={state.status}
        onValueChange={(v) => onChange({ ...state, status: v as ApplicantStatus | "ALL" })}
      >
        <SelectTrigger className="h-8 w-[210px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={state.outcome}
        onValueChange={(v) => onChange({ ...state, outcome: v as TradeTestOutcome | "ALL" })}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Any test outcome</SelectItem>
          {TRADE_TEST_OUTCOMES.map((o) => (
            <SelectItem key={o} value={o}>
              {TRADE_TEST_OUTCOME_LABELS[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DateRangePicker
        preset={state.preset}
        value={state.range}
        onChange={(p, r) => onChange({ ...state, preset: p, range: r })}
        className="ml-auto"
      />

      <Button variant="ghost" size="sm" className="h-8" onClick={onReset}>
        <X className="mr-1 h-3.5 w-3.5" /> Reset
      </Button>
    </div>
  );
}
