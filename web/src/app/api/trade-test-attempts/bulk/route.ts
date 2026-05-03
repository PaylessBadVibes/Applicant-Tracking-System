import { NextResponse, type NextRequest } from "next/server";
import { ulid } from "ulid";
import { tradeTestBulkScheduleSchema, type ApplicantStatus } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCHEDULABLE_FROM: ApplicantStatus[] = [
  "APPLIED",
  "NEEDS_RESCHEDULE",
  "FAILED_RE_TRADE_TEST",
];

interface ScheduledItem {
  applicantId: string;
  attemptId: string;
}
interface SkippedItem {
  applicantId: string;
  reason: string;
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await req.json().catch(() => ({}));
    const input = tradeTestBulkScheduleSchema.parse(body);

    const scheduled: ScheduledItem[] = [];
    const skipped: SkippedItem[] = [];

    for (const applicantId of input.applicantIds) {
      const newAttemptId = ulid().toLowerCase();
      try {
        const result = await prisma.$transaction(async (tx) => {
          const applicant = await tx.applicant.findUnique({ where: { id: applicantId } });
          if (!applicant) return { kind: "skipped" as const, reason: "Applicant not found" };
          if (!SCHEDULABLE_FROM.includes(applicant.status)) {
            return { kind: "skipped" as const, reason: `Cannot schedule from status ${applicant.status}` };
          }
          const previousStatus = applicant.status;
          const attemptNumber = applicant.tradeTestAttemptCount + 1;

          const attempt = await tx.tradeTestAttempt.create({
            data: {
              id: newAttemptId,
              applicantId,
              attemptNumber,
              scheduledAt: new Date(input.scheduledAt),
              outcome: "PENDING",
              notes: input.notes ?? "",
              createdById: session.uid,
            },
          });

          await tx.applicant.update({
            where: { id: applicantId },
            data: {
              status: "TRADE_TEST_SCHEDULED",
              tradeTestAttemptCount: { increment: 1 },
              latestTradeTestAttemptId: attempt.id,
              latestTradeTestOutcome: "PENDING",
              updatedBy: { connect: { id: session.uid } },
            },
          });

          await writeAuditLog(
            {
              entityType: "tradeTestAttempt",
              entityId: attempt.id,
              parentEntityId: applicantId,
              action: "TRADE_TEST_SCHEDULED",
              actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
              snapshot: {
                attemptNumber: attempt.attemptNumber,
                scheduledAt: input.scheduledAt,
                notes: input.notes ?? "",
              },
              metadata: { bulk: true },
            },
            tx
          );
          await writeAuditLog(
            {
              entityType: "applicant",
              entityId: applicantId,
              action: "STATUS_CHANGED",
              actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
              changes: { status: { from: previousStatus, to: "TRADE_TEST_SCHEDULED" } },
              metadata: { bulk: true },
            },
            tx
          );

          return { kind: "scheduled" as const, attemptId: attempt.id };
        });

        if (result.kind === "scheduled") {
          scheduled.push({ applicantId, attemptId: result.attemptId });
        } else {
          skipped.push({ applicantId, reason: result.reason });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        skipped.push({ applicantId, reason: message });
      }
    }

    return NextResponse.json({ scheduled, skipped });
  });
}
