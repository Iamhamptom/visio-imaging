import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { uploadFile, createStudy, updateStudy } from "@/lib/storage";
import { analyzeXray } from "@/lib/analyze";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const callerProduct = (formData.get("product") as string) || "unknown";
    const callerPatientId = formData.get("patientId") as string | null;
    const callerPracticeId = formData.get("practiceId") as string | null;
    const bodyPart = formData.get("bodyPart") as string | null;
    const clinicalHistory = formData.get("clinicalHistory") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Send an X-ray image as 'file' in multipart form data." },
        { status: 400 }
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/dicom", "application/dicom"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".dcm")) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP, DICOM` },
        { status: 400 }
      );
    }

    const uploaded = await uploadFile(file, "xray");

    const study = createStudy({
      type: "xray",
      fileName: uploaded.fileName,
      fileUrl: uploaded.url,
      fileSize: uploaded.fileSize,
      mimeType: uploaded.mimeType,
      callerProduct,
      callerPatientId: callerPatientId || undefined,
      callerPracticeId: callerPracticeId || undefined,
      metadata: {
        bodyPart: bodyPart || undefined,
        clinicalHistory: clinicalHistory || undefined,
      },
    });

    updateStudy(study.id, { status: "processing" });

    try {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const result = await analyzeXray(base64, file.type || "image/jpeg", {
        bodyPart: bodyPart || undefined,
        clinicalHistory: clinicalHistory || undefined,
      });

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
