import { z } from "zod";

// ── Analysis Types ──────────────────────────────────────────────

export const AnalysisType = z.enum([
  "lab_report",
  "xray",
  "document",
  "clinical_notes",
  "prescription",
]);
export type AnalysisType = z.infer<typeof AnalysisType>;

export const AnalysisStatus = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatus>;

// ── Lab Report ──────────────────────────────────────────────────

export const LabValue = z.object({
  name: z.string(),
  value: z.string(),
  unit: z.string().default(""),
  referenceRange: z.string().default(""),
  flag: z.enum(["normal", "high", "low", "critical"]).default("normal"),
});
export type LabValue = z.infer<typeof LabValue>;

export const LabReportResult = z.object({
  patientName: z.string().default(""),
  patientId: z.string().default(""),
  dateOfBirth: z.string().default(""),
  reportDate: z.string().default(""),
  labName: z.string().default(""),
  orderingProvider: z.string().default(""),
  panels: z.array(
    z.object({
      panelName: z.string(),
      values: z.array(LabValue),
    })
  ),
  summary: z.string().default(""),
  abnormalFindings: z.array(z.string()).default([]),
  criticalFindings: z.array(z.string()).default([]),
});
export type LabReportResult = z.infer<typeof LabReportResult>;

// ── Clinical Notes ──────────────────────────────────────────────

export const ClinicalNote = z.object({
  chiefComplaint: z.string().default(""),
  historyOfPresentIllness: z.string().default(""),
  pastMedicalHistory: z.string().default(""),
  medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  examination: z.object({
    general: z.string().default(""),
    systems: z.array(
      z.object({
        system: z.string(),
        findings: z.string(),
      })
    ).default([]),
    vitals: z.object({
      bloodPressure: z.string().default(""),
      heartRate: z.string().default(""),
      temperature: z.string().default(""),
      respiratoryRate: z.string().default(""),
      oxygenSaturation: z.string().default(""),
      weight: z.string().default(""),
    }).optional(),
  }).optional(),
  assessment: z.string().default(""),
  plan: z.string().default(""),
  icdCodes: z.array(
    z.object({
      code: z.string(),
      description: z.string(),
    })
  ).default([]),
  followUp: z.string().default(""),
});
export type ClinicalNote = z.infer<typeof ClinicalNote>;

// ── Document ────────────────────────────────────────────────────

export const DocumentResult = z.object({
  documentType: z.string().default(""),
  title: z.string().default(""),
  date: z.string().default(""),
  author: z.string().default(""),
  content: z.string().default(""),
  structuredData: z.record(z.string(), z.unknown()).default({}),
  summary: z.string().default(""),
});
export type DocumentResult = z.infer<typeof DocumentResult>;

// ── X-ray / Imaging ─────────────────────────────────────────────

export const ImagingFinding = z.object({
  finding: z.string(),
  location: z.string().default(""),
  severity: z.enum(["normal", "mild", "moderate", "severe"]).default("normal"),
  confidence: z.number().min(0).max(1).default(0),
  description: z.string().default(""),
});
export type ImagingFinding = z.infer<typeof ImagingFinding>;

export const XrayResult = z.object({
  modality: z.string().default(""),
  bodyPart: z.string().default(""),
  viewPosition: z.string().default(""),
  imageQuality: z.enum(["good", "adequate", "poor"]).default("adequate"),
  findings: z.array(ImagingFinding).default([]),
  impression: z.string().default(""),
  recommendations: z.array(z.string()).default([]),
  criticalFindings: z.array(z.string()).default([]),
  icdCodes: z.array(
    z.object({
      code: z.string(),
      description: z.string(),
    })
  ).default([]),
  disclaimer: z
    .string()
    .default(
      "AI-assisted analysis for decision support only. Not a diagnostic report. Must be reviewed and confirmed by a qualified radiologist."
    ),
});
export type XrayResult = z.infer<typeof XrayResult>;

// ── Prescription ────────────────────────────────────────────────

export const PrescriptionResult = z.object({
  patientName: z.string().default(""),
  prescriberName: z.string().default(""),
  prescriberPracticeNumber: z.string().default(""),
  date: z.string().default(""),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string().default(""),
      frequency: z.string().default(""),
      duration: z.string().default(""),
      quantity: z.string().default(""),
      instructions: z.string().default(""),
    })
  ).default([]),
  diagnosis: z.string().default(""),
  icdCode: z.string().default(""),
});
export type PrescriptionResult = z.infer<typeof PrescriptionResult>;

// ── Study (unified result wrapper) ──────────────────────────────

export interface Study {
  id: string;
  type: AnalysisType;
  status: AnalysisStatus;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  result: LabReportResult | ClinicalNote | DocumentResult | XrayResult | PrescriptionResult | null;
  error: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
  callerProduct: string;
  callerPatientId: string | null;
  callerPracticeId: string | null;
}

// ── FHIR Output ─────────────────────────────────────────────────

export interface FhirDiagnosticReport {
  resourceType: "DiagnosticReport";
  id: string;
  status: "registered" | "partial" | "preliminary" | "final";
  category: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
  code: {
    coding: Array<{ system: string; code: string; display: string }>;
    text: string;
  };
  subject?: { reference: string };
  effectiveDateTime: string;
  issued: string;
  result?: Array<{ reference: string }>;
  conclusion: string;
  conclusionCode?: Array<{
    coding: Array<{ system: string; code: string; display: string }>;
  }>;
}
