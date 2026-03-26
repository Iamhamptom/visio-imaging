/**
 * Visio Imaging API Client
 *
 * Drop this file into any VisioCorp product to connect to the imaging API.
 *
 * Usage:
 *   import { ImagingClient } from '@/lib/imaging-client';
 *   const imaging = new ImagingClient({ product: 'healthops' });
 *   const result = await imaging.analyzeLabReport(file);
 */

interface ImagingClientConfig {
  baseUrl?: string;
  apiKey?: string;
  product: string;
}

interface Study {
  id: string;
  type: string;
  status: string;
  fileName: string;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export class ImagingClient {
  private baseUrl: string;
  private apiKey: string;
  private product: string;

  constructor(config: ImagingClientConfig) {
    this.baseUrl =
      config.baseUrl ||
      process.env.VISIO_IMAGING_URL ||
      "http://localhost:3000";
    this.apiKey =
      config.apiKey ||
      process.env.VISIO_IMAGING_KEY ||
      "";
    this.product = config.product;
  }

  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok && res.status === 401) {
      throw new Error("Visio Imaging API: Invalid API key");
    }

    return res;
  }

  // ── Lab Report Analysis ─────────────────────────────────────

  async analyzeLabReport(
    file: File | Blob,
    options?: { patientId?: string; practiceId?: string; fileName?: string }
  ): Promise<Study> {
    const form = new FormData();
    form.append("file", file, options?.fileName || "lab-report");
    form.append("product", this.product);
    if (options?.patientId) form.append("patientId", options.patientId);
    if (options?.practiceId) form.append("practiceId", options.practiceId);

    const res = await this.request("/api/analyze/lab-report", {
      method: "POST",
      body: form,
    });

    return res.json();
  }

  // ── X-ray Analysis ──────────────────────────────────────────

  async analyzeXray(
    file: File | Blob,
    options?: {
      patientId?: string;
      practiceId?: string;
      bodyPart?: string;
      clinicalHistory?: string;
      fileName?: string;
    }
  ): Promise<Study> {
    const form = new FormData();
    form.append("file", file, options?.fileName || "xray");
    form.append("product", this.product);
    if (options?.patientId) form.append("patientId", options.patientId);
    if (options?.practiceId) form.append("practiceId", options.practiceId);
    if (options?.bodyPart) form.append("bodyPart", options.bodyPart);
    if (options?.clinicalHistory)
      form.append("clinicalHistory", options.clinicalHistory);

    const res = await this.request("/api/analyze/xray", {
      method: "POST",
      body: form,
    });

    return res.json();
  }

  // ── Document Analysis ───────────────────────────────────────

  async analyzeDocument(
    file: File | Blob,
    options?: { patientId?: string; practiceId?: string; fileName?: string }
  ): Promise<Study> {
    const form = new FormData();
    form.append("file", file, options?.fileName || "document");
    form.append("product", this.product);
    if (options?.patientId) form.append("patientId", options.patientId);
    if (options?.practiceId) form.append("practiceId", options.practiceId);

    const res = await this.request("/api/analyze/document", {
      method: "POST",
      body: form,
    });

    return res.json();
  }

  // ── Clinical Notes ──────────────────────────────────────────

  async analyzeClinicalNotes(
    notes: string,
    options?: {
      patientId?: string;
      practiceId?: string;
      patientName?: string;
      practiceType?: string;
    }
  ): Promise<Study> {
    const res = await this.request("/api/analyze/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        product: this.product,
        patientId: options?.patientId,
        practiceId: options?.practiceId,
        patientName: options?.patientName,
        practiceType: options?.practiceType,
      }),
    });

    return res.json();
  }

  // ── Prescription Analysis ───────────────────────────────────

  async analyzePrescription(
    file: File | Blob,
    options?: { patientId?: string; practiceId?: string; fileName?: string }
  ): Promise<Study> {
    const form = new FormData();
    form.append("file", file, options?.fileName || "prescription");
    form.append("product", this.product);
    if (options?.patientId) form.append("patientId", options.patientId);
    if (options?.practiceId) form.append("practiceId", options.practiceId);

    const res = await this.request("/api/analyze/prescription", {
      method: "POST",
      body: form,
    });

    return res.json();
  }

  // ── Studies ─────────────────────────────────────────────────

  async getStudy(id: string): Promise<Study> {
    const res = await this.request(`/api/studies/${id}`);
    return res.json();
  }

  async getStudyFhir(
    id: string,
    patientReference?: string
  ): Promise<Record<string, unknown>> {
    const params = patientReference
      ? `?patientReference=${encodeURIComponent(patientReference)}`
      : "";
    const res = await this.request(`/api/studies/${id}/fhir${params}`);
    return res.json();
  }

  async listStudies(filters?: {
    type?: string;
    status?: string;
    patientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ studies: Study[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.patientId) params.set("patientId", filters.patientId);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));
    params.set("product", this.product);

    const res = await this.request(`/api/studies?${params.toString()}`);
    return res.json();
  }

  // ── Health Check ────────────────────────────────────────────

  async health(): Promise<{ status: string; version: string }> {
    const res = await fetch(`${this.baseUrl}/api/health`);
    return res.json();
  }
}
