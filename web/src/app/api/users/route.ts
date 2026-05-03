import { NextResponse, type NextRequest } from "next/server";
import { userInviteSchema } from "@ats/shared";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { withAdmin, created } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";

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

export async function GET() {
  return withAdmin(async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items: users.map((u) => serialize(u as unknown as Record<string, unknown>)) });
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await req.json().catch(() => ({}));
    const input = userInviteSchema.parse(body);

    const signUp = auth.api.signUpEmail as unknown as (
      args: { body: Record<string, unknown> }
    ) => Promise<{ token: string | null; user: { id: string } } | null>;

    const result = await signUp({
      body: {
        email: input.email,
        password: input.password,
        name: input.displayName,
        jobTitle: input.jobTitle,
        role: "admin",
        isActive: true,
        createdById: session.uid,
      },
    });

    if (!result || !("user" in result) || !result.user) {
      return NextResponse.json({ message: "Failed to create user" }, { status: 500 });
    }

    const newUser = await prisma.user.findUnique({ where: { id: result.user.id } });
    if (!newUser) {
      return NextResponse.json({ message: "User created but not found" }, { status: 500 });
    }

    await writeAuditLog({
      entityType: "user",
      entityId: newUser.id,
      action: "CREATED",
      actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
      snapshot: {
        email: input.email,
        displayName: input.displayName,
        jobTitle: input.jobTitle,
        role: "admin",
        isActive: true,
      },
    });

    return created(serialize(newUser as unknown as Record<string, unknown>));
  });
}
