import { useState, useEffect } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ShieldCheck, AlertTriangle, Zap, Users, Scale, Brain } from "lucide-react";

type RoutingOutcome = "Auto Resolve" | "Tier 1 Agent" | "Supervisor" | "Compliance";

function useSimulatedGovernance() {
  const [data, setData] = useState({
    aiConfidence: 94,
    policyAmbiguity: "Low" as "Low" | "Medium" | "High",
    fraudRisk: "Low" as "Low" | "Medium" | "High",
    sentimentRisk: "Neutral" as "Positive" | "Neutral" | "Negative",
    routing: "Auto Resolve" as RoutingOutcome,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const conf = 65 + Math.random() * 33;
      const ambiguity = conf > 90 ? "Low" : conf > 78 ? "Medium" : "High";
      const fraud = Math.random() > 0.85 ? "High" : Math.random() > 0.5 ? "Low" : "Medium";
      const sentiment = Math.random() > 0.8 ? "Negative" : Math.random() > 0.4 ? "Neutral" : "Positive";
      let routing: RoutingOutcome = "Auto Resolve";
      if (conf < 70 || fraud === "High") routing = "Compliance";
      else if (conf < 78 || ambiguity === "High") routing = "Supervisor";
      else if (conf < 85) routing = "Tier 1 Agent";

      setData({ aiConfidence: Math.round(conf), policyAmbiguity: ambiguity, fraudRisk: fraud, sentimentRisk: sentiment, routing });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return data;
}

const riskColor = (level: string) => {
  if (level === "Low" || level === "Positive") return "text-emerald-600 bg-emerald-50";
  if (level === "Medium" || level === "Neutral") return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

const routingColor = (r: RoutingOutcome) => {
  if (r === "Auto Resolve") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (r === "Tier 1 Agent") return "text-blue-700 bg-blue-50 border-blue-200";
  if (r === "Supervisor") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
};

export function EscalationGovernancePanel() {
  const [open, setOpen] = useState(false);
  const [aiResolveMode, setAiResolveMode] = useState(true); // true = AI Resolve, false = AI Assist
  const gov = useSimulatedGovernance();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Scale className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Escalation & Governance Logic</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-lg border border-border bg-card space-y-3">
          {/* Indicators grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between px-3 py-2 rounded border border-border bg-card">
              <div className="flex items-center gap-1.5">
                <Brain className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">AI Confidence</span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${gov.aiConfidence >= 85 ? "text-emerald-600" : gov.aiConfidence >= 70 ? "text-amber-600" : "text-red-500"}`}>
                {gov.aiConfidence}%
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded border border-border bg-card">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">Policy Ambiguity</span>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskColor(gov.policyAmbiguity)}`}>{gov.policyAmbiguity}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded border border-border bg-card">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">Fraud Risk</span>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskColor(gov.fraudRisk)}`}>{gov.fraudRisk}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded border border-border bg-card">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">Sentiment Risk</span>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskColor(gov.sentimentRisk)}`}>{gov.sentimentRisk}</span>
            </div>
          </div>

          {/* Routing outcome */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${routingColor(gov.routing)}`}>
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Routing: {gov.routing}</span>
          </div>

          {/* AI Resolution Mode toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded border border-border bg-secondary/30">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-foreground">AI Resolution Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-medium ${!aiResolveMode ? "text-primary" : "text-muted-foreground"}`}>AI Assist</span>
              <Switch checked={aiResolveMode} onCheckedChange={setAiResolveMode} className="scale-75" />
              <span className={`text-[9px] font-medium ${aiResolveMode ? "text-primary" : "text-muted-foreground"}`}>AI Resolve</span>
            </div>
          </div>

          {!aiResolveMode && (
            <div className="px-3 py-2 rounded border border-border bg-blue-50 text-blue-700 text-[10px] feed-item-enter">
              <span className="font-medium">AI Assist Mode:</span> AI prepares structured coverage summary for human agent instead of auto-resolving.
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
