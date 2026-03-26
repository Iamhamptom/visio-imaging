import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { listStudies } from "@/lib/storage";
import { AnalysisType, AnalysisStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") as AnalysisType | null;
  const status = searchParams.get("status") as AnalysisStatus | null;
  const product = searchParams.get("product");
  const patientId = searchParams.get("patientId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const result = listStudies({
    type: type || undefined,
    status: status || undefined,
    callerProduct: product || undefined,
    callerPatientId: patientId || undefined,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
