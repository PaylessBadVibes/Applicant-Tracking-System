import { NextResponse, type NextRequest } from "next/server";
import { ulid } from "ulid";
import { tradeTestScheduleSchema, type ApplicantStatus } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin, created } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCHEDULABLE_FROM: ApplicantStatus[] = [
  "APPLIED",
  "NEEDS_RESCHEDULE",
  "FAILED_RE_TRADE_TEST",
];

function serialize(attempt: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...attempt };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async () => {
    const items = await prisma.tradeTestAttempt.findMany({
      where: { applicantId: ctx.params.id },
      orderBy: { attemptNumber: "desc" },
    });
    return NextResponse.json({ items: items.map((a) => serialize(a as unknown as Record<string, unknown>)) });
  });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async (session) => {
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));
    const input = tradeTestScheduleSchema.parse(body);

    const newAttemptId = ulid().toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      const applicant = await tx.applicant.findUnique({ where: { id } });
      if (!applicant) {
        throw Object.assign(new Error("Applicant not found"), { status: 404 });
      }
      if (!SCHEDULABLE_FROM.includes(applicant.status)) {
        throw Object.assign(
          new Error(`Cannot schedule trade test from status ${applicant.status}`),
          { status: 409 }
        );
      }
      const previousStatus = applicant.status;
      const attemptNumber = applicant.tradeTestAttemptCount + 1;

      const attempt = await tx.tradeTestAttempt.create({
        data: {
          id: newAttemptId,
          applicantId: id,
          attemptNumber,
          scheduledAt: new Date(input.scheduledAt),
          outcome: "PENDING",
          notes: input.notes ?? "",
          createdById: session.uid,
        },
      });

      await tx.applicant.update({
        where: { id },
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
          parentEntityId: id,
          action: "TRADE_TEST_SCHEDULED",
          actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
          snapshot: {
            attemptNumber: attempt.attemptNumber,
            scheduledAt: input.scheduledAt,
            notes: input.notes ?? "",
          },
        },
        tx
      );
      await writeAuditLog(
        {
          entityType: "applicant",
          entityId: id,
          action: "STATUS_CHANGED",
          actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
          changes: { status: { from: previousStatus, to: "TRADE_TEST_SCHEDULED" } },
        },
        tx
      );

      return attempt;
    });

    return created(serialize(result as unknown as Record<string, unknown>));
  });
}
