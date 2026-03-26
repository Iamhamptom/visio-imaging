import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import {
  LabReportResult,
  ClinicalNote,
  DocumentResult,
  XrayResult,
  PrescriptionResult,
} from "./types";

const model = google("gemini-2.5-pro");

// ── Lab Report Analysis ─────────────────────────────────────────

export async function analyzeLabReport(
  imageData: string,
  mimeType: string
): Promise<LabReportResult> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageData,
            mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          },
          {
            type: "text",
            text: `You are a medical lab report digitizer. Extract ALL data from this lab report image into structured JSON.

Return ONLY valid JSON matching this exact structure:
{
  "patientName": "string",
  "patientId": "string",
  "dateOfBirth": "string (YYYY-MM-DD)",
  "reportDate": "string (YYYY-MM-DD)",
  "labName": "string",
  "orderingProvider": "string",
  "panels": [
    {
      "panelName": "string (e.g. Full Blood Count, Lipid Panel, etc.)",
      "values": [
        {
          "name": "string (test name)",
          "value": "string (result value)",
          "unit": "string (unit of measurement)",
          "referenceRange": "string (normal range)",
          "flag": "normal | high | low | critical"
        }
      ]
    }
  ],
  "summary": "string (brief clinical summary)",
  "abnormalFindings": ["string (each abnormal result described)"],
  "criticalFindings": ["string (any critical/panic values)"]
}

Rules:
- Extract EVERY test result visible on the report
- Flag values outside reference ranges as "high" or "low"
- Flag panic/critical values as "critical"
- If a field is not visible, use empty string
- Group tests into their panels (FBC, U&E, LFTs, lipids, etc.)
- Use standard medical abbreviations
- Dates in YYYY-MM-DD format`,
          },
        ],
      },
    ],
  });

  return parseJsonResponse(text, LabReportResult);
}

// ── Clinical Notes Structuring ──────────────────────────────────

export async function analyzeClinicalNotes(
  input: string,
  context?: { patientName?: string; practiceType?: string }
): Promise<ClinicalNote> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: `You are a clinical documentation assistant. Structure these clinical notes into a SOAP-format medical record.

${context?.patientName ? `Patient: ${context.patientName}` : ""}
${context?.practiceType ? `Practice type: ${context.practiceType}` : ""}

INPUT NOTES:
${input}

Return ONLY valid JSON matching this exact structure:
{
  "chiefComplaint": "string",
  "historyOfPresentIllness": "string",
  "pastMedicalHistory": "string",
  "medications": ["string"],
  "allergies": ["string"],
  "examination": {
    "general": "string",
    "systems": [{"system": "string", "findings": "string"}],
    "vitals": {
      "bloodPressure": "string",
      "heartRate": "string",
      "temperature": "string",
      "respiratoryRate": "string",
      "oxygenSaturation": "string",
      "weight": "string"
    }
  },
  "assessment": "string",
  "plan": "string",
  "icdCodes": [{"code": "string", "description": "string"}],
  "followUp": "string"
}

Rules:
- Extract all clinical information from the notes
- Suggest appropriate ICD-10 codes based on the assessment
- If information is not mentioned, use empty string or empty array
- Use medical terminology appropriately
- Structure examination findings by body system`,
      },
    ],
  });

  return parseJsonResponse(text, ClinicalNote);
}

// ── Document OCR ────────────────────────────────────────────────

export async function analyzeDocument(
  imageData: string,
  mimeType: string
): Promise<DocumentResult> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageData,
            mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          },
          {
            type: "text",
            text: `You are a document analysis AI. Extract all text and structure from this document image.

Return ONLY valid JSON:
{
  "documentType": "string (e.g. referral letter, medical certificate, insurance form, invoice, consent form, etc.)",
  "title": "string",
  "date": "string (YYYY-MM-DD if visible)",
  "author": "string (author/sender if visible)",
  "content": "string (full extracted text, preserving paragraphs)",
  "structuredData": {
    "key": "value pairs for any structured fields found (dates, reference numbers, amounts, etc.)"
  },
  "summary": "string (2-3 sentence summary of the document)"
}

Rules:
- Extract ALL visible text accurately
- Identify the document type
- Pull out any structured fields (dates, IDs, amounts, codes)
- Preserve formatting where possible in the content field`,
          },
        ],
      },
    ],
  });

  return parseJsonResponse(text, DocumentResult);
}

// ── X-ray Analysis ──────────────────────────────────────────────

export async function analyzeXray(
  imageData: string,
  mimeType: string,
  context?: { bodyPart?: string; clinicalHistory?: string }
): Promise<XrayResult> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageData,
            mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          },
          {
            type: "text",
            text: `You are a radiology AI assistant providing DECISION SUPPORT ONLY. Analyze this X-ray image.

${context?.bodyPart ? `Body part: ${context.bodyPart}` : ""}
${context?.clinicalHistory ? `Clinical history: ${context.clinicalHistory}` : ""}

Return ONLY valid JSON:
{
  "modality": "string (CR/DR/XR)",
  "bodyPart": "string (chest, hand, spine, etc.)",
  "viewPosition": "string (PA, AP, lateral, etc.)",
  "imageQuality": "good | adequate | poor",
  "findings": [
    {
      "finding": "string (what is seen)",
      "location": "string (anatomical location)",
      "severity": "normal | mild | moderate | severe",
      "confidence": 0.0-1.0,
      "description": "string (detailed description)"
    }
  ],
  "impression": "string (overall impression)",
  "recommendations": ["string (suggested follow-up actions)"],
  "criticalFindings": ["string (any urgent findings requiring immediate attention)"],
  "icdCodes": [{"code": "string", "description": "string"}],
  "disclaimer": "AI-assisted analysis for decision support only. Not a diagnostic report. Must be reviewed and confirmed by a qualified radiologist."
}

CRITICAL RULES:
- This is DECISION SUPPORT, not diagnosis
- Always include the disclaimer
- Be conservative — flag uncertain findings with lower confidence
- Include anatomical location for every finding
- Flag any potentially critical findings separately
- Suggest ICD-10 codes for identified conditions
- If image quality is poor, note this and reduce confidence scores`,
          },
        ],
      },
    ],
  });

  return parseJsonResponse(text, XrayResult);
}

// ── Prescription Analysis ───────────────────────────────────────

export async function analyzePrescription(
  imageData: string,
  mimeType: string
): Promise<PrescriptionResult> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageData,
            mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          },
          {
            type: "text",
            text: `You are a prescription digitizer. Extract all information from this prescription image.

Return ONLY valid JSON:
{
  "patientName": "string",
  "prescriberName": "string",
  "prescriberPracticeNumber": "string (HPCSA number if visible)",
  "date": "string (YYYY-MM-DD)",
  "medications": [
    {
      "name": "string (medication name)",
      "dosage": "string (e.g. 500mg)",
      "frequency": "string (e.g. twice daily)",
      "duration": "string (e.g. 7 days)",
      "quantity": "string (e.g. 14 tablets)",
      "instructions": "string (e.g. take with food)"
    }
  ],
  "diagnosis": "string",
  "icdCode": "string"
}

Rules:
- Extract EVERY medication listed
- Include dosage, frequency, duration if visible
- Handle handwritten prescriptions (do your best)
- Note the prescriber's practice number if visible
- If a field is illegible, note as "[illegible]"`,
          },
        ],
      },
    ],
  });

  return parseJsonResponse(text, PrescriptionResult);
}

// ── JSON Parser Helper ──────────────────────────────────────────

function parseJsonResponse<T>(text: string, schema: { parse: (data: unknown) => T }): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}
