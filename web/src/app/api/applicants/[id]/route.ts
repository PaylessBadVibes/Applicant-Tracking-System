import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { applicantUpdateSchema } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { computeDiff, writeAuditLog } from "@/lib/audit";
import { deleteResume } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeApplicant(applicant: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...applicant };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  if (typeof out.resumeSizeBytes === "bigint") out.resumeSizeBytes = Number(out.resumeSizeBytes);
  out.resumeUrl = applicant.resumeRelPath ? `/api/applicants/${applicant.id as string}/resume/file` : null;
  out.resumePath = (applicant.resumeRelPath as string | null) ?? null;
  return out;
}

function serializeAttempt(attempt: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...attempt };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

function dateOrNull(v: Date | null | undefined): string | null {
  return v ? v.toISOString() : null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async () => {
    const id = ctx.params.id;
    const applicant = await prisma.applicant.findUnique({
      where: { id },
      include: {
        tradeTestAttempts: { orderBy: { attemptNumber: "desc" } },
      },
    });
    if (!applicant) {
      return NextResponse.json({ message: "Applicant not found" }, { status: 404 });
    }
    const { tradeTestAttempts, ...applicantOnly } = applicant;
    return NextResponse.json({
      applicant: serializeApplicant(applicantOnly as Record<string, unknown>),
      tradeTestAttempts: tradeTestAttempts.map((a) => serializeAttempt(a as unknown as Record<string, unknown>)),
    });
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async (session) => {
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));
    const input = applicantUpdateSchema.parse(body);

    const updatedApplicant = await prisma.$transaction(async (tx) => {
      const before = await tx.applicant.findUnique({ where: { id } });
      if (!before) {
        throw Object.assign(new Error("Applicant not found"), { status: 404 });
      }

      const data: Prisma.ApplicantUpdateInput = { updatedBy: { connect: { id: session.uid } } };

      if (input.name !== undefined) {
        data.name = input.name;
        data.nameLower = input.name.toLowerCase();
      }
      if (input.email !== undefined) data.email = input.email;
      if (input.contactNumber !== undefined) data.contactNumber = input.contactNumber;
      if (input.interviewerName !== undefined) data.interviewerName = input.interviewerName;
      if (input.department !== undefined) data.department = input.department;
      if (input.dateApplied !== undefined) data.dateApplied = new Date(input.dateApplied);
      if (input.preOrientationDate !== undefined) {
        data.preOrientationDate =
          input.preOrientationDate === null ? null : new Date(input.preOrientationDate);
      }

      const watched = ["name", "email", "contactNumber", "interviewerName", "department", "dateApplied", "preOrientationDate"] as const;
      const beforeWatched: Record<string, unknown> = {
        name: before.name,
        email: before.email,
        contactNumber: before.contactNumber,
        interviewerName: before.interviewerName,
        department: before.department,
        dateApplied: dateOrNull(before.dateApplied),
        preOrientationDate: dateOrNull(before.preOrientationDate),
      };
      const afterWatched: Record<string, unknown> = {
        name: input.name ?? before.name,
        email: input.email ?? before.email,
        contactNumber: input.contactNumber ?? before.contactNumber,
        interviewerName:
          input.interviewerName === undefined ? before.interviewerName : input.interviewerName,
        department: input.department ?? before.department,
        dateApplied: input.dateApplied ?? dateOrNull(before.dateApplied),
        preOrientationDate:
          input.preOrientationDate === undefined
            ? dateOrNull(before.preOrientationDate)
            : input.preOrientationDate,
      };
      const diff = computeDiff(beforeWatched, afterWatched, [...watched]);

      const after = await tx.applicant.update({ where: { id }, data });

      if (Object.keys(diff).length > 0) {
        await writeAuditLog(
          {
            entityType: "applicant",
            entityId: id,
            action: "UPDATED",
            actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
            changes: diff,
          },
          tx
        );
      }

      return after;
    });

    return NextResponse.json({ applicant: serializeApplicant(updatedApplicant as unknown as Record<string, unknown>) });
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async (session) => {
    const id = ctx.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.applicant.findUnique({ where: { id } });
      if (!existing) {
        throw Object.assign(new Error("Applicant not found"), { status: 404 });
      }
      await tx.applicant.delete({ where: { id } });
      await writeAuditLog(
        {
          entityType: "applicant",
          entityId: id,
          action: "DELETED",
          actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
          snapshot: {
            name: existing.name,
            email: existing.email,
            department: existing.department,
            status: existing.status,
          },
        },
        tx
      );
      return existing;
    });

    if (result.resumeRelPath) {
      try {
        await deleteResume(result.resumeRelPath);
      } catch (err) {
        console.error("Failed to delete resume from disk", err);
      }
    }

    return new NextResponse(null, { status: 204 });
  });
}
