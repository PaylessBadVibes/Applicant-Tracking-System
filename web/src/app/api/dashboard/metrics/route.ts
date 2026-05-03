import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import {
  DEPARTMENTS,
  STATUSES,
  type ApplicantStatus,
  type Department,
  type DashboardMetrics,
  type TradeTestOutcome,
} from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HARD_FETCH_CAP = 5000;

interface DateBucketRow {
  d: Date | string;
  c: bigint | number;
}

export async function GET(req: NextRequest) {
  return withAdmin(async () => {
    const sp = req.nextUrl.searchParams;
    const fromIso = sp.get("from");
    const toIso = sp.get("to");
    const departmentFilter = sp.get("department") as Department | null;

    const baseWhere: Prisma.ApplicantWhereInput = {};
    if (departmentFilter) baseWhere.department = departmentFilter;

    const rangeWhere: Prisma.ApplicantWhereInput = { ...baseWhere };
    if (fromIso || toIso) {
      rangeWhere.dateApplied = {};
      if (fromIso) rangeWhere.dateApplied.gte = new Date(fromIso);
      if (toIso) rangeWhere.dateApplied.lte = new Date(toIso);
    }

    const [
      totalApplicants,
      statusGroups,
      departmentGroups,
      outcomeGroups,
      upcoming,
      recentOutcomes,
      bucketRows,
      rangeTotalCount,
    ] = await Promise.all([
      prisma.applicant.count({ where: baseWhere }),
      prisma.applicant.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
      departmentFilter
        ? Promise.resolve(null)
        : prisma.applicant.groupBy({ by: ["department"], _count: { _all: true } }),
      prisma.applicant.groupBy({
        by: ["latestTradeTestOutcome"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.tradeTestAttempt.findMany({
        where: { outcome: "PENDING", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: { applicant: { select: { id: true, name: true } } },
      }),
      prisma.tradeTestAttempt.findMany({
        where: { outcome: { in: ["PASS", "FAIL", "NO_SHOW"] } },
        orderBy: { scheduledAt: "desc" },
        take: 5,
        include: { applicant: { select: { id: true, name: true } } },
      }),
      prisma.$queryRaw<DateBucketRow[]>`
        SELECT DATE(\`dateApplied\`) AS d, COUNT(*) AS c
        FROM applicants
        WHERE 1=1
          ${fromIso ? Prisma.sql`AND \`dateApplied\` >= ${new Date(fromIso)}` : Prisma.empty}
          ${toIso ? Prisma.sql`AND \`dateApplied\` <= ${new Date(toIso)}` : Prisma.empty}
          ${departmentFilter ? Prisma.sql`AND department = ${departmentFilter}` : Prisma.empty}
        GROUP BY DATE(\`dateApplied\`)
        ORDER BY d ASC
        LIMIT ${HARD_FETCH_CAP + 1}
      `,
      prisma.applicant.count({ where: rangeWhere }),
    ]);

    const applicantsByStatus: Record<ApplicantStatus, number> = Object.fromEntries(
      STATUSES.map((s) => [s, 0])
    ) as Record<ApplicantStatus, number>;
    for (const g of statusGroups) {
      applicantsByStatus[g.status as ApplicantStatus] = g._count._all;
    }

    let applicantsByDepartment: Record<Department, number>;
    if (departmentFilter) {
      applicantsByDepartment = Object.fromEntries(DEPARTMENTS.map((d) => [d, 0])) as Record<Department, number>;
      applicantsByDepartment[departmentFilter] = totalApplicants;
    } else {
      applicantsByDepartment = Object.fromEntries(DEPARTMENTS.map((d) => [d, 0])) as Record<Department, number>;
      if (departmentGroups) {
        for (const g of departmentGroups) {
          applicantsByDepartment[g.department as Department] = g._count._all;
        }
      }
    }

    const outcomeCounts: Record<TradeTestOutcome, number> = {
      PENDING: 0,
      PASS: 0,
      FAIL: 0,
      NO_SHOW: 0,
    };
    for (const g of outcomeGroups) {
      if (g.latestTradeTestOutcome) {
        outcomeCounts[g.latestTradeTestOutcome as TradeTestOutcome] = g._count._all;
      }
    }

    const truncated = bucketRows.length > HARD_FETCH_CAP || rangeTotalCount > HARD_FETCH_CAP;
    const appliedOverTime = bucketRows.slice(0, HARD_FETCH_CAP).map((r) => ({
      date:
        r.d instanceof Date
          ? r.d.toISOString().slice(0, 10)
          : String(r.d).slice(0, 10),
      count: typeof r.c === "bigint" ? Number(r.c) : r.c,
    }));

    const result: DashboardMetrics = {
      totalApplicants,
      applicantsByDepartment,
      applicantsByStatus,
      tradeTest: {
        pass: outcomeCounts.PASS,
        fail: outcomeCounts.FAIL,
        noShow: outcomeCounts.NO_SHOW,
        pending: outcomeCounts.PENDING,
        upcoming: upcoming.map((a) => ({
          attemptId: a.id,
          applicantId: a.applicant?.id ?? "",
          applicantName: a.applicant?.name ?? "Unknown",
          scheduledAt: a.scheduledAt.toISOString(),
        })),
        recentOutcomes: recentOutcomes.map((a) => ({
          attemptId: a.id,
          applicantId: a.applicant?.id ?? "",
          applicantName: a.applicant?.name ?? "Unknown",
          scheduledAt: a.scheduledAt.toISOString(),
          outcome: a.outcome as "PASS" | "FAIL" | "NO_SHOW",
        })),
      },
      deployment: {
        deployed: applicantsByStatus.DEPLOYMENT ?? 0,
        redeployed: applicantsByStatus.REDEPLOYMENT ?? 0,
      },
      appliedOverTime,
      truncated,
    };

    return NextResponse.json(result);
  });
}
