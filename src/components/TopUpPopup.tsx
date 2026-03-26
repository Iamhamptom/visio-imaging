"use client";

import { useState } from "react";
import { CREDIT_PACKS } from "@/lib/credits";

interface TopUpPopupProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  currentCredits: number;
  creditsNeeded: number;
  suggestedPackId?: string;
  onSuccess?: (newBalance: number) => void;
}

export function TopUpPopup({
  isOpen,
  onClose,
  accountId,
  currentCredits,
  creditsNeeded,
  suggestedPackId,
  onSuccess,
}: TopUpPopupProps) {
  const [selectedPack, setSelectedPack] = useState(suggestedPackId || "practice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const deficit = creditsNeeded - currentCredits;

  async function handleTopUp() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, packId: selectedPack }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment failed");
        setLoading(false);
        return;
      }

      // Redirect to Yoco checkout
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Top Up Credits</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            You need <span className="text-amber-400 font-medium">{deficit} more credits</span> to
            continue. You have {currentCredits} credits remaining.
          </p>
        </div>

        {/* Packs */}
        <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
          {CREDIT_PACKS.filter((p) => p.credits >= deficit).map((pack) => (
            <button
              key={pack.id}
              onClick={() => setSelectedPack(pack.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                selectedPack === pack.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{pack.name}</span>
                  {pack.savings > 0 && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      {pack.savings}% off
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {pack.credits.toLocaleString()} credits · R{pack.perCredit.toFixed(2)}/credit
                </p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">
                  R{pack.priceZAR.toLocaleString()}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={handleTopUp}
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? "Processing..." : `Pay R${CREDIT_PACKS.find((p) => p.id === selectedPack)?.priceZAR.toLocaleString() || "0"}`}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Secure payment via Yoco · VAT included
          </p>
        </div>
      </div>
    </div>
  );
}
