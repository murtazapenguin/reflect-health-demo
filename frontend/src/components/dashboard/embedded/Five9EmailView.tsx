import { useState } from "react";
import { Mail, Send, AlertTriangle, Sparkles } from "lucide-react";
import penguinLogo from "@/assets/penguin-logo.png";

interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  time: string;
  type: "eligibility" | "claims" | "auth";
}

const INBOX: Email[] = [
  {
    id: "e1",
    from: "provider@essexbone.com",
    subject: "Eligibility Verification — Member #4821",
    body: "Hello,\n\nI'm writing to verify eligibility for a patient scheduled for Total Knee Replacement (CPT 27447). The member ID is MBR-4821 under BlueCross PPO Gold.\n\nPlease confirm:\n1. Active coverage status\n2. In-network specialist copay\n3. Prior authorization requirements\n4. Deductible status\n\nThe procedure is scheduled for March 10, 2026. We need confirmation before proceeding with pre-op planning.\n\nThank you,\nDr. Malhotra's Office\nEssex Bone and Joint",
    time: "2m ago",
    type: "eligibility",
  },
  {
    id: "e2",
    from: "appeals@aetna.com",
    subject: "Claim Appeal #CB-1193 — Duplicate Billing Review",
    body: "To Whom It May Concern,\n\nWe are submitting a formal appeal for claim #CB-1193, which was denied on 2/5/2026 with reason code CO-18 (Duplicate Claim).\n\nThe original claim was submitted for DOS 1/28/2026 for a cardiology consult (CPT 99214). We believe this is a distinct encounter from the previously processed claim on 1/21/2026.\n\nPlease review the attached documentation and reconsider the denial.\n\nRegards,\nCardiology Associates Billing Dept.",
    time: "8m ago",
    type: "claims",
  },
  {
    id: "e3",
    from: "auth@midwestimaging.com",
    subject: "Prior Authorization Request — MRI Lumbar Spine",
    body: "Dear Authorization Team,\n\nRequesting prior authorization for the following:\n\nPatient: Member #7291\nPlan: UHC Choice Plus\nProcedure: MRI Lumbar Spine (CPT 72148)\nDiagnosis: M54.5 — Low back pain\nOrdering Physician: Dr. Sarah Chen\n\nClinical notes and imaging referral are attached. The patient has completed 6 weeks of conservative treatment including physical therapy with no improvement.\n\nPlease expedite as the patient is in significant pain.\n\nThank you,\nMidwest Imaging Center",
    time: "15m ago",
    type: "auth",
  },
  {
    id: "e4",
    from: "billing@primarycaregroup.com",
    subject: "COB Verification — Dual Coverage Member",
    body: "Hello,\n\nWe need coordination of benefits verification for a patient with dual coverage:\n\nMember: Jane Thompson, DOB 04/15/1958\nPrimary: Cigna PPO (ID: CIG-88421)\nSecondary: Medicare Part B\n\nThe patient was seen on 2/12/2026 for an annual wellness visit (CPT 99396). We need to confirm the correct order of coverage and billing splits before submitting.\n\nPlease advise on the coordination process.\n\nRegards,\nPrimary Care Group Billing",
    time: "22m ago",
    type: "eligibility",
  },
];

const AI_RESPONSES: Record<string, string> = {
  e1: "Dear Dr. Malhotra's Office,\n\nThank you for your inquiry regarding Member #4821.\n\nI can confirm the following:\n\n1. Coverage Status: Active — BlueCross PPO Gold\n2. In-Network Specialist Copay: $30 per visit\n3. Prior Authorization: Not required for CPT 27447 with in-network providers\n4. Deductible: $1,500 annual deductible — $1,112 met (74%)\n\nThe member's out-of-pocket maximum is $6,500 with $2,840 applied year-to-date. Coverage is confirmed through end of plan year (12/31/2026).\n\nPlease proceed with pre-op planning. If you have additional questions, don't hesitate to reach out.\n\nBest regards,\nPenguin AI — Automated Eligibility Response",
  e2: "Dear Cardiology Associates Billing Dept.,\n\nThank you for submitting the appeal for Claim #CB-1193.\n\nAfter AI-assisted review of the claim history:\n\n• Original claim processed on 1/21/2026 — CPT 99214 (DOS 1/21/2026) — Paid\n• Appealed claim submitted for DOS 1/28/2026 — CPT 99214\n\nOur system has verified these are distinct dates of service with separate encounter documentation. The denial code CO-18 was applied in error due to the same CPT code within a 30-day window.\n\nRecommendation: Appeal approved for reprocessing. The claim will be adjudicated within 5 business days.\n\nRegards,\nPenguin AI — Claims Resolution",
  e3: "Dear Midwest Imaging Center,\n\nPrior authorization request received for Member #7291.\n\nAI Review Summary:\n• Procedure: MRI Lumbar Spine (CPT 72148) — Covered under UHC Choice Plus\n• Diagnosis M54.5 meets medical necessity criteria\n• Conservative treatment documentation verified (6 weeks PT)\n• Clinical guidelines criteria: Met\n\nAuthorization Status: APPROVED\nAuth Number: PA-2026-88471\nValid Through: 04/15/2026\n\nThe member's in-network cost share for this procedure is $150 (after deductible). Please reference the auth number when submitting the claim.\n\nBest regards,\nPenguin AI — Prior Authorization",
  e4: "Dear Primary Care Group Billing,\n\nCOB verification completed for patient Jane Thompson (DOB 04/15/1958).\n\nCoverage Coordination:\n• Primary: Cigna PPO (ID: CIG-88421) — Active\n• Secondary: Medicare Part B — Active\n\nFor CPT 99396 (Annual Wellness Visit, DOS 2/12/2026):\n1. Submit to Cigna as primary payer\n2. Cigna allowed amount: $285.00\n3. Cigna pays: $228.00 (80%)\n4. Member responsibility to primary: $57.00\n5. Submit balance to Medicare Part B as secondary\n6. Medicare estimated payment: $45.60\n\nNet member responsibility: ~$11.40\n\nPlease bill in the order listed above. Attach the Cigna EOB when submitting to Medicare.\n\nRegards,\nPenguin AI — COB Verification",
};

export function Five9EmailView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  const [escalated, setEscalated] = useState<string | null>(null);

  const selectedEmail = INBOX.find((e) => e.id === selected);

  const handleUseSuggestion = () => {
    if (selected && AI_RESPONSES[selected]) {
      setDraft(AI_RESPONSES[selected]);
      setSent(false);
    }
  };

  const handleSend = () => {
    if (draft.trim()) {
      setSent(true);
    }
  };

  const handleSelectEmail = (id: string) => {
    setSelected(id);
    setDraft("");
    setSent(false);
    setEscalated(null);
  };

  return (
    <div className="grid grid-cols-12 gap-0 h-full">
      {/* Inbox list */}
      <div className="col-span-3 border-r five9-border overflow-y-auto five9-panel-bg">
        <div className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-five9-muted mb-2">
            Email Inbox ({INBOX.length})
          </div>
          {INBOX.map((email) => (
            <button
              key={email.id}
              onClick={() => handleSelectEmail(email.id)}
              className={`w-full text-left p-2.5 rounded mb-1 transition-colors ${
                selected === email.id
                  ? "five9-active-border bg-card"
                  : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-five9-accent shrink-0" />
                <span className="text-[11px] font-medium text-foreground truncate">
                  {email.subject}
                </span>
              </div>
              <span className="text-[9px] text-five9-muted block mt-0.5">
                {email.from} · {email.time}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Email content + reply area */}
      <div className="col-span-5 border-r five9-border overflow-hidden five9-panel-bg flex flex-col">
        {selectedEmail ? (
          <>
            {/* Email body — scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <span className="text-xs font-semibold text-foreground">
                  {selectedEmail.subject}
                </span>
                <span className="text-[10px] text-five9-muted block mt-0.5">
                  From: {selectedEmail.from}
                </span>
              </div>
              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-line">
                {selectedEmail.body}
              </p>

              {escalated === selectedEmail.id && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5 text-[10px] text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Escalated to senior agent
                </div>
              )}

              {sent && (
                <div className="p-2.5 rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.05)]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Send className="h-3 w-3 text-[hsl(var(--primary))]" />
                    <span className="text-[10px] font-semibold text-[hsl(var(--primary))]">Response Sent</span>
                  </div>
                  <p className="text-[10px] text-foreground leading-relaxed whitespace-pre-line">{draft}</p>
                </div>
              )}
            </div>

            {/* Reply area — pinned to bottom */}
            {!sent && (
              <div className="border-t five9-border p-3 space-y-2 shrink-0">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a reply or use AI suggestion..."
                  className="w-full h-20 p-2 text-[11px] rounded border border-border bg-card resize-none focus:outline-none focus:ring-1 focus:ring-five9-accent"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-medium five9-accent-bg text-white hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="h-2.5 w-2.5" /> Send
                  </button>
                  <button
                    onClick={() => setEscalated(selectedEmail.id)}
                    className="px-3 py-1.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-[11px] text-five9-muted text-center py-12">
            Select an email to view
          </div>
        )}
      </div>

      {/* AI Assist */}
      <div className="col-span-4 overflow-y-auto five9-panel-bg p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <img
            src={penguinLogo}
            alt="Penguin AI"
            className="h-4 w-4 object-contain"
          />
          <span className="text-[10px] font-semibold text-foreground">
            AI Email Assist
          </span>
        </div>
        {selectedEmail ? (
          <div className="space-y-3">
            <div className="five9-card p-2.5 five9-active-border space-y-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-five9-muted">
                Suggested Reply
              </span>
              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-line">
                {AI_RESPONSES[selectedEmail.id]}
              </p>
              <button
                onClick={handleUseSuggestion}
                className="w-full py-1.5 rounded text-[10px] font-medium five9-accent-bg text-white hover:opacity-90 flex items-center justify-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Use Suggestion
              </button>
            </div>
            <div className="five9-card p-2.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-five9-muted">
                Analysis
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <span className="text-five9-muted">Intent:</span>
                <span className="text-foreground font-medium capitalize">
                  {selectedEmail.type === "auth" ? "Prior Authorization" : selectedEmail.type === "claims" ? "Claims Appeal" : "Eligibility Verification"}
                </span>
                <span className="text-five9-muted">Confidence:</span>
                <span className="text-emerald-600 font-mono font-medium">
                  {selectedEmail.type === "claims" ? "91%" : selectedEmail.type === "auth" ? "96%" : "94%"}
                </span>
                <span className="text-five9-muted">Policy Ref:</span>
                <span className="text-foreground font-medium">
                  {selectedEmail.type === "claims" ? "Section 12.1 — Appeals" : selectedEmail.type === "auth" ? "Section 9.2 — PA Guidelines" : "Section 7.4 — Eligibility"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-five9-muted text-center py-12">
            Select an email for AI assistance
          </div>
        )}
      </div>
    </div>
  );
}
