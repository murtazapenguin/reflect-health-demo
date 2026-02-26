import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { MetricCard } from "./MetricCard";
import { InsightCard } from "./LiveFeed";
import { CompetitiveIndex } from "./CompetitiveIndex";
import { ConnectedSystemsPanel } from "./ConnectedSystemsPanel";
import { TrendingUp, Clock, DollarSign, Building2, Zap } from "lucide-react";
import { NetworkDetailModal, PARTNERS, SOLUTIONS } from "./NetworkDetailModal";

export function Module3() {
  const { results, platformParams } = useDashboard();
  const { combined } = results;
  const [modalType, setModalType] = useState<"partner" | "solution" | null>(null);
  const [modalIndex, setModalIndex] = useState(0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Annual Savings"
          value={fmtCurrency(combined.totalAnnualSavings)}
          trend="positive"
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="ROI Multiple"
          value={`${fmtDecimal(combined.roi)}x`}
          sub={`On ${fmtCurrency(platformParams.annualPlatformCost)} investment`}
          trend="positive"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Payback Period"
          value={`${fmtDecimal(combined.paybackMonths)} mo`}
          sub="Time to full recovery"
          trend="positive"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Platform Cost"
          value={fmtCurrency(platformParams.annualPlatformCost)}
          sub="Annual investment"
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Connected Systems */}
      <ConnectedSystemsPanel />

      {/* Network Partners - Clickable */}
      <div className="module-panel">
        <div className="module-header">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Network Partners</span>
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          {PARTNERS.map((partner, i) => (
            <button
              key={partner.name}
              onClick={() => { setModalType("partner"); setModalIndex(i); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded border border-border bg-card hover:border-primary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-medium text-foreground">{partner.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">{partner.contractRate}</span>
                <span className="text-[10px] font-mono text-primary">+{partner.aiRoutingImpact}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Marketplace Solutions - Clickable */}
      <div className="module-panel">
        <div className="module-header">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Marketplace Solutions</span>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {SOLUTIONS.map((solution, i) => (
            <button
              key={solution.name}
              onClick={() => { setModalType("solution"); setModalIndex(i); }}
              className="w-full text-left px-3 py-2 rounded border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-foreground">{solution.name}</span>
                <span className="text-[10px] font-mono text-primary">{solution.adoption}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full reflect-gradient transition-all" style={{ width: `${solution.adoption}%` }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <InsightCard>
        Combined ROI of <span className="font-mono text-foreground">{fmtDecimal(combined.roi)}x</span> with
        payback in <span className="font-mono text-foreground">{fmtDecimal(combined.paybackMonths)}</span> months —
        no rip-and-replace required
      </InsightCard>

      <CompetitiveIndex />

      <NetworkDetailModal type={modalType} index={modalIndex} onClose={() => setModalType(null)} />
    </div>
  );
}
