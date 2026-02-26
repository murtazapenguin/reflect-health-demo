import { useState } from "react";
import { useSimulation } from "@/contexts/SimulationContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { DetailModal } from "../DetailModal";
import { User, AlertTriangle, CheckCircle2 } from "lucide-react";
import penguinLogo from "@/assets/penguin-logo.png";

const TRANSCRIPT_LINES = [
  { speaker: "member", text: "Hi, I'm calling about the status of my claim, invoice number 45621." },
  { speaker: "ai", text: "I can help with that. Let me look up your claim status right away." },
  { speaker: "ai", text: "I found your claim. Invoice #45621 was submitted on February 12th and is currently in processing." },
  { speaker: "member", text: "When will it be completed?" },
  { speaker: "ai", text: "Based on the current queue, you should receive a determination within 3–5 business days." },
  { speaker: "member", text: "And what about my eligibility for the specialist visit?" },
  { speaker: "ai", text: "Your plan covers specialist visits with a $30 copay. No prior authorization required for in-network providers." },
];

export function Five9TranscriptPanel() {
  const { events, pipeline } = useSimulation();
  const { callParams } = useDashboard();
  const activeEvent = events[0];
  const isDeflected = activeEvent && (activeEvent.status === "ai-routed" || activeEvent.status === "resolved");
  const confidenceThreshold = callParams.accuracyPct * 100;
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  return (
    <div className="p-3 space-y-3 five9-panel-bg h-full">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-five9-muted">
          AI Transcript + Orchestration
        </div>
        {activeEvent && (
          <button
            onClick={() => setAnalysisModalOpen(true)}
            className="text-[9px] font-mono text-five9-accent hover:underline"
          >
            Confidence: {pipeline.confidence}%
          </button>
        )}
      </div>

      {/* Resolution banner */}
      {activeEvent && pipeline.activeStage >= 5 && (
        <div className={`rounded p-2.5 flex items-center gap-2 text-[11px] font-medium ${
          isDeflected
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700"
            : "bg-amber-500/10 border border-amber-500/20 text-amber-700"
        }`}>
          {isDeflected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolved by AI — No agent intervention required
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              Escalated to agent — Confidence below threshold ({confidenceThreshold.toFixed(0)}%)
            </>
          )}
        </div>
      )}

      {/* Transcript */}
      <div className="space-y-2 flex-1">
        {TRANSCRIPT_LINES.map((line, i) => (
          <div key={i} className={`flex gap-2 ${line.speaker === "ai" ? "flex-row" : "flex-row-reverse"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              line.speaker === "ai" ? "bg-five9-accent/10" : "bg-secondary"
            }`}>
              {line.speaker === "ai" ? (
                <img src={penguinLogo} alt="Penguin AI" className="h-4 w-4 object-contain" />
              ) : (
                <User className="h-3 w-3 text-five9-muted" />
              )}
            </div>
            <div className={`five9-card p-2 max-w-[80%] ${
              line.speaker === "ai" ? "five9-active-border" : ""
            }`}>
              <p className="text-[11px] text-foreground leading-relaxed">{line.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI highlights - Clickable */}
      {activeEvent && (
        <button
          onClick={() => setAnalysisModalOpen(true)}
          className="five9-card p-2.5 space-y-1.5 w-full text-left hover:border-five9-accent/30 transition-colors"
        >
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-five9-muted">
            AI Analysis
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <div className="text-five9-muted">Intent:</div>
            <div className="font-medium text-foreground">{activeEvent.reason}</div>
            <div className="text-five9-muted">Policy Ref:</div>
            <div className="font-medium text-foreground">Section 7.4</div>
            <div className="text-five9-muted">Confidence:</div>
            <div className={`font-medium font-mono ${pipeline.confidence > confidenceThreshold ? "text-emerald-600" : "text-amber-600"}`}>
              {pipeline.confidence}%
            </div>
            <div className="text-five9-muted">Recommendation:</div>
            <div className="font-medium text-foreground">{pipeline.outcome === "Deflected" ? "Auto-resolve" : "Escalate"}</div>
          </div>
        </button>
      )}

      {/* AI Analysis Modal */}
      <DetailModal open={analysisModalOpen} onClose={() => setAnalysisModalOpen(false)} title="AI Analysis Detail">
        {activeEvent && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-[9px] text-muted-foreground uppercase block">Intent</span>
                <span className="text-sm font-semibold text-foreground">{activeEvent.reason}</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-[9px] text-muted-foreground uppercase block">Caller</span>
                <span className="text-sm font-semibold text-foreground">{activeEvent.callerType} — {activeEvent.payer}</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-[9px] text-muted-foreground uppercase block">Confidence</span>
                <span className={`text-lg font-bold font-mono ${pipeline.confidence > confidenceThreshold ? "text-emerald-600" : "text-amber-600"}`}>
                  {pipeline.confidence}%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-[9px] text-muted-foreground uppercase block">Resolution</span>
                <span className="text-lg font-bold font-mono text-foreground">{pipeline.resolutionTime}s</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Policy Reference</span>
              <p className="text-[11px] text-foreground mt-1 leading-relaxed">
                Section 7.4 — {activeEvent.reason} procedures for {activeEvent.payer} plans. Coverage verified against
                current contract terms. {pipeline.outcome === "Deflected" ? "Automated resolution permitted." : "Manual review required per escalation policy."}
              </p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
