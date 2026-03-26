import { Study, FhirDiagnosticReport, LabReportResult, XrayResult } from "./types";

/**
 * Convert a completed Study into a FHIR DiagnosticReport resource.
 */
export function studyToFhirDiagnosticReport(
  study: Study,
  patientReference?: string
): FhirDiagnosticReport {
  const report: FhirDiagnosticReport = {
    resourceType: "DiagnosticReport",
    id: study.id,
    status: study.status === "completed" ? "final" : "registered",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0074",
            code: getCategoryCode(study.type),
            display: getCategoryDisplay(study.type),
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: getLoincCode(study.type),
          display: getLoincDisplay(study.type),
        },
      ],
      text: `${study.type} analysis`,
    },
    effectiveDateTime: study.createdAt,
    issued: study.completedAt || study.createdAt,
    conclusion: getConclusion(study),
  };

  if (patientReference) {
    report.subject = { reference: patientReference };
  }

  // Add ICD codes as conclusionCode
  const icdCodes = getIcdCodes(study);
  if (icdCodes.length > 0) {
    report.conclusionCode = icdCodes.map((icd) => ({
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-10",
          code: icd.code,
          display: icd.description,
        },
      ],
    }));
  }

  return report;
}

function getCategoryCode(type: string): string {
  switch (type) {
    case "lab_report": return "LAB";
    case "xray": return "RAD";
    case "clinical_notes": return "OTH";
    case "prescription": return "OTH";
    case "document": return "OTH";
    default: return "OTH";
  }
}

function getCategoryDisplay(type: string): string {
  switch (type) {
    case "lab_report": return "Laboratory";
    case "xray": return "Radiology";
    case "clinical_notes": return "Other";
    case "prescription": return "Other";
    case "document": return "Other";
    default: return "Other";
  }
}

function getLoincCode(type: string): string {
  switch (type) {
    case "lab_report": return "11502-2";
    case "xray": return "18748-4";
    case "clinical_notes": return "11506-3";
    case "prescription": return "57833-6";
    case "document": return "47420-5";
    default: return "47420-5";
  }
}

function getLoincDisplay(type: string): string {
  switch (type) {
    case "lab_report": return "Laboratory report";
    case "xray": return "Diagnostic imaging study";
    case "clinical_notes": return "Progress note";
    case "prescription": return "Prescription";
    case "document": return "Functional status assessment";
    default: return "Document";
  }
}

function getConclusion(study: Study): string {
  if (!study.result) return "";

  if (study.type === "lab_report") {
    const r = study.result as LabReportResult;
    return r.summary || "";
  }
  if (study.type === "xray") {
    const r = study.result as XrayResult;
    return r.impression || "";
  }
  return "";
}

function getIcdCodes(study: Study): Array<{ code: string; description: string }> {
  if (!study.result) return [];

  if ("icdCodes" in study.result && Array.isArray(study.result.icdCodes)) {
    return study.result.icdCodes;
  }
  return [];
}
