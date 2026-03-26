import { ClaimsAnalyzer } from "@/components/ClaimsAnalyzer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-sm font-bold">
              V
            </div>
            <span className="font-semibold text-lg tracking-tight">Visio Claims</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#how" className="text-zinc-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a
              href="/api/health"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              API
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
            Trusted by practices across South Africa
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Stop Losing Money on
            <span className="text-emerald-400"> Rejected Claims</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload your rejected medical aid claims. Our AI analyzes each one against
            41,000 ICD-10 codes, scheme-specific rules, and PMB regulations — then shows
            you exactly how to fix them and get paid.
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              SA Medical Aid Specialist
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              ICD-10 + CCSA Codes
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              All Major Schemes
            </div>
          </div>
        </div>
      </section>

      {/* Claims Analyzer */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <ClaimsAnalyzer />
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Upload Claims</h3>
              <p className="text-sm text-zinc-400">
                Paste a single claim or upload a CSV of rejected claims from your billing system.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">AI Analyzes</h3>
              <p className="text-sm text-zinc-400">
                We check against 41K ICD-10 codes, scheme rules, PMB regulations, and modifier requirements. Issues found instantly.
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Fix & Resubmit</h3>
              <p className="text-sm text-zinc-400">
                Get the correct codes, modifiers, and step-by-step resubmission instructions. Download the corrected claim.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">Pay Per Claim, Not Per Month</h2>
          <p className="text-center text-zinc-400 mb-12">
            Buy credits. Use them when you need. Higher-value claims cost more because they&apos;re worth more to fix.
          </p>

          {/* Tiers */}
          <div className="mb-12">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Credit Cost by Claim Value</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { range: "R0 - R500", validate: 1, fix: 2 },
                { range: "R501 - R2,000", validate: 2, fix: 4 },
                { range: "R2,001 - R5,000", validate: 4, fix: 8 },
                { range: "R5,001 - R15,000", validate: 6, fix: 12 },
                { range: "R15,001 - R50,000", validate: 10, fix: 20 },
                { range: "R50,001+", validate: 15, fix: 30 },
              ].map((tier) => (
                <div
                  key={tier.range}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"
                >
                  <p className="text-sm font-medium text-white">{tier.range}</p>
                  <div className="mt-2 flex gap-3 text-xs text-zinc-400">
                    <span>Validate: {tier.validate}cr</span>
                    <span>Fix: {tier.fix}cr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Packs */}
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Credit Packs</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "Starter", credits: 50, price: "R500", per: "R10.00", savings: null },
              { name: "Practice", credits: 200, price: "R1,600", per: "R8.00", savings: "20% off" },
              { name: "Professional", credits: "1,000", price: "R6,000", per: "R6.00", savings: "40% off" },
              { name: "Enterprise", credits: "5,000", price: "R25,000", per: "R5.00", savings: "50% off" },
              { name: "Platform", credits: "50,000", price: "R200,000", per: "R4.00", savings: "60% off" },
              { name: "Scale", credits: "500,000", price: "R1,500,000", per: "R3.00", savings: "70% off" },
            ].map((pack) => (
              <div
                key={pack.name}
                className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{pack.name}</h4>
                  {pack.savings && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      {pack.savings}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold mt-2">{pack.price}</p>
                <p className="text-sm text-zinc-400 mt-1">
                  {pack.credits} credits · {pack.per}/credit
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Chain */}
      <section className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Built for the Entire Value Chain</h2>
          <p className="text-zinc-400 mb-12">
            From solo GP to hospital group. Everyone who touches a claim gets value.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              {
                title: "GP Practices",
                desc: "Stop losing R5K-R50K/month on coding errors. Validate claims before submission.",
              },
              {
                title: "Billing Companies",
                desc: "White-label our engine. Differentiate your platform. Reduce rejection rates by 30-50%.",
              },
              {
                title: "Hospital Groups",
                desc: "Analyze thousands of claims daily. Recover millions in rejected revenue.",
              },
              {
                title: "Medical Aid Schemes",
                desc: "Catch fraud before you pay. Validate incoming claims against coding standards.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-xl bg-zinc-900 border border-zinc-800"
              >
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
        <p>Visio Claims by VisioCorp. South African medical aid claims intelligence.</p>
        <p className="mt-1">41,000 ICD-10 codes · 487,000 NAPPI records · All major schemes</p>
      </footer>
    </div>
  );
}
