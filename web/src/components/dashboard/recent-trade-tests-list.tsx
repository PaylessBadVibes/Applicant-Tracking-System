import Link from "next/link";
import { ListChecks, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

type Outcome = "PASS" | "FAIL" | "NO_SHOW";

const OUTCOME_LABEL: Record<Outcome, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  NO_SHOW: "No show",
};

const OUTCOME_BADGE: Record<Outcome, string> = {
  PASS: "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  FAIL: "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
  NO_SHOW: "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-800",
};

const OUTCOME_ICON: Record<Outcome, React.ComponentType<{ className?: string }>> = {
  PASS: CheckCircle2,
  FAIL: XCircle,
  NO_SHOW: MinusCircle,
};

export function RecentTradeTestsList({
  items,
}: {
  items: Array<{
    attemptId: string;
    applicantId: string;
    applicantName: string;
    scheduledAt: string;
    outcome: Outcome;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Trade Test Outcomes</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="No completed tests yet"
            description="Pass / Fail / No-Show outcomes will appear here as trade tests are recorded."
            icon={<ListChecks className="h-5 w-5" />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((it) => {
              const Icon = OUTCOME_ICON[it.outcome];
              return (
                <li key={it.attemptId} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/applicants/${it.applicantId}`}
                    className="flex items-center justify-between gap-3 hover:opacity-80"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium text-foreground">
                        {it.applicantName}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatDateTime(it.scheduledAt)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                          OUTCOME_BADGE[it.outcome]
                        )}
                      >
                        {OUTCOME_LABEL[it.outcome]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
