/**
 * Credit System — Higgsfield-style usage-based billing
 *
 * Every action costs credits. Credits are purchased with card on file.
 * When credits run low, user gets a top-up prompt.
 * Auto-top-up charges card automatically when balance drops below threshold.
 */

import { randomUUID } from "crypto";

// ── Credit Packs ────────────────────────────────────────────────

export const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 50, priceZAR: 500, perCredit: 10.0, savings: 0 },
  { id: "practice", name: "Practice", credits: 200, priceZAR: 1600, perCredit: 8.0, savings: 20 },
  { id: "professional", name: "Professional", credits: 1000, priceZAR: 6000, perCredit: 6.0, savings: 40 },
  { id: "enterprise", name: "Enterprise", credits: 5000, priceZAR: 25000, perCredit: 5.0, savings: 50 },
  { id: "platform", name: "Platform", credits: 50000, priceZAR: 200000, perCredit: 4.0, savings: 60 },
  { id: "scale", name: "Scale", credits: 500000, priceZAR: 1500000, perCredit: 3.0, savings: 70 },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

// ── Claim Value Tiers ───────────────────────────────────────────

interface ClaimTier {
  minValue: number;
  maxValue: number;
  validateCredits: number;
  fixCredits: number;
}

const CLAIM_TIERS: ClaimTier[] = [
  { minValue: 0, maxValue: 500, validateCredits: 1, fixCredits: 2 },
  { minValue: 501, maxValue: 2000, validateCredits: 2, fixCredits: 4 },
  { minValue: 2001, maxValue: 5000, validateCredits: 4, fixCredits: 8 },
  { minValue: 5001, maxValue: 15000, validateCredits: 6, fixCredits: 12 },
  { minValue: 15001, maxValue: 50000, validateCredits: 10, fixCredits: 20 },
  { minValue: 50001, maxValue: Infinity, validateCredits: 15, fixCredits: 30 },
];

export function getClaimTier(claimValueZAR: number): ClaimTier {
  return CLAIM_TIERS.find(
    (t) => claimValueZAR >= t.minValue && claimValueZAR <= t.maxValue
  ) || CLAIM_TIERS[CLAIM_TIERS.length - 1];
}

export function getCreditCost(
  claimValueZAR: number,
  action: "validate" | "fix"
): number {
  const tier = getClaimTier(claimValueZAR);
  return action === "validate" ? tier.validateCredits : tier.fixCredits;
}

// ── Account ─────────────────────────────────────────────────────

export interface Account {
  id: string;
  email: string;
  name: string;
  companyName: string;
  accountType: "practice" | "billing_company" | "hospital" | "scheme" | "other";
  credits: number;
  totalCreditsPurchased: number;
  totalCreditsUsed: number;
  totalSpentZAR: number;
  totalSavingsZAR: number; // total recovered claim value
  cardOnFile: boolean;
  cardToken: string | null; // Yoco card token
  cardLast4: string | null;
  cardBrand: string | null;
  autoTopUp: boolean;
  autoTopUpThreshold: number; // recharge when credits drop below this
  autoTopUpPackId: CreditPackId; // which pack to auto-buy
  apiKey: string | null; // for billing companies using the API
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  accountId: string;
  type: "purchase" | "usage" | "refund" | "bonus";
  credits: number; // positive for purchase/refund/bonus, negative for usage
  balanceAfter: number;
  description: string;
  claimId?: string;
  claimValue?: number;
  action?: "validate" | "fix";
  packId?: CreditPackId;
  amountZAR?: number; // for purchases
  createdAt: string;
}

// ── In-Memory Store (swap for Supabase in production) ───────────

const accounts = new Map<string, Account>();
const accountsByEmail = new Map<string, string>(); // email → accountId
const accountsByApiKey = new Map<string, string>(); // apiKey → accountId
const transactions: CreditTransaction[] = [];

// ── Account Management ──────────────────────────────────────────

export function createAccount(params: {
  email: string;
  name: string;
  companyName: string;
  accountType: Account["accountType"];
}): Account {
  const existing = accountsByEmail.get(params.email);
  if (existing) return accounts.get(existing)!;

  const account: Account = {
    id: randomUUID(),
    email: params.email,
    name: params.name,
    companyName: params.companyName,
    accountType: params.accountType,
    credits: 5, // 5 free credits to start (test on 2-3 claims)
    totalCreditsPurchased: 0,
    totalCreditsUsed: 0,
    totalSpentZAR: 0,
    totalSavingsZAR: 0,
    cardOnFile: false,
    cardToken: null,
    cardLast4: null,
    cardBrand: null,
    autoTopUp: false,
    autoTopUpThreshold: 10,
    autoTopUpPackId: "practice",
    apiKey: null,
    createdAt: new Date().toISOString(),
  };

  accounts.set(account.id, account);
  accountsByEmail.set(account.email, account.id);

  // Log the free credits
  logTransaction({
    accountId: account.id,
    type: "bonus",
    credits: 5,
    balanceAfter: 5,
    description: "Welcome bonus — 5 free credits",
  });

  return account;
}

export function getAccount(id: string): Account | null {
  return accounts.get(id) || null;
}

export function getAccountByEmail(email: string): Account | null {
  const id = accountsByEmail.get(email);
  return id ? accounts.get(id) || null : null;
}

export function getAccountByApiKey(apiKey: string): Account | null {
  const id = accountsByApiKey.get(apiKey);
  return id ? accounts.get(id) || null : null;
}

export function generateApiKey(accountId: string): string {
  const account = accounts.get(accountId);
  if (!account) throw new Error("Account not found");

  const apiKey = `vci_${randomUUID().replace(/-/g, "")}`;
  account.apiKey = apiKey;
  accountsByApiKey.set(apiKey, accountId);
  accounts.set(accountId, account);
  return apiKey;
}

// ── Card Management ─────────────────────────────────────────────

export function saveCard(
  accountId: string,
  params: { token: string; last4: string; brand: string }
): Account {
  const account = accounts.get(accountId);
  if (!account) throw new Error("Account not found");

  account.cardOnFile = true;
  account.cardToken = params.token;
  account.cardLast4 = params.last4;
  account.cardBrand = params.brand;
  accounts.set(accountId, account);
  return account;
}

export function setAutoTopUp(
  accountId: string,
  params: { enabled: boolean; threshold?: number; packId?: CreditPackId }
): Account {
  const account = accounts.get(accountId);
  if (!account) throw new Error("Account not found");

  account.autoTopUp = params.enabled;
  if (params.threshold !== undefined) account.autoTopUpThreshold = params.threshold;
  if (params.packId !== undefined) account.autoTopUpPackId = params.packId;
  accounts.set(accountId, account);
  return account;
}

// ── Credit Operations ───────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  account: Account;
  transaction: CreditTransaction | null;
  error?: string;
  requiresPayment?: boolean; // true = need to charge card first
  paymentAmount?: number;
}

export function purchaseCredits(
  accountId: string,
  packId: CreditPackId
): PurchaseResult {
  const account = accounts.get(accountId);
  if (!account) return { success: false, account: null as never, transaction: null, error: "Account not found" };

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return { success: false, account, transaction: null, error: "Invalid pack" };

  // In production: charge card via Yoco here
  // For now: assume payment succeeds if card is on file
  if (!account.cardOnFile) {
    return {
      success: false,
      account,
      transaction: null,
      error: "No card on file",
      requiresPayment: true,
      paymentAmount: pack.priceZAR,
    };
  }

  account.credits += pack.credits;
  account.totalCreditsPurchased += pack.credits;
  account.totalSpentZAR += pack.priceZAR;
  accounts.set(accountId, account);

  const tx = logTransaction({
    accountId,
    type: "purchase",
    credits: pack.credits,
    balanceAfter: account.credits,
    description: `Purchased ${pack.name} pack — ${pack.credits} credits`,
    packId,
    amountZAR: pack.priceZAR,
  });

  return { success: true, account, transaction: tx };
}

export interface SpendResult {
  success: boolean;
  creditsCharged: number;
  balanceAfter: number;
  error?: string;
  insufficientCredits?: boolean;
  creditsNeeded?: number;
  autoTopUpTriggered?: boolean;
}

export function spendCredits(
  accountId: string,
  params: {
    claimId: string;
    claimValueZAR: number;
    action: "validate" | "fix";
  }
): SpendResult {
  const account = accounts.get(accountId);
  if (!account) return { success: false, creditsCharged: 0, balanceAfter: 0, error: "Account not found" };

  const cost = getCreditCost(params.claimValueZAR, params.action);

  // Check if auto-top-up should trigger
  if (account.credits < cost && account.autoTopUp && account.cardOnFile) {
    const autoResult = purchaseCredits(accountId, account.autoTopUpPackId);
    if (autoResult.success) {
      // Re-read account after top-up
      const refreshed = accounts.get(accountId)!;
      if (refreshed.credits >= cost) {
        return executeSpend(refreshed, cost, params);
      }
    }
  }

  if (account.credits < cost) {
    return {
      success: false,
      creditsCharged: 0,
      balanceAfter: account.credits,
      insufficientCredits: true,
      creditsNeeded: cost,
      error: `Insufficient credits. Need ${cost}, have ${account.credits}.`,
    };
  }

  return executeSpend(account, cost, params);
}

function executeSpend(
  account: Account,
  cost: number,
  params: { claimId: string; claimValueZAR: number; action: "validate" | "fix" }
): SpendResult {
  account.credits -= cost;
  account.totalCreditsUsed += cost;
  accounts.set(account.id, account);

  logTransaction({
    accountId: account.id,
    type: "usage",
    credits: -cost,
    balanceAfter: account.credits,
    description: `${params.action === "validate" ? "Validated" : "Fixed"} claim worth R${params.claimValueZAR.toLocaleString()}`,
    claimId: params.claimId,
    claimValue: params.claimValueZAR,
    action: params.action,
  });

  return {
    success: true,
    creditsCharged: cost,
    balanceAfter: account.credits,
  };
}

export function addSavings(accountId: string, amountZAR: number): void {
  const account = accounts.get(accountId);
  if (account) {
    account.totalSavingsZAR += amountZAR;
    accounts.set(accountId, account);
  }
}

// ── Transaction Log ─────────────────────────────────────────────

function logTransaction(
  params: Omit<CreditTransaction, "id" | "createdAt">
): CreditTransaction {
  const tx: CreditTransaction = {
    ...params,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  transactions.push(tx);
  return tx;
}

export function getTransactions(
  accountId: string,
  limit = 50
): CreditTransaction[] {
  return transactions
    .filter((t) => t.accountId === accountId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// ── Check if user needs top-up prompt ───────────────────────────

export interface TopUpCheck {
  needsTopUp: boolean;
  currentCredits: number;
  creditsNeeded: number;
  suggestedPack: (typeof CREDIT_PACKS)[number];
  autoTopUpEnabled: boolean;
}

export function checkTopUp(
  accountId: string,
  requiredCredits: number
): TopUpCheck {
  const account = accounts.get(accountId);
  if (!account) throw new Error("Account not found");

  const needsTopUp = account.credits < requiredCredits;

  // Suggest the smallest pack that covers the deficit
  const deficit = requiredCredits - account.credits;
  const suggestedPack =
    CREDIT_PACKS.find((p) => p.credits >= deficit) || CREDIT_PACKS[CREDIT_PACKS.length - 1];

  return {
    needsTopUp,
    currentCredits: account.credits,
    creditsNeeded: requiredCredits,
    suggestedPack,
    autoTopUpEnabled: account.autoTopUp,
  };
}
