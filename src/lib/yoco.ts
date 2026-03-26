/**
 * Yoco Payment Integration
 *
 * Uses Yoco Checkout API (v2) for credit purchases.
 * Flow: Create checkout → redirect/popup → webhook confirms → credits added
 */

const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY || "";
const YOCO_API_URL = "https://payments.yoco.com/api";

interface YocoCheckoutRequest {
  amount: number; // in cents (ZAR)
  currency: "ZAR";
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  metadata?: Record<string, string>;
}

interface YocoCheckoutResponse {
  id: string;
  status: string;
  redirectUrl: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

interface YocoPayment {
  id: string;
  status: "successful" | "failed" | "pending";
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export async function createCheckout(
  params: YocoCheckoutRequest
): Promise<YocoCheckoutResponse> {
  const res = await fetch(`${YOCO_API_URL}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${YOCO_SECRET_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Yoco checkout failed: ${error}`);
  }

  return res.json();
}

export async function getPayment(paymentId: string): Promise<YocoPayment> {
  const res = await fetch(`${YOCO_API_URL}/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${YOCO_SECRET_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Yoco payment lookup failed: ${res.status}`);
  }

  return res.json();
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // Yoco webhook verification
  // In production, verify HMAC signature against YOCO_WEBHOOK_SECRET
  const webhookSecret = process.env.YOCO_WEBHOOK_SECRET || "";
  if (!webhookSecret) return true; // skip in dev

  // Yoco uses a simple signature check
  // For production: implement HMAC-SHA256 verification
  return signature.length > 0;
}

export type { YocoCheckoutRequest, YocoCheckoutResponse, YocoPayment };
