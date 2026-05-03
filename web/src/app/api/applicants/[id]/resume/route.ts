import { NextResponse, type NextRequest } from "next/server";
import { RESUME_ALLOWED_MIME_TYPES, RESUME_MAX_SIZE_BYTES } from "@ats/shared";
import { prisma } from "@/lib/db";
import { withAdmin } from "@/lib/api-helpers";
import { writeAuditLog } from "@/lib/audit";
import { deleteResume, resolveResumePath, writeResume } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>(RESUME_ALLOWED_MIME_TYPES);

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async (session) => {
    const id = ctx.params.id;
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { message: `Unsupported content type: ${file.type}` },
        { status: 400 }
      );
    }
    if (file.size > RESUME_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { message: `File too large (max ${RESUME_MAX_SIZE_BYTES} bytes)` },
        { status: 400 }
      );
    }

    const existing = await prisma.applicant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Applicant not found" }, { status: 404 });
    }

    const { absPath, relPath } = await resolveResumePath(id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeResume(absPath, buffer);

    const previousRelPath = existing.resumeRelPath;

    await prisma.applicant.update({
      where: { id },
      data: {
        resumeRelPath: relPath,
        resumeContentType: file.type,
        resumeSizeBytes: BigInt(file.size),
        resumeUploadedAt: new Date(),
        updatedBy: { connect: { id: session.uid } },
      },
    });

    if (previousRelPath && previousRelPath !== relPath) {
      try {
        await deleteResume(previousRelPath);
      } catch (err) {
        console.error("Failed to delete previous resume", err);
      }
    }

    await writeAuditLog({
      entityType: "applicant",
      entityId: id,
      action: "RESUME_UPLOADED",
      actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
      metadata: { path: relPath, sizeBytes: file.size, contentType: file.type },
    });

    return NextResponse.json({
      resumeUrl: `/api/applicants/${id}/resume/file`,
      resumePath: relPath,
    });
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  return withAdmin(async (session) => {
    const id = ctx.params.id;
    const existing = await prisma.applicant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Applicant not found" }, { status: 404 });
    }
    if (existing.resumeRelPath) {
      try {
        await deleteResume(existing.resumeRelPath);
      } catch (err) {
        console.error("Storage delete failed", err);
      }
    }
    await prisma.applicant.update({
      where: { id },
      data: {
        resumeRelPath: null,
        resumeContentType: null,
        resumeSizeBytes: null,
        resumeUploadedAt: null,
        updatedBy: { connect: { id: session.uid } },
      },
    });
    await writeAuditLog({
      entityType: "applicant",
      entityId: id,
      action: "RESUME_REMOVED",
      actor: { uid: session.uid, email: session.email, jobTitle: session.jobTitle },
    });
    return new NextResponse(null, { status: 204 });
  });
}
