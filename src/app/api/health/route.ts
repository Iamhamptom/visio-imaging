import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "visio-imaging",
    version: "1.0.0",
    endpoints: {
      imaging: {
        "POST /api/analyze/lab-report": "Upload lab report image → structured data + flagged abnormals",
        "POST /api/analyze/xray": "Upload X-ray image → AI findings (decision support only)",
        "POST /api/analyze/document": "Upload document image → OCR + structured extraction",
        "POST /api/analyze/notes": "Send clinical text → SOAP-structured note + ICD-10 codes",
        "POST /api/analyze/prescription": "Upload prescription image → structured medication list",
        "GET /api/studies": "List all analyses",
        "GET /api/studies/:id": "Get specific analysis result",
        "GET /api/studies/:id/fhir": "Get result as FHIR DiagnosticReport",
      },
      claims: {
        "POST /api/claims/validate": "Validate a claim — blurred fixes, lower credit cost",
        "POST /api/claims/fix": "Fix a claim — full corrections + resubmission instructions",
        "POST /api/claims/batch": "Batch analyze claims (CSV upload or JSON array)",
      },
      account: {
        "POST /api/account": "Create account",
        "GET /api/account": "Get account by email or id",
        "POST /api/account/credits": "Purchase credit pack",
        "GET /api/account/credits": "Get credit balance + transaction history",
        "POST /api/account/card": "Save card on file (Yoco token)",
        "PATCH /api/account/card": "Update auto-top-up settings",
      },
    },
    pricing: {
      model: "Credit-based, claim-value-tiered",
      floor: "R3.00/credit (minimum, no exceptions)",
      packs: "Starter R500 (50) → Scale R1.5M (500K)",
      actions: "VALIDATE (blurred) costs less, FIX (full) costs more",
      tiers: "Higher-value claims cost more credits to analyze",
    },
    auth: "Bearer token via Authorization header (imaging) | Account-based (claims)",
    timestamp: new Date().toISOString(),
  });
}
