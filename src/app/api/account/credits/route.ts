import { NextRequest, NextResponse } from "next/server";
import {
  purchaseCredits,
  getTransactions,
  checkTopUp,
  CREDIT_PACKS,
  getAccount,
} from "@/lib/credits";

// POST /api/account/credits — Purchase a credit pack
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, packId } = body;

    if (!accountId || !packId) {
      return NextResponse.json(
        { error: "accountId and packId are required" },
        { status: 400 }
      );
    }

    const result = purchaseCredits(accountId, packId);

    if (!result.success && result.requiresPayment) {
      return NextResponse.json(
        {
          error: "Card required",
          requiresPayment: true,
          paymentAmount: result.paymentAmount,
          packs: CREDIT_PACKS,
        },
        { status: 402 }
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      credits: result.account.credits,
      transaction: result.transaction,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Purchase failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/account/credits?accountId=...&action=check&needed=10
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const action = searchParams.get("action");
  const needed = parseInt(searchParams.get("needed") || "0", 10);

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  // Check if top-up needed
  if (action === "check" && needed > 0) {
    try {
      const topUpCheck = checkTopUp(accountId, needed);
      return NextResponse.json(topUpCheck);
    } catch {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
  }

  // Return transaction history
  const account = getAccount(accountId);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const transactions = getTransactions(accountId);

  return NextResponse.json({
    credits: account.credits,
    totalPurchased: account.totalCreditsPurchased,
    totalUsed: account.totalCreditsUsed,
    totalSpent: account.totalSpentZAR,
    totalSavings: account.totalSavingsZAR,
    transactions,
    packs: CREDIT_PACKS,
  });
}
