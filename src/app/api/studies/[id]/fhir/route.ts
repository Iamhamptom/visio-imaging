import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getStudy } from "@/lib/storage";
import { studyToFhirDiagnosticReport } from "@/lib/fhir";

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

  const { searchParams } = new URL(request.url);
  const patientRef = searchParams.get("patientReference") || undefined;

  const fhirReport = studyToFhirDiagnosticReport(study, patientRef);

  return NextResponse.json(fhirReport, {
    headers: { "Content-Type": "application/fhir+json" },
  });
}
