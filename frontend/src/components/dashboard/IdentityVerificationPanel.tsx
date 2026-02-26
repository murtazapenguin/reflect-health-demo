import { useState, useEffect } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ShieldCheck, Phone, User, Building2, KeyRound, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const STEPS = [
  { label: "Incoming Call", icon: Phone },
  { label: "Phone Number Recognition", icon: Phone },
  { label: "Member ID Lookup", icon: User },
  { label: "Provider NPI Validation", icon: Building2 },
  { label: "OTP / Knowledge-Based Verification", icon: KeyRound },
  { label: "Identity Confidence Score", icon: ShieldCheck },
];

function useSimulatedConfidence() {
  const [confidence, setConfidence] = useState(92);
  const [activeStep, setActiveStep] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      const val = 70 + Math.random() * 28;
      setConfidence(Math.round(val));
      setActiveStep(Math.floor(Math.random() * 2) + 4);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return { confidence, activeStep };
}

function RoutingOutcome({ confidence }: { confidence: number }) {
  if (confidence >= 85) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-emerald-50 text-emerald-700">
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">Confidence ≥ 85% — Proceed to Eligibility</span>
      </div>
    );
  }
  if (confidence >= 70) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-amber-50 text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">Confidence 70–84% — Route to Tier 1 Agent</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-red-50 text-red-700">
      <XCircle className="h-3.5 w-3.5" />
      <span className="text-[11px] font-medium">Confidence &lt; 70% — Supervisor Review</span>
    </div>
  );
}

export function IdentityVerificationPanel() {
  const [open, setOpen] = useState(false);
  const { confidence, activeStep } = useSimulatedConfidence();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Identity Verification Layer</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Live</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-lg border border-border bg-card space-y-3">
          {/* Flow visualization */}
          <div className="flex flex-wrap items-center gap-1">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-all ${
                    i <= activeStep ? "reflect-gradient text-white" : "bg-secondary text-muted-foreground"
                  }`}>
                    <Icon className="h-2.5 w-2.5" />
                    {step.label}
                  </div>
                  {i < STEPS.length - 1 && <span className="text-muted-foreground/40 text-[10px]">→</span>}
                </div>
              );
            })}
          </div>

          {/* Confidence score */}
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-muted-foreground">Identity Confidence:</span>
            <span className={`font-mono font-bold text-sm ${confidence >= 85 ? "text-emerald-600" : confidence >= 70 ? "text-amber-600" : "text-red-500"}`}>
              {confidence}%
            </span>
          </div>

          {/* Routing outcome */}
          <RoutingOutcome confidence={confidence} />

          {/* Governance badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-secondary text-[9px] font-medium text-muted-foreground w-fit">
            <ShieldCheck className="h-3 w-3 text-primary" />
            Human-in-the-Loop Governance Active
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
