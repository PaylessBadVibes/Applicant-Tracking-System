import { STATUS_BADGE_COLORS, STATUS_LABELS, type ApplicantStatus } from "@ats/shared";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicantStatus;
  className?: string;
}) {
  const colors = STATUS_BADGE_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        colors.bg,
        colors.text,
        colors.ring,
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
