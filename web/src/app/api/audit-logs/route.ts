import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(log: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...log };
  if (out.actorUserId !== undefined) {
    out.actorUid = out.actorUserId;
    delete out.actorUserId;
  }
  if (out.actorEmailSnapshot !== undefined) {
    out.actorEmail = out.actorEmailSnapshot;
    delete out.actorEmailSnapshot;
  }
  if (out.actorJobTitleSnapshot !== undefined) {
    out.actorJobTitle = out.actorJobTitleSnapshot;
    delete out.actorJobTitleSnapshot;
  }
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

export async function GET(req: NextRequest) {
  return withAdmin(async () => {
    const sp = req.nextUrl.searchParams;
    const entityType = sp.get("entityType") as Prisma.AuditLogWhereInput["entityType"] | null;
    const entityId = sp.get("entityId");
    const actorUid = sp.get("actorUid");
    const from = sp.get("from");
    const to = sp.get("to");
    const cursor = sp.get("cursor");
    const limit = Math.min(Number(sp.get("limit") ?? "25"), 100);

    const where: Prisma.AuditLogWhereInput = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorUid) where.actorUserId = actorUid;
    if (from || to) {
      where.at = {};
      if (from) where.at.gte = new Date(from);
      if (to) where.at.lte = new Date(to);
    }

    const findArgs: Prisma.AuditLogFindManyArgs = {
      where,
      orderBy: [{ at: "desc" }, { id: "desc" }],
      take: limit + 1,
    };
    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1;
    }

    const rows = await prisma.auditLog.findMany(findArgs);
    const slice = rows.slice(0, limit);
    const items = slice.map((r) => serialize(r as unknown as Record<string, unknown>));
    const nextCursor = rows.length > limit ? slice[slice.length - 1]?.id ?? null : null;
    return NextResponse.json({ items, nextCursor });
  });
}
