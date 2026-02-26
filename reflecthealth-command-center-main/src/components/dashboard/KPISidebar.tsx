import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useSimulation } from "@/contexts/SimulationContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { CountUpValue } from "./CountUpValue";
import { ExportSummary } from "./ExportSummary";
import { Download, TrendingUp, Users, DollarSign, Clock, Zap, Activity, X } from "lucide-react";

interface KPISidebarProps {
  open: boolean;
  onClose: () => void;
}

export function KPISidebar({ open, onClose }: KPISidebarProps) {
  const { results, mode, platformParams } = useDashboard();
  const { counters, claimsCounters } = useSimulation();
  const { combined, callCenter, claims } = results;
  const [exportOpen, setExportOpen] = useState(false);

  // Blend static ROI model with live simulation deltas for real-time feel
  const liveTotalSavings = combined.totalAnnualSavings + counters.costAvoided + claimsCounters.costAvoided;
  const liveCallSavings = callCenter.annualSavings + counters.costAvoided;
  const liveClaimsSavings = claims.annualSavings + claimsCounters.costAvoided;
  const liveROI = platformParams.annualPlatformCost > 0 ? liveTotalSavings / platformParams.annualPlatformCost : combined.roi;
  const livePayback = liveTotalSavings > 0 ? (platformParams.annualPlatformCost / liveTotalSavings) * 12 : combined.paybackMonths;
  const liveCallFTE = callCenter.fteSaved + counters.fteEquivalent;
  const liveClaimsFTE = claims.fteSaved + claimsCounters.fteImpact;

  const kpis = [
    {
      label: "Total Savings",
      value: liveTotalSavings,
      formatter: fmtCurrency,
      icon: <DollarSign className="h-3.5 w-3.5" />,
      highlight: true,
      arrow: "↑",
      arrowSemantic: "coverage",
    },
    {
      label: "ROI",
      value: liveROI,
      formatter: (n: number) => `${fmtDecimal(n)}x`,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      highlight: true,
      arrow: "↑",
      arrowSemantic: "coverage",
    },
    {
      label: "Payback",
      value: livePayback,
      formatter: (n: number) => `${fmtDecimal(n)} mo`,
      icon: <Clock className="h-3.5 w-3.5" />,
      highlight: false,
      arrow: "↓",
      arrowSemantic: "identity",
    },
    {
      label: "FTE (Calls)",
      value: liveCallFTE,
      formatter: (n: number) => fmtDecimal(n),
      icon: <Users className="h-3.5 w-3.5" />,
      highlight: false,
      arrow: "↓",
      arrowSemantic: "identity",
    },
    {
      label: "FTE (Claims)",
      value: liveClaimsFTE,
      formatter: (n: number) => fmtDecimal(n),
      icon: <Users className="h-3.5 w-3.5" />,
      highlight: false,
      arrow: "↓",
      arrowSemantic: "identity",
    },
    {
      label: "Call Savings",
      value: liveCallSavings,
      formatter: fmtCurrency,
      icon: <Zap className="h-3.5 w-3.5" />,
      highlight: false,
      arrow: "↑",
      arrowSemantic: "coverage",
    },
    {
      label: "Claims Savings",
      value: liveClaimsSavings,
      formatter: fmtCurrency,
      icon: <Zap className="h-3.5 w-3.5" />,
      highlight: false,
      arrow: "↑",
      arrowSemantic: "coverage",
    },
    {
      label: "Platform Investment",
      value: platformParams.annualPlatformCost,
      formatter: fmtCurrency,
      icon: <DollarSign className="h-3.5 w-3.5" />,
      highlight: false,
      arrow: "",
      arrowSemantic: "",
    },
  ];

  if (mode === "internal") {
    kpis.push(
      {
        label: "Manual Cost (Calls)",
        value: callCenter.annualManualCost,
        formatter: fmtCurrency,
        icon: <DollarSign className="h-3.5 w-3.5" />,
        highlight: false,
        arrow: "",
        arrowSemantic: "",
      },
      {
        label: "Manual Cost (Claims)",
        value: claims.annualManualCost,
        formatter: fmtCurrency,
        icon: <DollarSign className="h-3.5 w-3.5" />,
        highlight: false,
        arrow: "",
        arrowSemantic: "",
      }
    );
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-[240px] flex flex-col border-l border-border shadow-xl overflow-y-auto"
        style={{ background: "hsl(230 18% 97%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-semantic-coverage animate-pulse" />
            <span className="type-micro uppercase tracking-[0.15em] reflect-gradient-text">
              Live Command Metrics
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* KPI list */}
        <div className="flex-1 px-3 py-2 space-y-0">
          {kpis.map((kpi) => {
            const arrowColor =
              kpi.arrowSemantic === "coverage"
                ? "text-semantic-coverage"
                : kpi.arrowSemantic === "identity"
                ? "text-semantic-identity"
                : "";

            return (
              <div
                key={kpi.label}
                className={`flex items-start gap-2 py-2.5 border-b border-border/50 last:border-0 ${
                  kpi.highlight ? "reflect-border" : ""
                }`}
              >
                <span className="text-primary mt-0.5 shrink-0">{kpi.icon}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="type-micro text-muted-foreground uppercase tracking-widest leading-tight truncate">
                    {kpi.label}
                  </span>
                  <div className="flex items-end gap-1 mt-0.5">
                    <CountUpValue
                      value={kpi.value}
                      formatter={kpi.formatter}
                      className="type-kpi-value text-foreground"
                    />
                    {kpi.arrow && (
                      <span className={`text-[11px] font-semibold mb-0.5 ${arrowColor}`}>
                        {kpi.arrow}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border/60 shrink-0">
          <button
            onClick={() => setExportOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded reflect-gradient text-white text-[10px] font-semibold hover:opacity-90 transition-opacity"
          >
            <Download className="h-3 w-3" />
            {mode === "internal" ? "Export Internal" : "Export TPA"}
          </button>
        </div>

        <ExportSummary
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          type={mode === "internal" ? "internal" : "tpa"}
        />
      </aside>
    </>
  );
}

/** Trigger button shown in the header / toolbar */
export function KPITriggerButton({ onClick }: { onClick: () => void }) {
  const { counters } = useSimulation();

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-all relative"
      title="Open Live Command Metrics"
    >
      <Activity className="h-3 w-3" />
      Metrics
      {counters.callsDeflected > 0 && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-semantic-coverage animate-pulse" />
      )}
    </button>
  );
}
