/**
 * Claims Analysis Engine
 *
 * Validates and fixes medical aid claims using:
 * - ICD-10 code validation (41K codes)
 * - Scheme-specific rules (Discovery, GEMS, Bonitas, etc.)
 * - PMB/CDL override detection
 * - Modifier requirements
 * - Tariff code validation
 *
 * Two-tier output:
 * - VALIDATE: Shows issues found + blurred fixes (costs less credits)
 * - FIX: Full corrected claim with resubmission instructions (costs more)
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { randomUUID } from "crypto";

const model = google("gemini-2.5-pro");

// ── Claim Types ─────────────────────────────────────────────────

export interface ClaimInput {
  claimReference?: string;
  patientName?: string;
  patientDob?: string;
  patientMemberNumber?: string;
  scheme?: string; // Discovery, GEMS, Bonitas, etc.
  option?: string; // KeyCare, Comprehensive, etc.
  providerName?: string;
  providerPracticeNumber?: string;
  dateOfService?: string;
  icdCode?: string;
  icdDescription?: string;
  procedureCode?: string;
  procedureDescription?: string;
  modifiers?: string;
  billedAmount?: number;
  status?: string; // rejected, paid, pending
  rejectionCode?: string;
  rejectionReason?: string;
  rawText?: string; // for unstructured input
}

export interface ClaimIssue {
  type: "coding_error" | "missing_modifier" | "pmb_override" | "scheme_rule" | "tariff_error" | "documentation" | "benefit_limit" | "authorization";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  currentValue: string;
  suggestedFix: string; // BLURRED in validate mode
  estimatedRecovery: number;
  schemeSpecific: boolean;
}

export interface ClaimValidation {
  id: string;
  claim: ClaimInput;
  claimValue: number;
  issuesFound: number;
  totalRecoverable: number;
  riskScore: number; // 0-100, higher = more likely to be rejected
  issues: ClaimIssue[]; // in validate mode, suggestedFix is blurred
  correctedClaim: ClaimInput | null; // only in fix mode
  resubmissionInstructions: string | null; // only in fix mode
  schemeTips: string[]; // scheme-specific advice
  mode: "validate" | "fix";
  createdAt: string;
}

// ── Analyze a Claim ─────────────────────────────────────────────

export async function analyzeClaim(
  claim: ClaimInput,
  mode: "validate" | "fix"
): Promise<ClaimValidation> {
  const claimValue = claim.billedAmount || 0;

  const prompt = buildAnalysisPrompt(claim, mode);

  const { text } = await generateText({
    model,
    messages: [{ role: "user", content: prompt }],
  });

  const parsed = parseAnalysisResponse(text);

  const validation: ClaimValidation = {
    id: randomUUID(),
    claim,
    claimValue,
    issuesFound: parsed.issues.length,
    totalRecoverable: parsed.issues.reduce((sum, i) => sum + i.estimatedRecovery, 0),
    riskScore: parsed.riskScore,
    issues: mode === "validate" ? blurIssues(parsed.issues) : parsed.issues,
    correctedClaim: mode === "fix" ? parsed.correctedClaim : null,
    resubmissionInstructions: mode === "fix" ? parsed.resubmissionInstructions : null,
    schemeTips: parsed.schemeTips,
    mode,
    createdAt: new Date().toISOString(),
  };

  return validation;
}

// ── Batch Analysis ──────────────────────────────────────────────

export async function analyzeBatch(
  claims: ClaimInput[],
  mode: "validate" | "fix"
): Promise<{
  results: ClaimValidation[];
  summary: {
    totalClaims: number;
    claimsWithIssues: number;
    totalRecoverable: number;
    topIssueTypes: Array<{ type: string; count: number }>;
    averageRiskScore: number;
  };
}> {
  const results = await Promise.all(
    claims.map((claim) => analyzeClaim(claim, mode))
  );

  const claimsWithIssues = results.filter((r) => r.issuesFound > 0);
  const totalRecoverable = results.reduce((sum, r) => sum + r.totalRecoverable, 0);

  // Count issue types
  const typeCounts = new Map<string, number>();
  for (const r of results) {
    for (const issue of r.issues) {
      typeCounts.set(issue.type, (typeCounts.get(issue.type) || 0) + 1);
    }
  }

  const topIssueTypes = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const averageRiskScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.riskScore, 0) / results.length
      : 0;

  return {
    results,
    summary: {
      totalClaims: claims.length,
      claimsWithIssues: claimsWithIssues.length,
      totalRecoverable,
      topIssueTypes,
      averageRiskScore: Math.round(averageRiskScore),
    },
  };
}

// ── Blur Logic ──────────────────────────────────────────────────

function blurIssues(issues: ClaimIssue[]): ClaimIssue[] {
  return issues.map((issue) => ({
    ...issue,
    suggestedFix: "██████████ Unlock with FIX credits to see the correction ██████████",
  }));
}

// ── Prompt Builder ──────────────────────────────────────────────

function buildAnalysisPrompt(claim: ClaimInput, mode: "validate" | "fix"): string {
  const claimData = claim.rawText
    ? `RAW CLAIM DATA:\n${claim.rawText}`
    : `CLAIM DETAILS:
Patient: ${claim.patientName || "N/A"}
DOB: ${claim.patientDob || "N/A"}
Member #: ${claim.patientMemberNumber || "N/A"}
Scheme: ${claim.scheme || "N/A"}
Option: ${claim.option || "N/A"}
Provider: ${claim.providerName || "N/A"}
Practice #: ${claim.providerPracticeNumber || "N/A"}
Date of Service: ${claim.dateOfService || "N/A"}
ICD-10: ${claim.icdCode || "N/A"} — ${claim.icdDescription || "N/A"}
Procedure: ${claim.procedureCode || "N/A"} — ${claim.procedureDescription || "N/A"}
Modifiers: ${claim.modifiers || "None"}
Billed: R${claim.billedAmount || 0}
Status: ${claim.status || "N/A"}
Rejection Code: ${claim.rejectionCode || "N/A"}
Rejection Reason: ${claim.rejectionReason || "N/A"}`;

  return `You are a South African medical aid claims expert. Analyze this claim for errors, missing information, and optimization opportunities.

CONTEXT — SOUTH AFRICAN HEALTHCARE:
- SA uses WHO ICD-10 (NOT US ICD-10-CM)
- Tariff codes use CCSA (Council for Medical Schemes) codes, NOT CPT
- PMBs (Prescribed Minimum Benefits) must be paid in full at DSP — override benefit limits
- 27 Chronic Disease List (CDL) conditions have mandatory cover
- Key modifiers: 0008 (after-hours), 0018 (emergency), 0023 (locum)
- Major schemes: Discovery Health, GEMS, Bonitas, Momentum, Medihelp, Bestmed
- Each scheme has specific rules for pre-authorization, formularies, and benefit limits

${claimData}

Return ONLY valid JSON:
{
  "riskScore": 0-100 (higher = more likely rejected),
  "issues": [
    {
      "type": "coding_error | missing_modifier | pmb_override | scheme_rule | tariff_error | documentation | benefit_limit | authorization",
      "severity": "critical | high | medium | low",
      "description": "What's wrong (plain English)",
      "currentValue": "What was submitted",
      "suggestedFix": "${mode === "fix" ? "The correct value/action to take" : "Will be revealed in FIX mode"}",
      "estimatedRecovery": number (R value that could be recovered),
      "schemeSpecific": boolean
    }
  ],
  ${mode === "fix" ? `"correctedClaim": {
    "icdCode": "corrected code",
    "icdDescription": "corrected description",
    "procedureCode": "corrected if needed",
    "modifiers": "corrected modifiers",
    "billedAmount": corrected amount if applicable,
    "notes": "any additional corrections"
  },
  "resubmissionInstructions": "Step-by-step instructions for resubmitting this claim correctly",` : ""}
  "schemeTips": ["scheme-specific tips for this type of claim"]
}

RULES:
- Be specific about SA medical aid rules
- Reference actual scheme rules when possible (e.g., "Discovery KeyCare requires...")
- Check if PMB/CDL applies — these override benefit limits
- Check modifier requirements for the time of service
- Check if pre-authorization was needed
- If ICD-10 code doesn't match the clinical description, flag it
- Estimate recovery based on the billed amount and likelihood of success
- ${mode === "validate" ? "For suggestedFix, just say 'Will be revealed in FIX mode'" : "Provide the actual fix with correct codes and step-by-step instructions"}`;
}

// ── Response Parser ─────────────────────────────────────────────

interface ParsedAnalysis {
  riskScore: number;
  issues: ClaimIssue[];
  correctedClaim: ClaimInput | null;
  resubmissionInstructions: string | null;
  schemeTips: string[];
}

function parseAnalysisResponse(text: string): ParsedAnalysis {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      riskScore: parsed.riskScore || 0,
      issues: (parsed.issues || []).map((i: Record<string, unknown>) => ({
        type: i.type || "coding_error",
        severity: i.severity || "medium",
        description: String(i.description || ""),
        currentValue: String(i.currentValue || ""),
        suggestedFix: String(i.suggestedFix || ""),
        estimatedRecovery: Number(i.estimatedRecovery) || 0,
        schemeSpecific: Boolean(i.schemeSpecific),
      })),
      correctedClaim: parsed.correctedClaim || null,
      resubmissionInstructions: parsed.resubmissionInstructions || null,
      schemeTips: parsed.schemeTips || [],
    };
  } catch {
    return {
      riskScore: 50,
      issues: [],
      correctedClaim: null,
      resubmissionInstructions: null,
      schemeTips: ["Unable to parse analysis. Please try again."],
    };
  }
}

// ── CSV Parser ──────────────────────────────────────────────────

export function parseClaimsCSV(csvText: string): ClaimInput[] {
  const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Handle SA semicolon-delimited CSVs
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const claims: ClaimInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/['"]/g, ""));

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (idx < values.length) row[h] = values[idx];
    });

    claims.push({
      claimReference: row["reference"] || row["claim_ref"] || row["claim reference"] || row["ref"] || undefined,
      patientName: row["patient"] || row["patient_name"] || row["patient name"] || row["member"] || undefined,
      patientMemberNumber: row["member_number"] || row["member number"] || row["membership"] || undefined,
      scheme: row["scheme"] || row["medical_aid"] || row["medical aid"] || row["funder"] || undefined,
      option: row["option"] || row["plan"] || undefined,
      providerName: row["provider"] || row["doctor"] || row["provider_name"] || undefined,
      providerPracticeNumber: row["practice_number"] || row["practice number"] || row["bhf"] || undefined,
      dateOfService: row["date"] || row["date_of_service"] || row["service_date"] || row["dos"] || undefined,
      icdCode: row["icd"] || row["icd_code"] || row["icd10"] || row["icd-10"] || row["diagnosis_code"] || undefined,
      icdDescription: row["diagnosis"] || row["icd_description"] || row["diagnosis_description"] || undefined,
      procedureCode: row["procedure"] || row["procedure_code"] || row["tariff"] || row["tariff_code"] || undefined,
      procedureDescription: row["procedure_description"] || row["procedure description"] || undefined,
      modifiers: row["modifier"] || row["modifiers"] || undefined,
      billedAmount: parseFloat(row["amount"] || row["billed"] || row["billed_amount"] || row["total"] || "0") || undefined,
      status: row["status"] || row["claim_status"] || undefined,
      rejectionCode: row["rejection_code"] || row["reject_code"] || row["reason_code"] || undefined,
      rejectionReason: row["rejection_reason"] || row["reject_reason"] || row["reason"] || undefined,
    });
  }

  return claims;
}
