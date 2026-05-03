import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/common/empty-state";

export function UpcomingTestsList({
  items,
}: {
  items: Array<{
    attemptId: string;
    applicantId: string;
    applicantName: string;
    scheduledAt: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Trade Tests</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            title="No upcoming tests"
            description="Pending trade tests scheduled in the future will appear here."
            icon={<CalendarClock className="h-5 w-5" />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((it) => (
              <li key={it.attemptId} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/applicants/${it.applicantId}`}
                  className="flex items-center justify-between gap-2 hover:opacity-80"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {it.applicantName}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(it.scheduledAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
