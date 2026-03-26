import { NextRequest, NextResponse } from "next/server";
import { analyzeClaim, type ClaimInput } from "@/lib/claims";
import { spendCredits, getCreditCost, checkTopUp, getAccount, CREDIT_PACKS } from "@/lib/credits";

// POST /api/claims/validate — Validate a claim (blurred fixes)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, claim } = body as { accountId: string; claim: ClaimInput };

    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    if (!claim) {
      return NextResponse.json({ error: "claim data required" }, { status: 400 });
    }

    const account = getAccount(accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const claimValue = claim.billedAmount || 0;
    const creditsNeeded = getCreditCost(claimValue, "validate");

    // Check credits
    const topUpCheck = checkTopUp(accountId, creditsNeeded);
    if (topUpCheck.needsTopUp && !account.autoTopUp) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          insufficientCredits: true,
          currentCredits: topUpCheck.currentCredits,
          creditsNeeded,
          suggestedPack: topUpCheck.suggestedPack,
          packs: CREDIT_PACKS,
        },
        { status: 402 }
      );
    }

    // Spend credits
    const spend = spendCredits(accountId, {
      claimId: claim.claimReference || "manual",
      claimValueZAR: claimValue,
      action: "validate",
    });

    if (!spend.success) {
      return NextResponse.json(
        {
          error: spend.error,
          insufficientCredits: spend.insufficientCredits,
          creditsNeeded,
          packs: CREDIT_PACKS,
        },
        { status: 402 }
      );
    }

    // Run analysis (validate mode — fixes are blurred)
    const result = await analyzeClaim(claim, "validate");

    return NextResponse.json({
      ...result,
      creditsCharged: spend.creditsCharged,
      creditsRemaining: spend.balanceAfter,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
