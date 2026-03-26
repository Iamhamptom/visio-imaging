import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@/lib/yoco";
import { getAccount, CREDIT_PACKS, type CreditPackId } from "@/lib/credits";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST /api/payments/checkout — Create Yoco checkout for credit purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, packId } = body as { accountId: string; packId: CreditPackId };

    if (!accountId || !packId) {
      return NextResponse.json(
        { error: "accountId and packId required" },
        { status: 400 }
      );
    }

    const account = getAccount(accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    // Create Yoco checkout
    const checkout = await createCheckout({
      amount: pack.priceZAR * 100, // Yoco uses cents
      currency: "ZAR",
      successUrl: `${BASE_URL}/credits/success?accountId=${accountId}&packId=${packId}`,
      cancelUrl: `${BASE_URL}/credits/cancelled`,
      failureUrl: `${BASE_URL}/credits/failed`,
      metadata: {
        accountId,
        packId,
        credits: String(pack.credits),
        accountEmail: account.email,
      },
    });

    return NextResponse.json({
      checkoutId: checkout.id,
      redirectUrl: checkout.redirectUrl,
      pack: {
        name: pack.name,
        credits: pack.credits,
        priceZAR: pack.priceZAR,
        perCredit: pack.perCredit,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Checkout creation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
