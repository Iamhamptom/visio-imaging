"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ClaimIssue {
  type: string;
  severity: string;
  description: string;
  currentValue: string;
  suggestedFix: string;
  estimatedRecovery: number;
  schemeSpecific: boolean;
}

interface ValidationResult {
  id: string;
  claimValue: number;
  issuesFound: number;
  totalRecoverable: number;
  riskScore: number;
  issues: ClaimIssue[];
  correctedClaim: Record<string, unknown> | null;
  resubmissionInstructions: string | null;
  schemeTips: string[];
  mode: "validate" | "fix";
  creditsCharged: number;
  creditsRemaining: number;
}

type ViewMode = "form" | "csv";

export function ClaimsAnalyzer() {
  const [viewMode, setViewMode] = useState<ViewMode>("form");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [scheme, setScheme] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [procedureCode, setProcedureCode] = useState("");
  const [billedAmount, setBilledAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // CSV
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Account (simplified for landing page demo)
  const [accountId, setAccountId] = useState<string | null>(null);
  const [credits, setCredits] = useState(5);

  async function ensureAccount() {
    if (accountId) return accountId;

    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo@visioclaims.co.za",
        name: "Demo User",
        companyName: "Demo Practice",
        accountType: "practice",
      }),
    });

    const data = await res.json();
    setAccountId(data.id);
    setCredits(data.credits);
    return data.id;
  }

  async function handleValidate() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const acctId = await ensureAccount();

      const claim = {
        scheme: scheme || undefined,
        icdCode: icdCode || undefined,
        procedureCode: procedureCode || undefined,
        billedAmount: parseFloat(billedAmount) || undefined,
        rejectionReason: rejectionReason || undefined,
        rawText: clinicalNotes || undefined,
      };

      const res = await fetch("/api/claims/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: acctId, claim }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setError(`Insufficient credits. You need ${data.creditsNeeded} credits. You have ${data.currentCredits}.`);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }

      setResult(data);
      setCredits(data.creditsRemaining);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFix() {
    setLoading(true);
    setError(null);

    try {
      const acctId = await ensureAccount();

      const claim = {
        scheme: scheme || undefined,
        icdCode: icdCode || undefined,
        procedureCode: procedureCode || undefined,
        billedAmount: parseFloat(billedAmount) || undefined,
        rejectionReason: rejectionReason || undefined,
        rawText: clinicalNotes || undefined,
      };

      const res = await fetch("/api/claims/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: acctId, claim }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setError(`Insufficient credits. You need ${data.creditsNeeded} credits. You have ${data.currentCredits}. Top up to unlock the fix.`);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Fix failed");
        return;
      }

      setResult(data);
      setCredits(data.creditsRemaining);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function severityColor(severity: string) {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  function issueTypeLabel(type: string) {
    const labels: Record<string, string> = {
      coding_error: "Coding Error",
      missing_modifier: "Missing Modifier",
      pmb_override: "PMB Override",
      scheme_rule: "Scheme Rule",
      tariff_error: "Tariff Error",
      documentation: "Documentation",
      benefit_limit: "Benefit Limit",
      authorization: "Authorization",
    };
    return labels[type] || type;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header with credits */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setViewMode("form"); setResult(null); }}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${viewMode === "form" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            Single Claim
          </button>
          <button
            onClick={() => { setViewMode("csv"); setResult(null); }}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${viewMode === "csv" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            Batch (CSV)
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-400">{credits} credits</span>
        </div>
      </div>

      {/* Form */}
      {!result && (
        <div className="p-6">
          {viewMode === "form" ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheme" className="text-zinc-400 text-sm">Medical Aid Scheme</Label>
                  <Input
                    id="scheme"
                    placeholder="e.g. Discovery, GEMS, Bonitas"
                    value={scheme}
                    onChange={(e) => setScheme(e.target.value)}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div>
                  <Label htmlFor="amount" className="text-zinc-400 text-sm">Billed Amount (R)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="e.g. 2450"
                    value={billedAmount}
                    onChange={(e) => setBilledAmount(e.target.value)}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icd" className="text-zinc-400 text-sm">ICD-10 Code</Label>
                  <Input
                    id="icd"
                    placeholder="e.g. Z00.0, J06.9"
                    value={icdCode}
                    onChange={(e) => setIcdCode(e.target.value)}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div>
                  <Label htmlFor="procedure" className="text-zinc-400 text-sm">Procedure/Tariff Code</Label>
                  <Input
                    id="procedure"
                    placeholder="e.g. 0190, 0191"
                    value={procedureCode}
                    onChange={(e) => setProcedureCode(e.target.value)}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rejection" className="text-zinc-400 text-sm">Rejection Reason (if rejected)</Label>
                <Input
                  id="rejection"
                  placeholder="e.g. Benefit exhausted, Invalid code combination"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-zinc-400 text-sm">Clinical Notes (optional — improves accuracy)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Patient presented with sore throat, fever 38.2°C, tonsillar exudate..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleValidate}
                  disabled={loading || (!icdCode && !clinicalNotes && !rejectionReason)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {loading ? "Analyzing..." : "Validate Claim"}
                </Button>
                <span className="text-xs text-zinc-500 self-center">
                  Uses 1-15 credits depending on claim value
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400 text-sm">Upload Claims CSV</Label>
                <p className="text-xs text-zinc-500 mt-1 mb-3">
                  Export rejected claims from your billing system (Healthbridge, GoodX, MediSwitch) as CSV.
                  We handle semicolons, commas, and SA date formats.
                </p>
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="bg-zinc-800 border-zinc-700 text-white file:bg-zinc-700 file:text-white file:border-0 file:mr-3 file:px-3 file:py-1 file:rounded-lg"
                />
              </div>
              <Button
                disabled={!csvFile || loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {loading ? "Analyzing..." : "Analyze Batch"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
          {error.includes("Insufficient") && (
            <Button
              onClick={() => alert("Top-up flow — Yoco checkout would open here")}
              className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
              size="sm"
            >
              Top Up Credits
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="p-6">
          {/* Summary Bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-zinc-800 border border-zinc-700 text-center">
              <p className="text-3xl font-bold text-white">{result.issuesFound}</p>
              <p className="text-xs text-zinc-400 mt-1">Issues Found</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-800 border border-zinc-700 text-center">
              <p className="text-3xl font-bold text-emerald-400">
                R{result.totalRecoverable.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Recoverable</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-800 border border-zinc-700 text-center">
              <p className="text-3xl font-bold" style={{
                color: result.riskScore > 70 ? "#ef4444" : result.riskScore > 40 ? "#f59e0b" : "#22c55e"
              }}>
                {result.riskScore}%
              </p>
              <p className="text-xs text-zinc-400 mt-1">Risk Score</p>
            </div>
          </div>

          <Separator className="bg-zinc-800 my-6" />

          {/* Issues */}
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Issues</h3>
          <div className="space-y-3">
            {result.issues.map((issue, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={severityColor(issue.severity)}>
                    {issue.severity}
                  </Badge>
                  <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                    {issueTypeLabel(issue.type)}
                  </Badge>
                  {issue.estimatedRecovery > 0 && (
                    <span className="text-xs text-emerald-400 ml-auto">
                      +R{issue.estimatedRecovery.toLocaleString()} recoverable
                    </span>
                  )}
                </div>
                <p className="text-sm text-white">{issue.description}</p>
                <div className="mt-2 text-xs text-zinc-400">
                  Current: <span className="text-zinc-300">{issue.currentValue}</span>
                </div>

                {/* Blur or reveal */}
                {result.mode === "validate" ? (
                  <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-zinc-700 relative overflow-hidden">
                    <div className="blur-sm select-none text-sm text-zinc-300">
                      Correct code: J06.9 — Acute upper respiratory infection. Resubmit with modifier 0008 for after-hours rate.
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60">
                      <Button
                        onClick={handleFix}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                      >
                        Unlock Fix — {result.claimValue > 0 ?
                          `${Math.ceil(result.claimValue / 500) * 2} credits` :
                          "2 credits"
                        }
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-sm text-emerald-300">{issue.suggestedFix}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resubmission Instructions (fix mode only) */}
          {result.mode === "fix" && result.resubmissionInstructions && (
            <>
              <Separator className="bg-zinc-800 my-6" />
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                Resubmission Instructions
              </h3>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-zinc-300 whitespace-pre-wrap">
                {result.resubmissionInstructions}
              </div>
            </>
          )}

          {/* Scheme Tips */}
          {result.schemeTips.length > 0 && (
            <>
              <Separator className="bg-zinc-800 my-6" />
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                Scheme Tips
              </h3>
              <ul className="space-y-2">
                {result.schemeTips.map((tip, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">-</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => { setResult(null); setError(null); }}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Analyze Another
            </Button>
            {result.mode === "validate" && (
              <Button
                onClick={handleFix}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Unlock All Fixes
              </Button>
            )}
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            {result.creditsCharged} credits used · {result.creditsRemaining} remaining
          </p>
        </div>
      )}
    </div>
  );
}
