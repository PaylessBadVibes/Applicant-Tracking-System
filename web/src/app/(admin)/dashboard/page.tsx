"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Sparkles, Building2, RefreshCw, CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type DashboardMetrics,
  type Department,
} from "@ats/shared";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AppliedOverTimeChart } from "@/components/dashboard/applied-over-time-chart";
import { UpcomingTestsList } from "@/components/dashboard/upcoming-tests-list";
import { RecentTradeTestsList } from "@/components/dashboard/recent-trade-tests-list";
import { Button } from "@/components/ui/button";
import {
  DateRangePicker,
  presetToRange,
  type DatePreset,
} from "@/components/common/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { CenteredLoading } from "@/components/common/loading-state";

export default function DashboardPage() {
  const [preset, setPreset] = useState<DatePreset>("MONTH");
  const [range, setRange] = useState<DateRange | undefined>(presetToRange("MONTH"));
  const [department, setDepartment] = useState<Department | "ALL">("ALL");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (preset !== "ALL" && range?.from) sp.set("from", range.from.toISOString());
    if (preset !== "ALL" && range?.to) sp.set("to", range.to.toISOString());
    if (department !== "ALL") sp.set("department", department);
    return sp.toString();
  }, [preset, range, department]);

  useEffect(() => {
    setLoading(true);
    api
      .get<DashboardMetrics>(`/api/dashboard/metrics?${queryString}`)
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, [queryString]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Snapshot of recruitment activity, trade test outcomes, and deployment status."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              api
                .get<DashboardMetrics>(`/api/dashboard/metrics?${queryString}`)
                .then(setMetrics)
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker
          preset={preset}
          value={range}
          onChange={(p, r) => {
            setPreset(p);
            setRange(r);
          }}
        />
        <Select
          value={department}
          onValueChange={(v) => setDepartment(v as Department | "ALL")}
        >
          <SelectTrigger className="w-[220px]">
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
      </div>

      {loading || !metrics ? (
        <CenteredLoading />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Applicants"
              value={metrics.totalApplicants}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              label="Pre-Orientation"
              value={metrics.applicantsByStatus.PRE_ORIENTATION ?? 0}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <MetricCard
              label="Deployed"
              value={metrics.deployment.deployed}
              icon={<Building2 className="h-4 w-4" />}
              accentClassName="text-emerald-600"
            />
            <MetricCard
              label="Redeployed"
              value={metrics.deployment.redeployed}
              icon={<RefreshCw className="h-4 w-4" />}
              accentClassName="text-orange-600"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Trade Test — Pass"
              value={metrics.tradeTest.pass}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accentClassName="text-emerald-600"
            />
            <MetricCard
              label="Trade Test — Fail"
              value={metrics.tradeTest.fail}
              icon={<XCircle className="h-4 w-4" />}
              accentClassName="text-rose-600"
            />
            <MetricCard
              label="Trade Test — No Show"
              value={metrics.tradeTest.noShow}
              icon={<MinusCircle className="h-4 w-4" />}
              accentClassName="text-stone-500"
            />
            <MetricCard
              label="Trade Test — Pending"
              value={metrics.tradeTest.pending}
              icon={<Clock className="h-4 w-4" />}
              accentClassName="text-amber-600"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AppliedOverTimeChart data={metrics.appliedOverTime} />
            </div>
            <UpcomingTestsList items={metrics.tradeTest.upcoming} />
          </div>

          <div className="mt-6">
            <RecentTradeTestsList items={metrics.tradeTest.recentOutcomes} />
          </div>
        </>
      )}
    </>
  );
}
