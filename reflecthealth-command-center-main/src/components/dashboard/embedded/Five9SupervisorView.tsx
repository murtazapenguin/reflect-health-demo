import { useState } from "react";
import { useSimulation } from "@/contexts/SimulationContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { CountUpValue } from "../CountUpValue";
import { fmtDecimal } from "@/lib/format";
import { Phone, Zap, Clock, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { SupervisorMetricModal } from "../SupervisorMetricModal";

export function Five9SupervisorView() {
  const { events, counters } = useSimulation();
  const { callParams } = useDashboard();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const aiAssistRate = events.length > 0
    ? Math.round((events.filter(e => e.status === "ai-routed" || e.status === "resolved").length / events.length) * 100)
    : 0;

  const escalations = events.filter(e => e.status === "escalated");

  const kpis = [
    { label: "Live Queue", value: Math.min(events.length, 12), icon: Phone, color: "text-five9-accent" },
    { label: "AI Assist Rate", value: aiAssistRate, suffix: "%", icon: Zap, color: "text-emerald-600" },
    { label: "Avg Handle Time", value: callParams.handleTimeMin * (1 - callParams.aiProcessSavingsPct), suffix: " min", icon: Clock, color: "text-five9-accent" },
    { label: "Escalation Alerts", value: escalations.length, icon: AlertTriangle, color: "text-amber-600" },
    { label: "SLA Improvement", value: 23, suffix: "%", icon: TrendingUp, color: "text-emerald-600" },
    { label: "Workforce Impact", value: counters.fteEquivalent, icon: Users, color: "text-five9-accent" },
  ];

  return (
    <div className="p-4 space-y-4 five9-panel-bg h-full overflow-y-auto">
      <div className="text-xs font-semibold text-foreground">Supervisor Dashboard</div>

      {/* KPI Grid - Clickable */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => setSelectedMetric(kpi.label)}
            className="five9-card p-3 space-y-1 text-left hover:border-five9-accent/30 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              <span className="text-[10px] text-five9-muted">{kpi.label}</span>
            </div>
            <div className="text-lg font-bold font-mono text-foreground">
              {typeof kpi.value === "number" && kpi.value % 1 !== 0 ? (
                <CountUpValue value={kpi.value} formatter={(n) => fmtDecimal(n, 2)} />
              ) : (
                kpi.value
              )}
              {kpi.suffix && <span className="text-xs text-five9-muted">{kpi.suffix}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Live Call Queue */}
      <div className="five9-card p-3 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-five9-muted">
          Live Call Queue
        </div>
        <div className="space-y-1">
          {events.slice(0, 8).map((evt) => {
            const isAI = evt.status === "ai-routed" || evt.status === "resolved";
            return (
              <div key={evt.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isAI ? "bg-emerald-500" : evt.status === "escalated" ? "bg-amber-500" : "bg-five9-accent"
                  }`} />
                  <span className="text-[10px] text-foreground">{evt.callerType} — {evt.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-five9-muted">{evt.payer}</span>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                    isAI ? "text-emerald-700 bg-emerald-50" : evt.status === "escalated" ? "text-amber-700 bg-amber-50" : "text-five9-muted bg-secondary"
                  }`}>
                    {isAI ? "AI Handled" : evt.status === "escalated" ? "Escalated" : "Active"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Escalation Alerts */}
      {escalations.length > 0 && (
        <div className="five9-card p-3 space-y-2 border-amber-500/20">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Escalation Alerts
          </div>
          {escalations.slice(0, 3).map((evt) => (
            <div key={evt.id} className="text-[10px] text-amber-600 flex items-center gap-1.5">
              <span>•</span>
              <span>{evt.callerType} — {evt.reason} ({evt.payer}) — Confidence: {evt.aiConfidence}%</span>
            </div>
          ))}
        </div>
      )}

      <SupervisorMetricModal metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
    </div>
  );
}
