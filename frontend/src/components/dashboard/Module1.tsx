import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal, fmtNumber, fmtPct } from "@/lib/format";
import { MetricCard } from "./MetricCard";
import { CallTicker, InsightCard } from "./LiveFeed";
import { IdentityVerificationPanel } from "./IdentityVerificationPanel";
import { EligibilityCoveragePanel } from "./EligibilityCoveragePanel";
import { LiveCallMetrics } from "./LiveCallMetrics";
import { Phone, Users, Zap, TrendingDown } from "lucide-react";

export function Module1() {
  const { results, callParams, mode } = useDashboard();
  const { callCenter } = results;

  return (
    <div className="space-y-5">
      <LiveCallMetrics />

      <CallTicker />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Monthly Calls"
          value={fmtNumber(callParams.monthlyCalls)}
          icon={<Phone className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Annual Savings"
          value={fmtCurrency(callCenter.annualSavings)}
          trend="positive"
          icon={<Zap className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="FTE Saved"
          value={fmtDecimal(callCenter.fteSaved)}
          sub={`${fmtNumber(callCenter.annualHoursSaved)} hrs/yr`}
          trend="positive"
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label={mode === "internal" ? "Annual Manual Cost" : "Efficiency Gain"}
          value={mode === "internal" ? fmtCurrency(callCenter.annualManualCost) : fmtPct(callParams.aiProcessSavingsPct)}
          sub={mode === "internal" ? "Pre-AI baseline" : "AI automation rate"}
          icon={mode === "internal" ? <TrendingDown className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Operational Realism Panels */}
      <div className="space-y-2">
        <IdentityVerificationPanel />
        <EligibilityCoveragePanel />
      </div>

      <InsightCard>
        AI deflection at <span className="font-mono text-foreground">{fmtPct(callParams.aiProcessSavingsPct)}</span> · 
        Accuracy <span className="font-mono text-foreground">{fmtPct(callParams.accuracyPct)}</span> · 
        Handle time <span className="font-mono text-foreground">{callParams.handleTimeMin}m</span> baseline
      </InsightCard>
    </div>
  );
}
