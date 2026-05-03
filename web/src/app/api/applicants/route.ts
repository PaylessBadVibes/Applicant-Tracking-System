import { NextResponse, type NextRequest } from "next/server";
import { ulid } from "ulid";
import type { Prisma } from "@prisma/client";
import { applicantCreateSchema, listApplicantsQuerySchema } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin, created } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApplicantRow = Awaited<ReturnType<typeof prisma.applicant.findFirst>>;

function serializeApplicant(applicant: NonNullable<ApplicantRow>) {
  const out: Record<string, unknown> = { ...applicant };
  out.dateApplied = applicant.dateApplied.toISOString();
  out.preOrientationDate = applicant.preOrientationDate ? applicant.preOrientationDate.toISOString() : null;
  out.resumeUploadedAt = applicant.resumeUploadedAt ? applicant.resumeUploadedAt.toISOString() : null;
  out.createdAt = applicant.createdAt.toISOString();
  out.updatedAt = applicant.updatedAt.toISOString();
  out.resumeSizeBytes =
    applicant.resumeSizeBytes !== null && applicant.resumeSizeBytes !== undefined
      ? Number(applicant.resumeSizeBytes)
      : null;
  out.resumeUrl = applicant.resumeRelPath ? `/api/applicants/${applicant.id}/resume/file` : null;
  out.resumePath = applicant.resumeRelPath ?? null;
  return out;
}

export async function GET(req: NextRequest) {
  return withAdmin(async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const q = listApplicantsQuerySchema.parse(params);

    const where: Prisma.ApplicantWhereInput = {};
    if (q.department) where.department = q.department;
    if (q.status) where.status = q.status;
    if (q.latestTradeTestOutcome) where.latestTradeTestOutcome = q.latestTradeTestOutcome;
    if (q.dateAppliedFrom || q.dateAppliedTo) {
      where.dateApplied = {};
      if (q.dateAppliedFrom) where.dateApplied.gte = new Date(q.dateAppliedFrom);
      if (q.dateAppliedTo) where.dateApplied.lte = new Date(q.dateAppliedTo);
    }

    const orderField = q.orderBy;
    const orderBy: Prisma.ApplicantOrderByWithRelationInput[] = [
      { [orderField]: q.orderDir } as Prisma.ApplicantOrderByWithRelationInput,
      { id: "asc" },
    ];

    const findArgs: Prisma.ApplicantFindManyArgs = {
      where,
      orderBy,
      take: q.limit + 1,
    };
    if (q.cursor) {
      findArgs.cursor = { id: q.cursor };
      findArgs.skip = 1;
    }

    const [rows, total] = await Promise.all([
      prisma.applicant.findMany(findArgs),
      prisma.applicant.count({ where }),
    ]);

    const slice = rows.slice(0, q.limit);
    const items = slice.map((a) => serializeApplicant(a));
    const nextCursor = rows.length > q.limit ? slice[slice.length - 1]?.id ?? null : null;

    return NextResponse.json({ items, nextCursor, total });
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await req.json().catch(() => ({}));
    const input = applicantCreateSchema.parse(body);
    const newId = ulid().toLowerCase();

    const applicant = await prisma.$transaction(async (tx) => {
      const created = await tx.applicant.create({
        data: {
          id: newId,
          name: input.name,
          nameLower: input.name.toLowerCase(),
          email: input.email,
          contactNumber: input.contactNumber,
          interviewerName: input.interviewerName ?? null,
          department: input.department,
          dateApplied: new Date(input.dateApplied),
          status: "APPLIED",
          tradeTestAttemptCount: 0,
          createdById: session.uid,
          updatedById: session.uid,
        },
      });

      await writeAuditLog(
        {
          entityType: "applicant",
          entityId: created.id,
          action: "CREATED",
          actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
          snapshot: {
            name: input.name,
            email: input.email,
            contactNumber: input.contactNumber,
            interviewerName: input.interviewerName ?? null,
            department: input.department,
            dateApplied: input.dateApplied,
            status: "APPLIED",
          },
        },
        tx
      );

      return created;
    });

    return created(serializeApplicant(applicant));
  });
}
