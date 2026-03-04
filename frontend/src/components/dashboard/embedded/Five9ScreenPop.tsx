import { CheckCircle2, AlertTriangle, Phone, User, Shield, ClipboardList, ArrowRight } from "lucide-react";

const DEPARTMENT_ROUTING: Record<string, { name: string; phone: string }> = {
  eligibility: { name: "Eligibility Team", phone: "(800) 555-3454" },
  claims: { name: "Claims Team", phone: "(800) 555-2572" },
  prior_auth: { name: "Prior Auth Team", phone: "(800) 555-7284" },
  other: { name: "Member Services", phone: "(800) 555-6362" },
};

function intentToDepartment(intent: string): { name: string; phone: string } {
  const lower = intent.toLowerCase();
  if (lower.includes("eligib") || lower.includes("benefit") || lower.includes("coverage")) {
    return DEPARTMENT_ROUTING.eligibility;
  }
  if (lower.includes("claim") || lower.includes("status") || lower.includes("payment")) {
    return DEPARTMENT_ROUTING.claims;
  }
  if (lower.includes("prior") || lower.includes("auth") || lower.includes("authorization")) {
    return DEPARTMENT_ROUTING.prior_auth;
  }
  return DEPARTMENT_ROUTING.other;
}

export interface Five9ScreenPopProps {
  providerName?: string;
  providerNpi?: string;
  patientName?: string;
  memberId?: string;
  memberDob?: string;
  planName?: string;
  intent: string;
  escalationReason: string;
  aiSummary: string;
  callerType?: "Provider" | "Member";
  sessionId?: string;
  stepsCompleted?: string[];
  extractedData?: Record<string, string>;
  recommendedActions?: string[];
}

export function Five9ScreenPop({
  providerName,
  providerNpi,
  patientName,
  memberId,
  memberDob,
  planName,
  intent,
  escalationReason,
  aiSummary,
  callerType = "Provider",
  sessionId,
  stepsCompleted,
  extractedData,
  recommendedActions,
}: Five9ScreenPopProps) {
  const dept = intentToDepartment(intent);
  const displaySessionId = sessionId ?? `F9-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const hasExtractedData = extractedData && Object.keys(extractedData).length > 0;
  const hasSteps = stepsCompleted && stepsCompleted.length > 0;
  const hasActions = recommendedActions && recommendedActions.length > 0;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-[#1a1f2e] overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f1420] border-b border-amber-500/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-300 font-semibold text-[11px] uppercase tracking-wider">
            Incoming Warm Transfer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-five9-muted font-mono">{displaySessionId}</span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e3a5f] border border-blue-500/30">
            <span className="text-[10px] font-bold text-blue-300">Five9</span>
            <span className="text-[9px] text-blue-400/70">Agent Desktop</span>
          </div>
        </div>
      </div>

      {/* Department routing */}
      <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-blue-950/60 border border-blue-500/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <div>
            <div className="text-[10px] text-blue-300/70 uppercase tracking-wider">Routing to</div>
            <div className="text-[13px] font-semibold text-blue-200">{dept.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-blue-300/70 uppercase tracking-wider">Queue Number</div>
          <div className="text-[13px] font-mono font-semibold text-blue-200">{dept.phone}</div>
        </div>
      </div>

      <div className="px-3 py-2 grid grid-cols-2 gap-2">
        {/* Caller Verified */}
        <div className="p-2 rounded-md bg-emerald-950/40 border border-emerald-500/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              {callerType === "Member" ? "Member" : "Provider"} Authenticated
            </span>
          </div>
          {callerType === "Provider" ? (
            <>
              <div className="text-[12px] font-medium text-foreground">
                {providerName || "Provider"}
              </div>
              {providerNpi && (
                <div className="text-[10px] text-five9-muted font-mono mt-0.5">
                  NPI: {providerNpi}
                </div>
              )}
            </>
          ) : (
            <div className="text-[12px] font-medium text-foreground">
              {patientName || "Member"}
            </div>
          )}
        </div>

        {/* Patient Verified */}
        <div className="p-2 rounded-md bg-emerald-950/40 border border-emerald-500/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-3 w-3 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              PHI Verified
            </span>
          </div>
          {patientName && (
            <div className="text-[12px] font-medium text-foreground">{patientName}</div>
          )}
          <div className="space-y-0.5 mt-0.5">
            {memberId && (
              <div className="text-[10px] text-five9-muted font-mono">{memberId}</div>
            )}
            {memberDob && (
              <div className="text-[10px] text-five9-muted">DOB: {memberDob}</div>
            )}
            {planName && (
              <div className="text-[10px] text-five9-muted">{planName}</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mx-3 mb-2 p-2 rounded-md bg-secondary/40 border border-border">
        <div className="flex items-center gap-1.5 mb-1">
          <User className="h-3 w-3 text-five9-muted" />
          <span className="text-[10px] font-semibold text-five9-muted uppercase tracking-wider">
            AI Conversation Summary
          </span>
        </div>
        <p className="text-[11px] text-foreground/80 leading-relaxed">{aiSummary}</p>
      </div>

      {/* What Was Attempted */}
      {hasSteps && (
        <div className="mx-3 mb-2 p-2 rounded-md bg-[#0d1a2d] border border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ClipboardList className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
              What AI Completed
            </span>
          </div>
          <div className="space-y-1">
            {stepsCompleted!.map((step, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[10px] text-foreground/80 leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Data Points */}
      {hasExtractedData && (
        <div className="mx-3 mb-2 p-2 rounded-md bg-[#0d1a2d] border border-blue-500/20">
          <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider block mb-1.5">
            Key Data
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(extractedData!).map(([key, value]) => (
              <div key={key} className="flex justify-between text-[10px]">
                <span className="text-five9-muted">{key}</span>
                <span className="font-mono text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation reason */}
      <div className="mx-3 mb-2 flex items-start gap-2 px-2 py-1.5 rounded-md bg-amber-950/40 border border-amber-500/30">
        <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            Escalation Reason
          </span>
          <p className="text-[11px] text-amber-200/80 mt-0.5">{escalationReason || "Transferred to human agent"}</p>
        </div>
      </div>

      {/* Recommended Next Steps */}
      {hasActions && (
        <div className="mx-3 mb-2 p-2 rounded-md bg-emerald-950/30 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowRight className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Recommended Next Steps
            </span>
          </div>
          <div className="space-y-1">
            {recommendedActions!.map((action, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[10px] text-emerald-400 font-mono shrink-0">{i + 1}.</span>
                <span className="text-[10px] text-foreground/80 leading-relaxed">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1.5 bg-[#0f1420] border-t border-white/5 text-center">
        <span className="text-[10px] text-five9-muted">
          Agent picks up exactly where AI left off — no re-authentication required
        </span>
      </div>
    </div>
  );
}
