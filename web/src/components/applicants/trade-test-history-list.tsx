import { Check, X, Clock, AlertTriangle } from "lucide-react";
import {
  TRADE_TEST_OUTCOME_LABELS,
  type TradeTestAttempt,
  type TradeTestOutcome,
} from "@ats/shared";
import { formatDateTime } from "@/lib/format";

const OUTCOME_ICON: Record<TradeTestOutcome, React.ReactNode> = {
  PASS: <Check className="h-3.5 w-3.5" />,
  FAIL: <X className="h-3.5 w-3.5" />,
  NO_SHOW: <AlertTriangle className="h-3.5 w-3.5" />,
  PENDING: <Clock className="h-3.5 w-3.5" />,
};

const OUTCOME_RING: Record<TradeTestOutcome, string> = {
  PASS: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAIL: "bg-rose-50 text-rose-700 ring-rose-200",
  NO_SHOW: "bg-amber-50 text-amber-700 ring-amber-200",
  PENDING: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function TradeTestHistoryList({ attempts }: { attempts: TradeTestAttempt[] }) {
  if (attempts.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
        No trade test attempts yet.
      </p>
    );
  }

  return (
    <ol className="relative ml-3 space-y-4 border-l border-border pl-6">
      {attempts.map((a) => (
        <li key={a.id} className="relative">
          <span
            className={`absolute -left-[34px] inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-background ${OUTCOME_RING[a.outcome]}`}
          >
            {OUTCOME_ICON[a.outcome]}
          </span>
          <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Attempt #{a.attemptNumber}</span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${OUTCOME_RING[a.outcome]}`}
                >
                  {TRADE_TEST_OUTCOME_LABELS[a.outcome]}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {formatDateTime(a.scheduledAt)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {a.recordedAt ? <span>Recorded {formatDateTime(a.recordedAt)}</span> : null}
            </div>
            {a.notes ? <p className="mt-2 text-sm text-foreground/90">{a.notes}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
