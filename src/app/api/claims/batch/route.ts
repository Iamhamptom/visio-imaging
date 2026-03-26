import { NextRequest, NextResponse } from "next/server";
import { analyzeBatch, parseClaimsCSV, type ClaimInput } from "@/lib/claims";
import {
  spendCredits,
  getCreditCost,
  checkTopUp,
  addSavings,
  getAccount,
  CREDIT_PACKS,
} from "@/lib/credits";

// POST /api/claims/batch — Batch analyze claims (CSV or JSON array)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let claims: ClaimInput[] = [];
    let accountId = "";
    let mode: "validate" | "fix" = "validate";

    if (contentType.includes("multipart/form-data")) {
      // CSV upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      accountId = (formData.get("accountId") as string) || "";
      mode = ((formData.get("mode") as string) || "validate") as "validate" | "fix";

      if (!file) {
        return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
      }

      const csvText = await file.text();
      claims = parseClaimsCSV(csvText);
    } else {
      // JSON body
      const body = await request.json();
      accountId = body.accountId;
      mode = body.mode || "validate";
      claims = body.claims || [];
    }

    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    if (claims.length === 0) {
      return NextResponse.json({ error: "No claims to analyze" }, { status: 400 });
    }

    if (claims.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 claims per batch. Split into smaller batches." },
        { status: 400 }
      );
    }

    const account = getAccount(accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Calculate total credits needed
    const totalCredits = claims.reduce((sum, claim) => {
      return sum + getCreditCost(claim.billedAmount || 0, mode);
    }, 0);

    // Check credits upfront
    const topUpCheck = checkTopUp(accountId, totalCredits);
    if (topUpCheck.needsTopUp && !account.autoTopUp) {
      return NextResponse.json(
        {
          error: "Insufficient credits for batch",
          insufficientCredits: true,
          currentCredits: topUpCheck.currentCredits,
          creditsNeeded: totalCredits,
          claimsCount: claims.length,
          suggestedPack: topUpCheck.suggestedPack,
          packs: CREDIT_PACKS,
        },
        { status: 402 }
      );
    }

    // Spend credits for all claims
    for (const claim of claims) {
      const spend = spendCredits(accountId, {
        claimId: claim.claimReference || "batch",
        claimValueZAR: claim.billedAmount || 0,
        action: mode,
      });

      if (!spend.success) {
        return NextResponse.json(
          {
            error: `Credit deduction failed at claim ${claim.claimReference || "unknown"}: ${spend.error}`,
            insufficientCredits: true,
            packs: CREDIT_PACKS,
          },
          { status: 402 }
        );
      }
    }

    // Run batch analysis
    const batchResult = await analyzeBatch(claims, mode);

    // Track total savings
    if (batchResult.summary.totalRecoverable > 0) {
      addSavings(accountId, batchResult.summary.totalRecoverable);
    }

    const updatedAccount = getAccount(accountId);

    return NextResponse.json({
      ...batchResult,
      creditsCharged: totalCredits,
      creditsRemaining: updatedAccount?.credits || 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Batch analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
