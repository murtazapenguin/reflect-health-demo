import { useState, useEffect } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, FileSearch, CheckCircle, AlertTriangle, Clock, FileText } from "lucide-react";

type ClaimState = "adjudicated" | "pending-docs" | "retro-correction" | "appeal";

const CLAIM_STATES: { state: ClaimState; label: string; detail: string; escalate: boolean }[] = [
  { state: "adjudicated", label: "Adjudicated — Payment Scheduled", detail: "Claim #CLM-2024-88712 processed. Payment cycle: 14 days.", escalate: false },
  { state: "pending-docs", label: "Missing Documentation", detail: "Required: Operative report for CPT 27447. Escalating to Supervisor Queue.", escalate: true },
  { state: "retro-correction", label: "Retro Eligibility Correction", detail: "Member eligibility retroactively updated. Re-adjudication required.", escalate: true },
  { state: "appeal", label: "Appeal In Process", detail: "Claim #CLM-2024-90134 under Level 1 appeal. Target resolution: 30 days.", escalate: true },
];

const PA_STATES = [
  { status: "Approved", detail: "PA #PA-2024-4521 — 97110 x12 sessions approved", escalate: false },
  { status: "Pending Review", detail: "PA #PA-2024-4588 — Additional clinical notes required", escalate: true },
];

export function ClaimStatusPanel() {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activePa, setActivePa] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((p) => (p + 1) % CLAIM_STATES.length);
      setActivePa((p) => (p + 1) % PA_STATES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const claim = CLAIM_STATES[activeIdx];
  const pa = PA_STATES[activePa];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <FileSearch className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Claim Status & Prior Authorization</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-lg border border-border bg-card space-y-3">
          {/* Claim adjudication state */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Claim Adjudication State</span>
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded border feed-item-enter ${
              claim.escalate ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
            }`}>
              {claim.escalate ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
              )}
              <div>
                <div className={`text-[11px] font-semibold ${claim.escalate ? "text-amber-700" : "text-emerald-700"}`}>{claim.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{claim.detail}</div>
              </div>
            </div>
          </div>

          {/* Prior Auth status */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Prior Authorization Status</span>
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded border feed-item-enter ${
              pa.escalate ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
            }`}>
              {pa.escalate ? (
                <Clock className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
              )}
              <div>
                <div className={`text-[11px] font-semibold ${pa.escalate ? "text-amber-700" : "text-emerald-700"}`}>{pa.status}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{pa.detail}</div>
              </div>
            </div>
          </div>

          {/* Escalation routing */}
          {(claim.escalate || pa.escalate) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded border-2 border-amber-300 bg-amber-50 text-amber-700 feed-item-enter">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              <span className="text-[11px] font-medium">Escalated to Supervisor Queue — routing animated</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
