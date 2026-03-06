import { CheckCircle2, AlertTriangle, Phone, Shield, ClipboardList, ArrowRight, UserCheck, MinusCircle } from "lucide-react";

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

const FALLBACK_STEPS: Record<string, string[]> = {
  eligibility: [
    "Caller identity verified (NPI + zip code)",
    "Patient PHI collected and verified",
    "Eligibility lookup performed",
  ],
  claims: [
    "Caller identity verified (NPI + zip code)",
    "Patient PHI collected and verified",
    "Claim status lookup attempted",
  ],
  prior_auth: [
    "Identified prior authorization request",
    "Transferred to Prior Auth Team per protocol",
  ],
  default: [
    "Caller information collected",
    "Transferred to appropriate team",
  ],
};

const FALLBACK_ACTIONS: Record<string, string[]> = {
  eligibility: [
    "Review eligibility details from AI conversation",
    "Address any remaining questions about benefits or coverage",
  ],
  claims: [
    "Review claim details from AI conversation",
    "Provide additional claim information or initiate appeal if needed",
  ],
  prior_auth: [
    "Process prior authorization request for the patient",
    "Verify clinical documentation is on file",
  ],
  default: [
    "Review the AI conversation context above",
    "Complete the caller's original request",
  ],
};

function getFallbackKey(intent: string): string {
  const lower = intent.toLowerCase();
  if (lower.includes("eligib") || lower.includes("benefit") || lower.includes("coverage")) return "eligibility";
  if (lower.includes("claim") || lower.includes("status")) return "claims";
  if (lower.includes("prior") || lower.includes("auth")) return "prior_auth";
  return "default";
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
  const fallbackKey = getFallbackKey(intent);
  const hasCallerIdentity = !!(providerName || providerNpi || (callerType === "Member" && (patientName || memberId)));
  const hasPhiData = !!(patientName || memberId || memberDob || planName);

  const steps = stepsCompleted && stepsCompleted.length > 0
    ? stepsCompleted
    : FALLBACK_STEPS[fallbackKey] ?? FALLBACK_STEPS.default;

  const actions = recommendedActions && recommendedActions.length > 0
    ? recommendedActions
    : FALLBACK_ACTIONS[fallbackKey] ?? FALLBACK_ACTIONS.default;

  const dataEntries = extractedData && Object.keys(extractedData).length > 0
    ? Object.entries(extractedData)
    : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-800 font-bold text-[13px] uppercase tracking-wide">
            Incoming Warm Transfer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500 font-mono">{displaySessionId}</span>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 text-white">
            <span className="text-[11px] font-bold">Five9</span>
            <span className="text-[10px] opacity-80">Agent Desktop</span>
          </div>
        </div>
      </div>

      {/* Department routing */}
      <div className="mx-4 mt-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <Phone className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] text-blue-500 font-semibold uppercase tracking-wider">Routing to</div>
            <div className="text-[15px] font-bold text-blue-900">{dept.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-blue-500 font-semibold uppercase tracking-wider">Queue</div>
          <div className="text-[14px] font-mono font-bold text-blue-900">{dept.phone}</div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Caller Verified */}
        {hasCallerIdentity ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider">
                {callerType === "Member" ? "Member" : "Provider"} Verified
              </span>
            </div>
            {callerType === "Provider" ? (
              <>
                <div className="text-[14px] font-semibold text-gray-900">
                  {providerName || "Provider"}
                </div>
                {providerNpi && (
                  <div className="text-[12px] text-gray-500 font-mono mt-1">
                    NPI: {providerNpi}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[14px] font-semibold text-gray-900">
                {patientName || "Member"}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MinusCircle className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                Caller Identity
              </span>
            </div>
            <div className="text-[13px] text-gray-400 italic">N/A — Immediate transfer</div>
          </div>
        )}

        {/* Patient / PHI Verified */}
        {hasPhiData ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider">
                PHI Verified
              </span>
            </div>
            {patientName && (
              <div className="text-[14px] font-semibold text-gray-900">{patientName}</div>
            )}
            <div className="space-y-1 mt-1">
              {memberId && (
                <div className="text-[12px] text-gray-600 font-mono">{memberId}</div>
              )}
              {memberDob && (
                <div className="text-[12px] text-gray-600">DOB: {memberDob}</div>
              )}
              {planName && (
                <div className="text-[12px] text-gray-600">{planName}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MinusCircle className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                PHI Verification
              </span>
            </div>
            <div className="text-[13px] text-gray-400 italic">N/A — Immediate transfer</div>
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="mx-4 mb-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
          AI Conversation Summary
        </div>
        <p className="text-[13px] text-gray-800 leading-relaxed">{aiSummary}</p>
      </div>

      {/* What AI Completed */}
      <div className="mx-4 mb-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          <span className="text-[12px] font-bold text-blue-700 uppercase tracking-wider">
            What AI Completed
          </span>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-[13px] text-gray-800 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Data Points */}
      {dataEntries.length > 0 && (
        <div className="mx-4 mb-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">
            Key Data Points
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {dataEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between items-baseline">
                <span className="text-[12px] text-gray-500">{key}</span>
                <span className="text-[13px] font-mono font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation reason */}
      <div className="mx-4 mb-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-[12px] font-bold text-amber-700 uppercase tracking-wider">
              Escalation Reason
            </div>
            <p className="text-[13px] text-gray-800 mt-1 leading-relaxed">
              {escalationReason || "Transferred to human agent"}
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Next Steps */}
      <div className="mx-4 mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="h-4 w-4 text-emerald-600" />
          <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider">
            Recommended Next Steps
          </span>
        </div>
        <div className="space-y-2">
          {actions.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[13px] text-emerald-600 font-mono font-bold shrink-0">{i + 1}.</span>
              <span className="text-[13px] text-gray-800 leading-relaxed">{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-center">
        <span className="text-[12px] text-gray-500 font-medium">
          Agent picks up exactly where AI left off — no re-authentication required
        </span>
      </div>
    </div>
  );
}
