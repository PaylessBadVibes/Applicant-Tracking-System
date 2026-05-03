import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { TRADE_TEST_OUTCOMES, type TradeTestOutcome } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(attempt: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...attempt };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  if (out.applicant && typeof out.applicant === "object") {
    out.applicant = { ...(out.applicant as Record<string, unknown>) };
  }
  return out;
}

export async function GET(req: NextRequest) {
  return withAdmin(async () => {
    const sp = req.nextUrl.searchParams;
    const outcomeParam = sp.get("outcome");
    const fromIso = sp.get("from");
    const toIso = sp.get("to");
    const cursor = sp.get("cursor");
    const limit = Math.min(Math.max(Number(sp.get("limit") ?? "50"), 1), 200);
    const orderBy = (sp.get("orderBy") as "scheduledAt" | "recordedAt" | "createdAt") ?? "scheduledAt";
    const orderDir = (sp.get("orderDir") as "asc" | "desc") ?? "desc";

    const where: Prisma.TradeTestAttemptWhereInput = {};
    if (outcomeParam) {
      const outcomes = outcomeParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is TradeTestOutcome =>
          (TRADE_TEST_OUTCOMES as readonly string[]).includes(s)
        );
      if (outcomes.length > 0) where.outcome = { in: outcomes };
    }
    if (fromIso || toIso) {
      where.scheduledAt = {};
      if (fromIso) where.scheduledAt.gte = new Date(fromIso);
      if (toIso) where.scheduledAt.lte = new Date(toIso);
    }

    const findArgs: Prisma.TradeTestAttemptFindManyArgs = {
      where,
      orderBy: [{ [orderBy]: orderDir } as Prisma.TradeTestAttemptOrderByWithRelationInput, { id: "asc" }],
      take: limit + 1,
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            status: true,
          },
        },
      },
    };
    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1;
    }

    const [rows, total] = await Promise.all([
      prisma.tradeTestAttempt.findMany(findArgs),
      prisma.tradeTestAttempt.count({ where }),
    ]);

    const slice = rows.slice(0, limit);
    const items = slice.map((r) => serialize(r as unknown as Record<string, unknown>));
    const nextCursor = rows.length > limit ? slice[slice.length - 1]?.id ?? null : null;
    return NextResponse.json({ items, nextCursor, total });
  });
}
