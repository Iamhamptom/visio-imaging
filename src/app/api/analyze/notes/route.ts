import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { createStudy, updateStudy } from "@/lib/storage";
import { analyzeClinicalNotes } from "@/lib/analyze";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      notes,
      product = "unknown",
      patientId,
      practiceId,
      patientName,
      practiceType,
    } = body;

    if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
      return NextResponse.json(
        { error: "No notes provided. Send { notes: 'clinical notes text' } in the request body." },
        { status: 400 }
      );
    }

    const study = createStudy({
      type: "clinical_notes",
      fileName: "clinical-notes.txt",
      fileUrl: "",
      fileSize: new TextEncoder().encode(notes).length,
      mimeType: "text/plain",
      callerProduct: product,
      callerPatientId: patientId,
      callerPracticeId: practiceId,
    });

    updateStudy(study.id, { status: "processing" });

    try {
      const result = await analyzeClinicalNotes(notes, { patientName, practiceType });

      const completed = updateStudy(study.id, {
        status: "completed",
        result,
        completedAt: new Date().toISOString(),
      });

      return NextResponse.json(completed, { status: 200 });
    } catch (analysisError) {
      const errMsg = analysisError instanceof Error ? analysisError.message : "Analysis failed";
      const failed = updateStudy(study.id, { status: "failed", error: errMsg });
      return NextResponse.json(failed, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
