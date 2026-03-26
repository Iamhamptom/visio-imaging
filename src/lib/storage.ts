import { put, del, list } from "@vercel/blob";
import { Study, AnalysisType, AnalysisStatus } from "./types";
import { randomUUID } from "crypto";

// In-memory store for development (replace with Supabase in production)
const studies = new Map<string, Study>();

export async function uploadFile(
  file: File,
  analysisType: AnalysisType
): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string }> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `imaging/${analysisType}/${randomUUID()}.${ext}`;

  // Use Vercel Blob if token available, otherwise store locally
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(path, file, { access: "public" });
    return {
      url: blob.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  }

  // Development: store as data URL placeholder
  return {
    url: `dev://imaging/${path}`,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

export async function deleteFile(url: string): Promise<void> {
  if (url.startsWith("dev://")) return;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(url);
  }
}

export function createStudy(params: {
  type: AnalysisType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  callerProduct: string;
  callerPatientId?: string;
  callerPracticeId?: string;
  metadata?: Record<string, unknown>;
}): Study {
  const study: Study = {
    id: randomUUID(),
    type: params.type,
    status: "pending",
    fileName: params.fileName,
    fileUrl: params.fileUrl,
    fileSize: params.fileSize,
    mimeType: params.mimeType,
    result: null,
    error: null,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString(),
    completedAt: null,
    callerProduct: params.callerProduct,
    callerPatientId: params.callerPatientId || null,
    callerPracticeId: params.callerPracticeId || null,
  };

  studies.set(study.id, study);
  return study;
}

export function updateStudy(
  id: string,
  updates: Partial<Pick<Study, "status" | "result" | "error" | "completedAt">>
): Study | null {
  const study = studies.get(id);
  if (!study) return null;

  const updated = { ...study, ...updates };
  studies.set(id, updated);
  return updated;
}

export function getStudy(id: string): Study | null {
  return studies.get(id) || null;
}

export function listStudies(filters?: {
  type?: AnalysisType;
  status?: AnalysisStatus;
  callerProduct?: string;
  callerPatientId?: string;
  limit?: number;
  offset?: number;
}): { studies: Study[]; total: number } {
  let results = Array.from(studies.values());

  if (filters?.type) results = results.filter((s) => s.type === filters.type);
  if (filters?.status) results = results.filter((s) => s.status === filters.status);
  if (filters?.callerProduct)
    results = results.filter((s) => s.callerProduct === filters.callerProduct);
  if (filters?.callerPatientId)
    results = results.filter((s) => s.callerPatientId === filters.callerPatientId);

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = results.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  results = results.slice(offset, offset + limit);

  return { studies: results, total };
}
