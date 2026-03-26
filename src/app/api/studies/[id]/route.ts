import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getStudy } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  const { id } = await params;
  const study = getStudy(id);

  if (!study) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  return NextResponse.json(study);
}
