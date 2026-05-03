import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    return NextResponse.json({
      uid: session.uid,
      email: session.email,
      displayName: session.displayName,
      jobTitle: session.jobTitle,
    });
  });
}
