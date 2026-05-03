import { NextResponse, type NextRequest } from "next/server";
import { statusChangeSchema } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { assertTransition } from "@/lib/status-machine";
import { writeAuditLog } from "@/lib/audit";
import { recordPreOrientationEmailSkipped } from "@/lib/email-hook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async (session) => {
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));
    const input = statusChangeSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.applicant.findUnique({ where: { id } });
      if (!existing) {
        throw Object.assign(new Error("Applicant not found"), { status: 404 });
      }
      assertTransition(existing.status, input.targetStatus);

      const data: Parameters<typeof tx.applicant.update>[0]["data"] = {
        status: input.targetStatus,
        updatedBy: { connect: { id: session.uid } },
      };
      if (input.targetStatus === "PRE_ORIENTATION" && input.preOrientationDate) {
        data.preOrientationDate = new Date(input.preOrientationDate);
      }

      const updated = await tx.applicant.update({ where: { id }, data });

      await writeAuditLog(
        {
          entityType: "applicant",
          entityId: id,
          action: "STATUS_CHANGED",
          actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
          changes: { status: { from: existing.status, to: input.targetStatus } },
          metadata: input.reason ? { reason: input.reason } : null,
        },
        tx
      );

      if (input.targetStatus === "PRE_ORIENTATION") {
        await recordPreOrientationEmailSkipped(
          tx,
          { id: updated.id, email: updated.email },
          { uid: session.uid, email: session.email, jobTitle: session.jobTitle }
        );
      }
    });

    return new NextResponse(null, { status: 204 });
  });
}
