import { useState } from "react";
import { useSimulation, type SimEvent, type ClaimsEvent, type NetworkEvent, type ROIEvent } from "@/contexts/SimulationContext";
import { useDashboard, type DashboardTab } from "@/contexts/DashboardContext";
import { CountUpValue } from "./CountUpValue";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { Phone, FileText, Globe, TrendingUp, Zap, Users, DollarSign, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle, Mic } from "lucide-react";
import { InteractionDetailModal } from "./InteractionDetailModal";

/* ─── Tab Config ─── */

const TAB_CONFIG: Record<DashboardTab, {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  pipelineStages: string[];
}> = {
  contact: {
    title: "Intake & Identity Stream",
    subtitle: "Identity Verification & Eligibility Automation",
    icon: <Phone className="h-3.5 w-3.5" />,
    pipelineStages: ["Incoming", "Identity Verification", "Eligibility Lookup", "Coverage Check", "Response Generation", "Resolved"],
  },
  claims: {
    title: "Claims & Coverage Operations Stream",
    subtitle: "Adjudication & Review Intelligence",
    icon: <FileText className="h-3.5 w-3.5" />,
    pipelineStages: ["Claim Intake", "Code Extraction", "Policy Mapping", "Fraud Check", "Adjudication", "Payment Decision"],
  },
  network: {
    title: "Network & Connectivity Stream",
    subtitle: "Contract & Ecosystem Optimization",
    icon: <Globe className="h-3.5 w-3.5" />,
    pipelineStages: ["Request", "Network Match", "Contract Optimization", "Coverage Validation", "Cost Calculation", "Outcome"],
  },
  roi: {
    title: "Financial Impact Engine",
    subtitle: "Financial Performance Modeling",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    pipelineStages: ["Operational Event", "Financial Attribution", "Margin Impact", "ROI Calculation", "Forecast Update"],
  },
  intelligence: {
    title: "Call Intelligence Engine",
    subtitle: "Upload → Transcribe → Analyze → Automate",
    icon: <Zap className="h-3.5 w-3.5" />,
    pipelineStages: ["Audio Upload", "STT Transcription", "Intent Detection", "AI Analysis", "Scenario Creation", "KB Trained"],
  },
  agent: {
    title: "Live Voice Agent",
    subtitle: "In-Browser Conversational AI",
    icon: <Mic className="h-3.5 w-3.5" />,
    pipelineStages: ["Mic Input", "Speech-to-Text", "Intent Detection", "Backend Lookup", "Response Generation", "Text-to-Speech"],
  },
};

/* ─── Contact Feed ─── */

function ContactFeed() {
  const { events } = useSimulation();
  const [selectedEvent, setSelectedEvent] = useState<SimEvent | null>(null);

  const STATUS_CONFIG = {
    "ai-routed": { label: "Routed to AI", className: "text-primary bg-primary/10 status-badge-pulse" },
    "escalated": { label: "Escalated", className: "text-amber-600 bg-amber-50 status-badge-pulse" },
    "resolved": { label: "Resolved", className: "text-emerald-600 bg-emerald-50 status-badge-pulse" },
    "in-progress": { label: "In Progress", className: "text-muted-foreground bg-secondary" },
  };

  return (
    <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
      <span className="type-micro uppercase tracking-[0.15em] text-muted-foreground section-header-accent mb-1">Live Event Feed</span>
      {events.slice(0, 6).map((evt) => {
        const status = STATUS_CONFIG[evt.status];
        return (
          <button key={evt.id} onClick={() => setSelectedEvent(evt)}
            className="feed-item-enter flex items-center justify-between gap-2 px-2.5 py-2 rounded border border-border bg-card hover:border-primary/30 transition-colors text-left w-full">
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="h-3 w-3 text-primary shrink-0" />
              <span className="type-body-lg font-medium text-foreground truncate" style={{ fontSize: "13px" }}>
                <span className="text-muted-foreground">Incoming:</span> {evt.callerType} — {evt.reason} — {evt.payer}
              </span>
            </div>
            <span className={`type-micro font-medium px-1.5 py-0.5 rounded-full shrink-0 status-badge-pulse ${status.className}`}>{status.label}</span>
          </button>
        );
      })}
      <InteractionDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

/* ─── Claims Feed ─── */

function ClaimsFeed() {
  const { claimsEvents } = useSimulation();
  const statusColors = { auto: "text-emerald-600 bg-emerald-50", manual: "text-amber-600 bg-amber-50", exception: "text-red-500 bg-red-50" };
  const statusLabels = { auto: "Auto", manual: "Manual", exception: "Exception" };

  return (
    <div className="flex flex-col gap-1 overflow-hidden max-h-[200px]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">Live Claims Feed</span>
      {claimsEvents.slice(0, 6).map((evt) => (
        <div key={evt.id} className="feed-item-enter flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-border bg-card text-left w-full">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] text-foreground truncate">
              {evt.type} — <span className="font-mono text-muted-foreground">{evt.claimId}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-mono text-muted-foreground">{Math.round(evt.confidence)}%</span>
            <span className="text-[9px] font-mono text-muted-foreground">{evt.adjudicationTimeSec.toFixed(1)}s</span>
            {evt.manualReviewAvoided ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[evt.status]}`}>{statusLabels[evt.status]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Network Feed ─── */

function NetworkFeed() {
  const { networkEvents } = useSimulation();

  return (
    <div className="flex flex-col gap-1 overflow-hidden max-h-[200px]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">Live Network Feed</span>
      {networkEvents.slice(0, 6).map((evt) => (
        <div key={evt.id} className="feed-item-enter flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-border bg-card text-left w-full">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] text-foreground truncate">{evt.type} — <span className="text-muted-foreground">{evt.network}</span></span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-mono text-emerald-600">${evt.savings}</span>
            <span className="text-[9px] text-muted-foreground">{evt.planImpact}</span>
            <span className="text-[9px] text-muted-foreground">{evt.memberImpact}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── ROI Feed ─── */

function ROIFeed() {
  const { roiEvents } = useSimulation();

  return (
    <div className="flex flex-col gap-1 overflow-hidden max-h-[200px]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">Live Financial Feed</span>
      {roiEvents.slice(0, 6).map((evt) => (
        <div key={evt.id} className="feed-item-enter flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-border bg-card text-left w-full">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] text-foreground truncate">{evt.type}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-mono text-emerald-600">${evt.value.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground">{evt.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Shared Pipeline ─── */

function Pipeline({ stages, pipeline }: { stages: string[]; pipeline: { activeStage: number; confidence: number; resolutionTime: number; outcome: string } }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="type-micro uppercase tracking-[0.15em] text-muted-foreground section-header-accent">AI Orchestration Flow</span>
      <div className="flow-bg rounded-lg border border-border flex flex-col gap-0" style={{ padding: "20px" }}>
        {/* Step chips */}
        <div className="flex items-center gap-1 flex-wrap" style={{ gap: "8px" }}>
          {stages.map((stage, i) => (
            <div key={stage} className="flex items-center shrink-0" style={{ gap: "4px" }}>
              <div className={`rounded transition-all duration-300 font-medium ${
                i <= pipeline.activeStage ? "reflect-gradient text-white" : "bg-secondary text-muted-foreground"
              }`} style={{ padding: "8px 12px", fontSize: "13px", fontWeight: 500, height: "32px", display: "flex", alignItems: "center" }}>
                {stage}
              </div>
              {i < stages.length - 1 && (
                <ArrowRight className={`shrink-0 transition-colors ${i < pipeline.activeStage ? "text-primary" : "text-muted-foreground/30"}`} style={{ width: "10px", height: "10px" }} />
              )}
            </div>
          ))}
        </div>
        {/* Divider */}
        <div className="border-t border-border" style={{ marginTop: "16px", marginBottom: "16px" }} />
        {/* Metadata row */}
        <div className="flex items-center gap-4" style={{ alignSelf: "flex-start", flexGrow: 0 }}>
          <span className="type-body">Confidence: <span className="font-mono font-semibold text-foreground">{pipeline.confidence}%</span></span>
          <span className="type-body">Processing: <span className="font-mono font-semibold text-foreground">{pipeline.resolutionTime}s</span></span>
          <span className="type-body">Outcome: <span className={`font-semibold ${pipeline.outcome === "Escalated" || pipeline.outcome === "Exception" ? "text-amber-600" : "text-primary"}`}>{pipeline.outcome}</span></span>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab-Specific Metrics ─── */

function ContactMetrics() {
  const { counters } = useSimulation();
  const items = [
    { label: "Calls Orchestrated", value: counters.callsDeflected, formatter: (n: number) => Math.round(n).toString(), icon: <Zap className="h-3 w-3" /> },
    { label: "Minutes Saved", value: counters.manualMinutesSaved, formatter: (n: number) => fmtDecimal(n, 0), icon: <Phone className="h-3 w-3" /> },
    { label: "Cost Impact", value: counters.costAvoided, formatter: fmtCurrency, icon: <DollarSign className="h-3 w-3" /> },
    { label: "Workforce Impact", value: counters.fteEquivalent, formatter: (n: number) => fmtDecimal(n, 2), icon: <Users className="h-3 w-3" /> },
  ];
  return <MetricsGrid items={items} />;
}

function ClaimsMetrics() {
  const { claimsCounters } = useSimulation();
  const items = [
    { label: "Auto-Adjudicated", value: claimsCounters.autoAdjudicated, formatter: (n: number) => Math.round(n).toString(), icon: <CheckCircle className="h-3 w-3" /> },
    { label: "Reviews Avoided", value: claimsCounters.manualReviewsAvoided, formatter: (n: number) => Math.round(n).toString(), icon: <ShieldCheck className="h-3 w-3" /> },
    { label: "Cost Impact", value: claimsCounters.costAvoided, formatter: fmtCurrency, icon: <DollarSign className="h-3 w-3" /> },
    { label: "Cycle Time ↓", value: claimsCounters.cycleTimeReductionPct, formatter: (n: number) => `${fmtDecimal(n, 0)}%`, icon: <Zap className="h-3 w-3" /> },
    { label: "Error Rate ↓", value: claimsCounters.errorRateReductionPct, formatter: (n: number) => `${fmtDecimal(n, 0)}%`, icon: <AlertTriangle className="h-3 w-3" /> },
    { label: "Workforce Impact", value: claimsCounters.fteImpact, formatter: (n: number) => fmtDecimal(n, 2), icon: <Users className="h-3 w-3" /> },
  ];
  return <MetricsGrid items={items} />;
}

function NetworkMetrics() {
  const { networkCounters } = useSimulation();
  const items = [
    { label: "Savings Generated", value: networkCounters.savingsGenerated, formatter: fmtCurrency, icon: <DollarSign className="h-3 w-3" /> },
    { label: "OON Avoidance", value: networkCounters.oonAvoidanceRate, formatter: (n: number) => `${fmtDecimal(n, 0)}%`, icon: <ShieldCheck className="h-3 w-3" /> },
    { label: "Marketplace ↑", value: networkCounters.marketplaceUtilLift, formatter: (n: number) => `${fmtDecimal(n, 0)}%`, icon: <TrendingUp className="h-3 w-3" /> },
    { label: "PMPM ↓", value: networkCounters.pmpmReduction, formatter: (n: number) => `$${fmtDecimal(n, 2)}`, icon: <DollarSign className="h-3 w-3" /> },
    { label: "Member Disruption ↓", value: networkCounters.memberDisruptionReductionPct, formatter: (n: number) => `${fmtDecimal(n, 0)}%`, icon: <Users className="h-3 w-3" /> },
  ];
  return <MetricsGrid items={items} />;
}

function ROIMetrics() {
  const { results, platformParams } = useDashboard();
  const { combined, callCenter, claims } = results;
  const items = [
    { label: "Total Savings", value: combined.totalAnnualSavings, formatter: fmtCurrency, icon: <DollarSign className="h-3 w-3" /> },
    { label: "ROI Multiple", value: combined.roi, formatter: (n: number) => `${fmtDecimal(n, 1)}×`, icon: <TrendingUp className="h-3 w-3" /> },
    { label: "Payback", value: combined.paybackMonths, formatter: (n: number) => `${fmtDecimal(n, 1)} mo`, icon: <Zap className="h-3 w-3" /> },
    { label: "FTE (Calls)", value: callCenter.fteSaved, formatter: (n: number) => fmtDecimal(n, 1), icon: <Users className="h-3 w-3" /> },
    { label: "FTE (Claims)", value: claims.fteSaved, formatter: (n: number) => fmtDecimal(n, 1), icon: <Users className="h-3 w-3" /> },
  ];
  return <MetricsGrid items={items} />;
}

function MetricsGrid({ items }: { items: { label: string; value: number; formatter: (n: number) => string; icon: React.ReactNode }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="type-micro uppercase tracking-[0.15em] text-muted-foreground section-header-accent">Live Impact (Today)</span>
      <div className={`grid ${items.length > 4 ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-center gap-1 p-2.5 reflect-border rounded-2xl"
            style={{ background: "hsl(335 80% 98%)", border: "1px solid hsl(335 60% 91%)", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-primary">{item.icon}</span>
              <span className="type-micro text-muted-foreground uppercase">{item.label}</span>
            </div>
            <CountUpValue value={item.value} formatter={item.formatter} className="text-[22px] font-bold font-mono text-foreground tracking-tight" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function LiveOrchestration() {
  const { activeTab } = useDashboard();
  const sim = useSimulation();
  const config = TAB_CONFIG[activeTab];

  const feedMap: Record<DashboardTab, React.ReactNode> = {
    contact: <ContactFeed />,
    claims: <ClaimsFeed />,
    network: <NetworkFeed />,
    roi: <ROIFeed />,
    intelligence: <ContactFeed />,
  };

  const pipelineMap: Record<DashboardTab, { activeStage: number; confidence: number; resolutionTime: number; outcome: string }> = {
    contact: sim.pipeline,
    claims: sim.claimsPipeline,
    network: sim.networkPipeline,
    roi: sim.roiPipeline,
    intelligence: sim.pipeline,
  };

  const metricsMap: Record<DashboardTab, React.ReactNode> = {
    contact: <ContactMetrics />,
    claims: <ClaimsMetrics />,
    network: <NetworkMetrics />,
    roi: <ROIMetrics />,
    intelligence: <ContactMetrics />,
  };

  return (
    <div className="section-container">
      <div className="module-panel p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="status-dot" />
          <span className="text-primary">{config.icon}</span>
          <div>
            <span className="type-h3 text-foreground">{config.title}</span>
            <span className="ml-2 type-body">{config.subtitle}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="flex flex-col">{feedMap[activeTab]}</div>
          <div className="flex flex-col"><Pipeline stages={config.pipelineStages} pipeline={pipelineMap[activeTab]} /></div>
          <div className="flex flex-col">{metricsMap[activeTab]}</div>
        </div>
      </div>
    </div>
  );
}
