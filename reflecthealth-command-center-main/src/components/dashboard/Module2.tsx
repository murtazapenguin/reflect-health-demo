import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal, fmtNumber, fmtPct } from "@/lib/format";
import { MetricCard } from "./MetricCard";
import { ClaimsFeed, InsightCard } from "./LiveFeed";
import { ClaimsQueue } from "./ClaimsQueue";
import { EscalationGovernancePanel } from "./EscalationGovernancePanel";
import { ClaimStatusPanel } from "./ClaimStatusPanel";
import { FileText, Clock, Users, DollarSign } from "lucide-react";

export function Module2() {
  const { results, claimsParams, mode } = useDashboard();
  const { claims } = results;

  return (
    <div className="space-y-5">
      <ClaimsFeed />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Annual Claims"
          value={fmtNumber(claims.annualClaims)}
          sub={`${fmtNumber(claims.manualReviewClaims)} manual review`}
          icon={<FileText className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Annual Savings"
          value={fmtCurrency(claims.annualSavings)}
          trend="positive"
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="FTE Saved"
          value={fmtDecimal(claims.fteSaved)}
          sub={`${fmtNumber(claims.annualManualHours)} hrs eliminated`}
          trend="positive"
          icon={<Users className="h-3.5 w-3.5" />}
        />
        {mode === "internal" ? (
          <MetricCard
            label="Annual Manual Cost"
            value={fmtCurrency(claims.annualManualCost)}
            sub={`@ $${claimsParams.fteHourlyCost}/hr`}
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        ) : (
          <MetricCard
            label="AI Reduction Rate"
            value={fmtPct(claimsParams.aiLaborReductionPct)}
            sub="Labor automation"
            trend="positive"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        )}
      </div>

      <ClaimsQueue />

      {/* Claim Status & Prior Authorization */}
      <ClaimStatusPanel />

      {/* Escalation & Governance */}
      <EscalationGovernancePanel />

      <InsightCard>
        <span className="font-mono text-foreground">{fmtPct(claimsParams.manualReviewPct)}</span> flagged for review · 
        <span className="font-mono text-foreground"> {claimsParams.manualTimeMin}m</span>/claim · 
        <span className="font-mono text-foreground"> {fmtPct(claimsParams.aiLaborReductionPct)}</span> AI labor reduction
      </InsightCard>
    </div>
  );
}
