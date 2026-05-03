import { NextResponse, type NextRequest } from "next/server";
import { tradeTestOutcomeSchema, type ApplicantStatus, type TradeTestOutcome } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { recordPreOrientationEmailSkipped } from "@/lib/email-hook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OUTCOME_TO_STATUS: Record<Exclude<TradeTestOutcome, "PENDING">, ApplicantStatus> = {
  PASS: "PRE_ORIENTATION",
  FAIL: "FAILED_RE_TRADE_TEST",
  NO_SHOW: "NEEDS_RESCHEDULE",
};

function serialize(attempt: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...attempt };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string; attemptId: string } }
) {
  return withAdmin(async (session) => {
    const { id, attemptId } = ctx.params;
    const body = await req.json().catch(() => ({}));
    const input = tradeTestOutcomeSchema.parse(body);

    const updatedAttempt = await prisma.$transaction(async (tx) => {
      const [applicant, attempt] = await Promise.all([
        tx.applicant.findUnique({ where: { id } }),
        tx.tradeTestAttempt.findUnique({ where: { id: attemptId } }),
      ]);
      if (!applicant) throw Object.assign(new Error("Applicant not found"), { status: 404 });
      if (!attempt || attempt.applicantId !== id) {
        throw Object.assign(new Error("Attempt not found"), { status: 404 });
      }
      if (attempt.outcome !== "PENDING") {
        throw Object.assign(new Error("Attempt outcome already recorded"), { status: 409 });
      }

      const newStatus = OUTCOME_TO_STATUS[input.outcome];
      const previousStatus = applicant.status;

      const attemptUpdated = await tx.tradeTestAttempt.update({
        where: { id: attemptId },
        data: {
          outcome: input.outcome,
          recordedAt: new Date(),
          recordedById: session.uid,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });

      const applicantUpdate: Parameters<typeof tx.applicant.update>[0]["data"] = {
        status: newStatus,
        latestTradeTestOutcome: input.outcome,
        updatedBy: { connect: { id: session.uid } },
      };
      if (input.outcome === "PASS" && input.preOrientationDate) {
        applicantUpdate.preOrientationDate = new Date(input.preOrientationDate);
      }
      const updatedApplicant = await tx.applicant.update({ where: { id }, data: applicantUpdate });

      await writeAuditLog(
        {
          entityType: "tradeTestAttempt",
          entityId: attemptId,
          parentEntityId: id,
          action: "TRADE_TEST_OUTCOME_RECORDED",
          actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
          changes: { outcome: { from: "PENDING", to: input.outcome } },
          metadata: input.notes ? { notes: input.notes } : null,
        },
        tx
      );
      await writeAuditLog(
        {
          entityType: "applicant",
          entityId: id,
          action: "STATUS_CHANGED",
          actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
          changes: { status: { from: previousStatus, to: newStatus } },
          metadata: { attemptId },
        },
        tx
      );

      if (input.outcome === "PASS") {
        await recordPreOrientationEmailSkipped(
          tx,
          { id: updatedApplicant.id, email: updatedApplicant.email },
          { uid: session.uid, email: session.email, jobTitle: session.jobTitle }
        );
      }

      return attemptUpdated;
    });

    return NextResponse.json({ attempt: serialize(updatedAttempt as unknown as Record<string, unknown>) });
  });
}
