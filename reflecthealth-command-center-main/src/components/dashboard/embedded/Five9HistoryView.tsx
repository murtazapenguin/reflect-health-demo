import { useState } from "react";
import { DetailModal } from "../DetailModal";
import { Phone, Mail, MessageSquare, Clock, Zap, CheckCircle2, AlertTriangle } from "lucide-react";

interface HistoryItem {
  id: string;
  type: "call" | "email" | "chat";
  caller: string;
  reason: string;
  payer: string;
  aiAssisted: boolean;
  outcome: "resolved" | "escalated";
  duration: string;
  timeSaved: string;
  timestamp: string;
}

const HISTORY: HistoryItem[] = [
  { id: "h1", type: "call", caller: "Provider", reason: "Claims Status", payer: "BCBS", aiAssisted: true, outcome: "resolved", duration: "2:14", timeSaved: "5.2 min", timestamp: "10:42 AM" },
  { id: "h2", type: "email", caller: "Member", reason: "ID Card Request", payer: "Aetna", aiAssisted: true, outcome: "resolved", duration: "1:08", timeSaved: "6.8 min", timestamp: "10:28 AM" },
  { id: "h3", type: "call", caller: "Provider", reason: "Eligibility Inquiry", payer: "UHC", aiAssisted: false, outcome: "escalated", duration: "8:32", timeSaved: "0 min", timestamp: "10:15 AM" },
  { id: "h4", type: "chat", caller: "Member", reason: "Benefits Verification", payer: "Cigna", aiAssisted: true, outcome: "resolved", duration: "1:45", timeSaved: "4.5 min", timestamp: "9:58 AM" },
  { id: "h5", type: "call", caller: "Provider", reason: "PA Status", payer: "Humana", aiAssisted: true, outcome: "resolved", duration: "2:52", timeSaved: "5.8 min", timestamp: "9:41 AM" },
  { id: "h6", type: "call", caller: "Member", reason: "COB Verification", payer: "BCBS", aiAssisted: true, outcome: "resolved", duration: "1:30", timeSaved: "6.1 min", timestamp: "9:22 AM" },
];

const typeIcon = { call: Phone, email: Mail, chat: MessageSquare };

export function Five9HistoryView() {
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  return (
    <div className="p-4 five9-panel-bg h-full overflow-y-auto space-y-3">
      <div className="text-xs font-semibold text-foreground">Interaction History</div>

      <div className="space-y-1">
        {HISTORY.map(item => {
          const Icon = typeIcon[item.type];
          return (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="w-full flex items-center justify-between p-2.5 rounded border border-border bg-card hover:border-five9-accent/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 text-five9-accent" />
                <div>
                  <span className="text-[11px] font-medium text-foreground">{item.caller} — {item.reason}</span>
                  <span className="text-[9px] text-five9-muted block">{item.payer} · {item.timestamp}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.aiAssisted && <Zap className="h-3 w-3 text-five9-accent" />}
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                  item.outcome === "resolved" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                }`}>
                  {item.outcome === "resolved" ? "Resolved" : "Escalated"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      <DetailModal open={!!selected} onClose={() => setSelected(null)} title="Past Interaction">
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                <span className="text-[9px] text-muted-foreground uppercase block">AI Assisted</span>
                <span className="text-sm font-bold font-mono text-foreground">{selected.aiAssisted ? "Yes" : "No"}</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                <span className="text-[9px] text-muted-foreground uppercase block">Outcome</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {selected.outcome === "resolved" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                  <span className={`text-sm font-bold ${selected.outcome === "resolved" ? "text-emerald-600" : "text-amber-600"}`}>
                    {selected.outcome === "resolved" ? "Resolved" : "Escalated"}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                <Clock className="h-3.5 w-3.5 text-five9-accent mx-auto mb-1" />
                <span className="text-[9px] text-muted-foreground block">Duration</span>
                <span className="text-sm font-bold font-mono text-foreground">{selected.duration}</span>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <Zap className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                <span className="text-[9px] text-muted-foreground block">Time Saved</span>
                <span className="text-sm font-bold font-mono text-primary">{selected.timeSaved}</span>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
