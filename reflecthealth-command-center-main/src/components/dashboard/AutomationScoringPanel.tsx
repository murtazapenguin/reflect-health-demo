import { useState } from "react";
import {
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle,
  HelpCircle, TrendingUp, DollarSign, Clock, Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ScoringBreakdown {
  intent_clarity: { score: number; label: string; reasoning: string };
  data_availability: { score: number; label: string; reasoning: string };
  workflow_complexity: { score: number; label: string; reasoning: string };
  compliance_risk: { score: number; label: string; reasoning: string };
  sentiment_sensitivity: { score: number; label: string; reasoning: string };
  automation_tier: string;
  estimated_cost_reduction_pct: number;
  estimated_aht_reduction_pct: number;
  confidence_label: string;
  why_summary: string;
}

interface Props {
  score: number;
  breakdown: ScoringBreakdown;
  callType: string;
  monthlyCalls?: number;
}

// ─── Tier config ──────────────────────────────────────────────────────────────
function tierConfig(tier: string) {
  if (tier === "Fully Automatable") return { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2, iconColor: "text-emerald-600", badge: "✅ Fully Automatable" };
  if (tier === "Hybrid AI + Human Assist") return { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: HelpCircle, iconColor: "text-blue-500", badge: "⚙ Hybrid AI + Human Assist" };
  if (tier === "AI Prep + Human Resolution") return { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle, iconColor: "text-amber-500", badge: "👩‍💼 AI Prep + Human Resolution" };
  return { color: "text-destructive", bg: "bg-red-50", border: "border-red-200", icon: XCircle, iconColor: "text-destructive", badge: "❌ Human Required" };
}

// ─── Category row ─────────────────────────────────────────────────────────────
function CategoryBar({ name, score, label, reasoning }: { name: string; score: number; label: string; reasoning: string }) {
  const pct = (score / 20) * 100;
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-foreground">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground">{label}</span>
          <span className="text-[10px] font-bold font-mono text-foreground">{score}/20</span>
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-muted-foreground leading-relaxed">{reasoning}</p>
    </div>
  );
}

// ─── Radar Viz (pure CSS polygon, no deps) ────────────────────────────────────
function RadarChart({ scores }: { scores: number[] }) {
  const cx = 80, cy = 80, r = 60;
  const angles = scores.map((_, i) => (i * 360) / scores.length - 90);
  const toXY = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy + radius * Math.sin((angle * Math.PI) / 180),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = scores.map((s, i) => toXY(angles[i], (s / 20) * r));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const labels = ["Intent", "Data", "Workflow", "Compliance", "Sentiment"];
  const labelOffset = 18;

  return (
    <svg width={160} height={160} className="mx-auto">
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = angles.map(a => toXY(a, r * level));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
        return <path key={level} d={path} fill="none" stroke="hsl(var(--border))" strokeWidth={0.5} />;
      })}
      {/* Spokes */}
      {angles.map((a, i) => {
        const end = toXY(a, r);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="hsl(var(--border))" strokeWidth={0.5} />;
      })}
      {/* Data polygon */}
      <path d={dataPath} fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={1.5} />
      {/* Dots */}
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="hsl(var(--primary))" />)}
      {/* Labels */}
      {angles.map((a, i) => {
        const pos = toXY(a, r + labelOffset);
        return (
          <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fill="hsl(var(--muted-foreground))">
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AutomationScoringPanel({ score, breakdown, callType, monthlyCalls = 5000 }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const tc = tierConfig(breakdown.automation_tier);
  const TierIcon = tc.icon;

  const costPerCall = 4.50;
  const aiCostPerCall = breakdown.automation_tier === "Fully Automatable" ? 0.65 :
    breakdown.automation_tier === "Hybrid AI + Human Assist" ? costPerCall * (1 - breakdown.estimated_cost_reduction_pct / 100) :
    breakdown.automation_tier === "AI Prep + Human Resolution" ? costPerCall * 0.7 : costPerCall;
  const savedPerCall = costPerCall - aiCostPerCall;
  const annualSavings = savedPerCall * monthlyCalls * 12;

  const radarScores = [
    breakdown.intent_clarity.score,
    breakdown.data_availability.score,
    breakdown.workflow_complexity.score,
    breakdown.compliance_risk.score,
    breakdown.sentiment_sensitivity.score,
  ];

  // Score gauge color
  const gaugeColor = score >= 80 ? "text-emerald-700" : score >= 60 ? "text-blue-700" : score >= 40 ? "text-amber-700" : "text-destructive";
  const gaugeBg = score >= 80 ? "from-emerald-500 to-emerald-400" : score >= 60 ? "from-blue-500 to-blue-400" : score >= 40 ? "from-amber-500 to-amber-400" : "from-red-600 to-red-500";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Automation Feasibility Index — {callType}</span>
        </div>
        <span className="text-[9px] font-semibold text-primary border border-primary/30 bg-primary/5 rounded px-1.5 py-0.5">
          Deterministic Operational Scoring
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Score + Tier */}
        <div className="flex items-center gap-4">
          {/* Score gauge */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width={88} height={88} viewBox="0 0 88 88">
              <circle cx={44} cy={44} r={38} fill="none" stroke="hsl(var(--border))" strokeWidth={7} />
              <circle cx={44} cy={44} r={38} fill="none"
                stroke={`url(#gauge-grad)`}
                strokeWidth={7}
                strokeDasharray={`${(score / 100) * 238.76} 238.76`}
                strokeLinecap="round"
                transform="rotate(-90 44 44)" />
              <defs>
                <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={score >= 80 ? "#059669" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#dc2626"} />
                  <stop offset="100%" stopColor={score >= 80 ? "#34d399" : score >= 60 ? "#60a5fa" : score >= 40 ? "#fcd34d" : "#f87171"} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold font-mono ${gaugeColor}`}>{score}</span>
              <span className="text-[8px] text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Tier + KPIs */}
          <div className="flex-1 space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${tc.bg} ${tc.border}`}>
              <TierIcon className={`h-3 w-3 ${tc.iconColor}`} />
              <span className={`text-[10px] font-semibold ${tc.color}`}>{tc.badge}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md bg-secondary/40 p-2 text-center">
                <div className="text-xs font-bold text-emerald-600">{breakdown.estimated_cost_reduction_pct}%</div>
                <div className="text-[8px] text-muted-foreground">Cost Reduction</div>
              </div>
              <div className="rounded-md bg-secondary/40 p-2 text-center">
                <div className="text-xs font-bold text-blue-600">{breakdown.estimated_aht_reduction_pct}%</div>
                <div className="text-[8px] text-muted-foreground">AHT Reduction</div>
              </div>
            </div>
            <div className="text-[9px] text-muted-foreground font-medium">{breakdown.confidence_label}</div>
          </div>

          {/* Radar */}
          <div className="shrink-0">
            <RadarChart scores={radarScores} />
          </div>
        </div>

        {/* Category breakdown bars */}
        <div className="space-y-3">
          <div className="text-[10px] font-semibold text-foreground">5-Category Operational Scoring</div>
          <CategoryBar name="Intent Clarity" score={breakdown.intent_clarity.score} label={breakdown.intent_clarity.label} reasoning={breakdown.intent_clarity.reasoning} />
          <CategoryBar name="Data Availability" score={breakdown.data_availability.score} label={breakdown.data_availability.label} reasoning={breakdown.data_availability.reasoning} />
          <CategoryBar name="Workflow Complexity" score={breakdown.workflow_complexity.score} label={breakdown.workflow_complexity.label} reasoning={breakdown.workflow_complexity.reasoning} />
          <CategoryBar name="Compliance & Risk Sensitivity" score={breakdown.compliance_risk.score} label={breakdown.compliance_risk.label} reasoning={breakdown.compliance_risk.reasoning} />
          <CategoryBar name="Sentiment & Human Sensitivity" score={breakdown.sentiment_sensitivity.score} label={breakdown.sentiment_sensitivity.label} reasoning={breakdown.sentiment_sensitivity.reasoning} />
        </div>

        {/* ROI per tier */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-primary" /> ROI Impact — {breakdown.automation_tier}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-card border border-border p-2">
              <div className="text-[11px] font-bold text-destructive">${costPerCall.toFixed(2)}</div>
              <div className="text-[8px] text-muted-foreground">Manual Cost</div>
            </div>
            <div className="rounded-md bg-card border border-emerald-200 p-2">
              <div className="text-[11px] font-bold text-emerald-700">${aiCostPerCall.toFixed(2)}</div>
              <div className="text-[8px] text-muted-foreground">AI Cost</div>
            </div>
            <div className="rounded-md bg-card border border-emerald-200 p-2">
              <div className="text-[11px] font-bold text-emerald-700">${savedPerCall.toFixed(2)}</div>
              <div className="text-[8px] text-muted-foreground">Saved / Call</div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] text-muted-foreground">At {monthlyCalls.toLocaleString()} calls/mo:</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700">${(annualSavings / 1000).toFixed(0)}K annual savings</span>
          </div>
        </div>

        {/* AHT Reduction */}
        <div className="rounded-md border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-foreground">Handle Time Impact</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-destructive/40 rounded-full" style={{ width: "100%" }} />
            </div>
            <span className="text-[9px] text-muted-foreground shrink-0">Human: ~6 min</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${100 - breakdown.estimated_aht_reduction_pct}%` }} />
            </div>
            <span className="text-[9px] text-emerald-700 shrink-0 font-medium">
              AI: ~{Math.round(360 * (1 - breakdown.estimated_aht_reduction_pct / 100) / 60 * 10) / 10} min
            </span>
          </div>
        </div>

        {/* Why? Expandable */}
        <div className="rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setWhyOpen(!whyOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-secondary/20 hover:bg-secondary/40 transition-colors"
          >
            <span className="text-[10px] font-semibold text-foreground">💡 Why this score? — Executive Reasoning</span>
            {whyOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>
          {whyOpen && (
            <div className="px-3 py-2.5 bg-card border-t border-border">
              <p className="text-[10px] text-muted-foreground leading-relaxed">{breakdown.why_summary}</p>
              <div className="mt-2.5 space-y-1.5">
                <div className="text-[9px] font-semibold text-foreground uppercase tracking-wide">Enterprise Positioning</div>
                {[
                  "Deterministic Operational Scoring — not LLM confidence",
                  "Workflow Automation Feasibility Index — 5-axis weighted model",
                  "Compliance-Aware Decision Framework — HIPAA & regulatory aligned",
                  "Enterprise Call Deflection Science — data-backed automation claim",
                ].map(pt => (
                  <div key={pt} className="flex items-start gap-1.5 text-[9px] text-muted-foreground">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 mt-0.5 shrink-0" />
                    {pt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
