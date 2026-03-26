import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "visio-imaging",
    version: "1.0.0",
    endpoints: {
      "POST /api/analyze/lab-report": "Upload lab report image → structured data + flagged abnormals",
      "POST /api/analyze/xray": "Upload X-ray image → AI findings (decision support only)",
      "POST /api/analyze/document": "Upload document image → OCR + structured extraction",
      "POST /api/analyze/notes": "Send clinical text → SOAP-structured note + ICD-10 codes",
      "POST /api/analyze/prescription": "Upload prescription image → structured medication list",
      "GET /api/studies": "List all analyses (filter by type, status, product, patientId)",
      "GET /api/studies/:id": "Get specific analysis result",
      "GET /api/studies/:id/fhir": "Get result as FHIR DiagnosticReport",
    },
    auth: "Bearer token via Authorization header",
    timestamp: new Date().toISOString(),
  });
}
