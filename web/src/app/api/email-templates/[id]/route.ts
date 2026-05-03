import { NextResponse, type NextRequest } from "next/server";
import { emailTemplateUpdateSchema } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { computeDiff, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(template: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...template };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async () => {
    const t = await prisma.emailTemplate.findUnique({ where: { id: ctx.params.id } });
    if (!t) return NextResponse.json({ message: "Template not found" }, { status: 404 });
    return NextResponse.json({ template: serialize(t as unknown as Record<string, unknown>) });
  });
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async (session) => {
    const body = await req.json().catch(() => ({}));
    const input = emailTemplateUpdateSchema.parse(body);
    const before = await prisma.emailTemplate.findUnique({ where: { id: ctx.params.id } });
    if (!before) return NextResponse.json({ message: "Template not found" }, { status: 404 });

    const after = await prisma.emailTemplate.update({
      where: { id: ctx.params.id },
      data: {
        subject: input.subject,
        bodyMarkdown: input.bodyMarkdown,
        updatedById: session.uid,
      },
    });

    const diff = computeDiff(
      { subject: before.subject, bodyMarkdown: before.bodyMarkdown },
      { subject: input.subject, bodyMarkdown: input.bodyMarkdown }
    );
    if (Object.keys(diff).length > 0) {
      await writeAuditLog({
        entityType: "emailTemplate",
        entityId: ctx.params.id,
        action: "UPDATED",
        actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
        changes: diff,
      });
    }

    return NextResponse.json({ template: serialize(after as unknown as Record<string, unknown>) });
  });
}
