import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(template: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...template };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

export async function GET() {
  return withAdmin(async () => {
    const items = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ items: items.map((t) => serialize(t as unknown as Record<string, unknown>)) });
  });
}
