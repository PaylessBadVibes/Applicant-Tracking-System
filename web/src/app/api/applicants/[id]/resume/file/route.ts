import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { streamResume } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async () => {
    const id = ctx.params.id;
    const applicant = await prisma.applicant.findUnique({
      where: { id },
      select: { resumeRelPath: true, resumeContentType: true, resumeSizeBytes: true },
    });
    if (!applicant || !applicant.resumeRelPath) {
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    const { stream, size } = await streamResume(applicant.resumeRelPath);
    const fileName = path.posix.basename(applicant.resumeRelPath);
    const headers = new Headers();
    headers.set("Content-Type", applicant.resumeContentType ?? "application/octet-stream");
    headers.set("Content-Length", String(size));
    headers.set("Content-Disposition", `inline; filename="${fileName}"`);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(stream, { status: 200, headers });
  });
}
