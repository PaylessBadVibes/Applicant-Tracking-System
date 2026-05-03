import { NextResponse, type NextRequest } from "next/server";
import { userUpdateSchema } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { computeDiff, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(user: Record<string, unknown>) {
  const out: Record<string, unknown> = {
    uid: user.id,
    email: user.email,
    displayName: user.name,
    jobTitle: user.jobTitle,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    createdBy: user.createdById ?? null,
    lastLoginAt:
      user.lastLoginAt instanceof Date
        ? user.lastLoginAt.toISOString()
        : user.lastLoginAt ?? null,
  };
  return out;
}

export async function PATCH(req: NextRequest, ctx: { params: { uid: string } }) {
  return withAdmin(async (session) => {
    const uid = ctx.params.uid;
    const body = await req.json().catch(() => ({}));
    const input = userUpdateSchema.parse(body);

    const before = await prisma.user.findUnique({ where: { id: uid } });
    if (!before) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const data: Parameters<typeof prisma.user.update>[0]["data"] = {};
    if (input.displayName !== undefined) data.name = input.displayName;
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const after = await prisma.user.update({ where: { id: uid }, data });

    if (input.isActive === false) {
      await prisma.session.deleteMany({ where: { userId: uid } });
    }

    const watched = ["displayName", "jobTitle", "isActive"];
    const beforeWatched: Record<string, unknown> = {
      displayName: before.name,
      jobTitle: before.jobTitle,
      isActive: before.isActive,
    };
    const afterWatched: Record<string, unknown> = {
      displayName: input.displayName ?? before.name,
      jobTitle: input.jobTitle ?? before.jobTitle,
      isActive: input.isActive ?? before.isActive,
    };
    const diff = computeDiff(beforeWatched, afterWatched, watched);
    if (Object.keys(diff).length > 0) {
      await writeAuditLog({
        entityType: "user",
        entityId: uid,
        action: "UPDATED",
        actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
        changes: diff,
      });
    }

    return NextResponse.json({ user: serialize(after as unknown as Record<string, unknown>) });
  });
}
