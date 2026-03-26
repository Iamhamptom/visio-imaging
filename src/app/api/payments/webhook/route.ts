import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/yoco";
import { purchaseCredits, saveCard, getAccount, type CreditPackId } from "@/lib/credits";

// POST /api/payments/webhook — Yoco webhook for payment confirmation
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-yoco-signature") || "";

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload);

    // Handle payment.completed event
    if (event.type === "payment.completed" || event.payload?.status === "successful") {
      const payment = event.payload || event;
      const metadata = payment.metadata || {};
      const accountId = metadata.accountId;
      const packId = metadata.packId as CreditPackId;

      if (!accountId || !packId) {
        console.error("Webhook missing accountId or packId in metadata", metadata);
        return NextResponse.json({ received: true, error: "Missing metadata" });
      }

      const account = getAccount(accountId);
      if (!account) {
        console.error("Webhook: account not found", accountId);
        return NextResponse.json({ received: true, error: "Account not found" });
      }

      // Mark card as on file (they just paid, so we know they have a card)
      if (!account.cardOnFile) {
        saveCard(accountId, {
          token: payment.id || "yoco-single-use",
          last4: payment.card?.last4 || "****",
          brand: payment.card?.brand || "card",
        });
      }

      // Add credits
      const result = purchaseCredits(accountId, packId);

      if (result.success) {
        console.log(
          `Credits added: ${result.account.credits} credits for ${accountId} (pack: ${packId})`
        );
      } else {
        console.error("Failed to add credits after payment", result.error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}
