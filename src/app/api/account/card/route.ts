import { NextRequest, NextResponse } from "next/server";
import { saveCard, setAutoTopUp, getAccount } from "@/lib/credits";

// POST /api/account/card — Save card on file (Yoco token)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, token, last4, brand } = body;

    if (!accountId || !token || !last4) {
      return NextResponse.json(
        { error: "accountId, token, and last4 are required" },
        { status: 400 }
      );
    }

    const account = saveCard(accountId, {
      token,
      last4,
      brand: brand || "visa",
    });

    return NextResponse.json({
      success: true,
      cardOnFile: true,
      cardLast4: account.cardLast4,
      cardBrand: account.cardBrand,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to save card";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/account/card — Update auto-top-up settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, autoTopUp, threshold, packId } = body;

    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    const account = setAutoTopUp(accountId, {
      enabled: autoTopUp ?? false,
      threshold,
      packId,
    });

    return NextResponse.json({
      autoTopUp: account.autoTopUp,
      autoTopUpThreshold: account.autoTopUpThreshold,
      autoTopUpPackId: account.autoTopUpPackId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
