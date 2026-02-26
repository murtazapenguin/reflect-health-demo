import { useState, useEffect } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Search, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const CPT_CODES = [
  { code: "97110", desc: "Therapeutic Exercises", status: "covered" as const },
  { code: "97112", desc: "Neuromuscular Reeducation", status: "covered" as const },
  { code: "97530", desc: "Therapeutic Activities", status: "preauth" as const },
  { code: "97535", desc: "Self-Care Management", status: "not-covered" as const },
];

const STATUS_CONFIG = {
  covered: { label: "Covered", className: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle },
  preauth: { label: "Covered – Pre-Authorization Required", className: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle },
  "not-covered": { label: "Not Covered", className: "text-red-600 bg-red-50 border-red-200", icon: XCircle },
};

export function EligibilityCoveragePanel() {
  const [open, setOpen] = useState(false);
  const [activeCpt, setActiveCpt] = useState(0);
  const [showEscalation, setShowEscalation] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCpt((prev) => {
        const next = (prev + 1) % CPT_CODES.length;
        setShowEscalation(CPT_CODES[next].status === "not-covered");
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const current = CPT_CODES[activeCpt];
  const statusCfg = STATUS_CONFIG[current.status];
  const StatusIcon = statusCfg.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Eligibility & Coverage Verification</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-lg border border-border bg-card space-y-3">
          {/* Simulation steps */}
          <div className="flex flex-wrap gap-1 text-[9px] font-medium text-muted-foreground">
            {["Member Validation", "Plan Lookup", "Service Code Lookup", "Coverage Response"].map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <span className={`px-2 py-1 rounded ${i <= 2 ? "reflect-gradient text-white" : "bg-secondary"}`}>{step}</span>
                {i < 3 && <span className="text-muted-foreground/40">→</span>}
              </div>
            ))}
          </div>

          {/* CPT Code Grid */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Service Code Lookup</span>
            <div className="grid grid-cols-2 gap-1.5">
              {CPT_CODES.map((cpt, i) => {
                const cfg = STATUS_CONFIG[cpt.status];
                const Icon = cfg.icon;
                return (
                  <div key={cpt.code} className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-[10px] transition-all ${
                    i === activeCpt ? cfg.className + " border-2" : "border-border bg-card text-muted-foreground"
                  }`}>
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="font-mono font-medium">{cpt.code}</span>
                    <span className="truncate">{cpt.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current result */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${statusCfg.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            <div className="text-[11px]">
              <span className="font-medium">CPT {current.code}:</span> {statusCfg.label}
            </div>
          </div>

          {/* Escalation animation */}
          {showEscalation && (
            <div className="flex items-center gap-2 px-3 py-2 rounded border-2 border-red-300 bg-red-50 text-red-700 feed-item-enter">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              <span className="text-[11px] font-medium">Escalation triggered — Not Covered service detected</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
