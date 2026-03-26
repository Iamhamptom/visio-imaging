import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { uploadFile, createStudy, updateStudy } from "@/lib/storage";
import { analyzeLabReport } from "@/lib/analyze";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const callerProduct = (formData.get("product") as string) || "unknown";
    const callerPatientId = formData.get("patientId") as string | null;
    const callerPracticeId = formData.get("practiceId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Send a lab report image as 'file' in multipart form data." },
        { status: 400 }
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Accepted: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Upload file
    const uploaded = await uploadFile(file, "lab_report");

    // Create study record
    const study = createStudy({
      type: "lab_report",
      fileName: uploaded.fileName,
      fileUrl: uploaded.url,
      fileSize: uploaded.fileSize,
      mimeType: uploaded.mimeType,
      callerProduct,
      callerPatientId: callerPatientId || undefined,
      callerPracticeId: callerPracticeId || undefined,
    });

    // Run analysis
    updateStudy(study.id, { status: "processing" });

    try {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const result = await analyzeLabReport(base64, file.type);

      const completed = updateStudy(study.id, {
        status: "completed",
        result,
        completedAt: new Date().toISOString(),
      });

      return NextResponse.json(completed, { status: 200 });
    } catch (analysisError) {
      const errMsg = analysisError instanceof Error ? analysisError.message : "Analysis failed";
      const failed = updateStudy(study.id, {
        status: "failed",
        error: errMsg,
      });

      return NextResponse.json(failed, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
