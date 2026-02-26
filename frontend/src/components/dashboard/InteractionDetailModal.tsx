import { DetailModal } from "./DetailModal";
import { type SimEvent } from "@/contexts/SimulationContext";
import { fmtCurrency } from "@/lib/format";
import { useDashboard } from "@/contexts/DashboardContext";
import { Phone, Shield, Zap, Clock, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  event: SimEvent | null;
  onClose: () => void;
}

const PIPELINE_STAGES = ["Intent Classification", "Policy Validation", "System Query", "Response Generation", "Resolution"];

export function InteractionDetailModal({ event, onClose }: Props) {
  const { callParams } = useDashboard();
  if (!event) return null;

  const isDeflected = event.status === "ai-routed" || event.status === "resolved";
  const minutesSaved = isDeflected ? callParams.handleTimeMin * callParams.aiProcessSavingsPct : 0;
  const costAvoided = isDeflected ? (callParams.handleTimeMin / 60) * callParams.agentCostHr * callParams.aiProcessSavingsPct : 0;

  return (
    <DetailModal open={!!event} onClose={onClose} title="Interaction Detail" width="max-w-xl">
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
          <Phone className="h-4 w-4 text-primary" />
          <div>
            <span className="text-xs font-semibold text-foreground">{event.callerType} — {event.reason}</span>
            <span className="text-[10px] text-muted-foreground block">Payer: {event.payer} · {event.timestamp.toLocaleTimeString()}</span>
          </div>
          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isDeflected ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
          }`}>
            {isDeflected ? "AI Resolved" : "Escalated"}
          </span>
        </div>

        {/* Transcript */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Transcript</span>
          <div className="mt-2 space-y-2 text-[11px] text-foreground">
            <p><span className="text-muted-foreground">Caller:</span> Hi, I'm calling about {event.reason.toLowerCase()} for my {event.payer} plan.</p>
            <p><span className="text-primary">AI:</span> I can help with that. Let me look up your information right away.</p>
            <p><span className="text-primary">AI:</span> Based on policy section 7.4, your {event.reason.toLowerCase()} has been processed. {isDeflected ? "Everything looks good, no further action needed." : "I'll need to connect you with a specialist for this case."}</p>
          </div>
        </div>

        {/* AI Pipeline Breakdown */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AI Pipeline</span>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-1">
                <div className="px-2 py-1 rounded text-[9px] font-medium reflect-gradient text-white">{stage}</div>
                {i < PIPELINE_STAGES.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-primary" />}
              </div>
            ))}
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Zap className="h-3 w-3" /> Confidence</div>
            <div className={`text-lg font-bold font-mono ${event.aiConfidence > 80 ? "text-emerald-600" : "text-amber-600"}`}>{event.aiConfidence}%</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> Resolution Time</div>
            <div className="text-lg font-bold font-mono text-foreground">{event.resolutionTimeSec.toFixed(1)}s</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Shield className="h-3 w-3" /> Cost Impact</div>
            <div className="text-lg font-bold font-mono text-primary">{fmtCurrency(costAvoided)}</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {isDeflected ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              Escalation
            </div>
            <div className="text-lg font-bold font-mono text-foreground">{isDeflected ? "No" : "Yes"}</div>
          </div>
        </div>

        {/* Minutes saved */}
        {isDeflected && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <span className="text-[10px] text-muted-foreground">Minutes Saved This Interaction:</span>
            <span className="text-sm font-bold font-mono text-primary ml-2">{minutesSaved.toFixed(1)} min</span>
          </div>
        )}
      </div>
    </DetailModal>
  );
}
