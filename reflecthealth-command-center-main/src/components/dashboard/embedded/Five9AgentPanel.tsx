import { useSimulation } from "@/contexts/SimulationContext";
import { Phone, User, Building2, Clock } from "lucide-react";

export function Five9AgentPanel() {
  const { events } = useSimulation();
  const activeEvent = events[0];

  return (
    <div className="p-3 space-y-3 five9-panel-bg h-full">
      <div className="type-h3 text-foreground">
        Active Interactions
      </div>

      {activeEvent ? (
        <div className="space-y-2">
          {/* Current call card */}
          <div className="five9-card p-3 space-y-2 five9-active-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-five9-accent" />
                <span className="type-h3 text-foreground">Inbound Voice</span>
              </div>
              <span className="type-micro font-mono text-five9-accent status-badge-pulse">ACTIVE</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-five9-muted" />
                <span className="type-body">Caller:</span>
                <span className="type-body text-foreground font-medium">{activeEvent.callerType}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-five9-muted" />
                <span className="type-body">Payer:</span>
                <span className="type-body text-foreground font-medium">{activeEvent.payer}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-five9-muted" />
                <span className="type-body">Reason:</span>
                <span className="type-body text-foreground font-medium">{activeEvent.reason}</span>
              </div>
            </div>
          </div>

          {/* Queue */}
          <div className="type-micro uppercase tracking-[0.12em] text-five9-muted mt-3">
            Queue ({Math.min(events.length - 1, 5)})
          </div>
          {events.slice(1, 6).map((evt) => (
            <div key={evt.id} className="five9-card p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Phone className="h-2.5 w-2.5 text-five9-muted" />
                <span className="type-body text-foreground">{evt.callerType} — {evt.reason}</span>
              </div>
              <span className="type-micro text-five9-muted">{evt.payer}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="type-body text-five9-muted text-center py-8">
          Waiting for incoming calls...
        </div>
      )}
    </div>
  );
}
