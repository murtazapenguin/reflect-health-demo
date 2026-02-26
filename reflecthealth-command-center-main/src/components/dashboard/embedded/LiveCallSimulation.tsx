import { useState, useEffect, useCallback, useRef } from "react";
import { useSimulation } from "@/contexts/SimulationContext";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { useDashboard } from "@/contexts/DashboardContext";
import type { Five9Phase, Five9ApiCall, Five9SessionData, EdgeCaseType } from "@/contexts/AudioEngineContext";
import { User, AlertTriangle, CheckCircle2, Mic, MicOff, Timer } from "lucide-react";
import { AudioControlPanel } from "./AudioControlPanel";
import penguinLogo from "@/assets/penguin-logo.png";

const CALLER_VOICE = "EXAVITQu4vr4xnSDxMaL";
const AI_VOICE = "onwK4e9ZLuTAKqWW03F9";

// ── Random data generators ──
const PROVIDER_NAMES = ["Northgate Orthopedic", "Lakeside Medical Group", "Summit Health Partners", "Valley Cardiology Associates", "Coastal Family Medicine", "Heritage Internal Medicine"];
const NPIS = ["1456789123", "1982345671", "1334567890", "1567890234", "1890123456", "1223456789"];
const MEMBER_PREFIXES = ["BCX", "MBR", "HLT", "CRX", "PLN"];
const DOBS = ["01/14/1986", "03/22/1974", "07/08/1992", "11/30/1968", "05/15/1983", "09/02/1995"];
const PLAN_NAMES = ["UHC Choice Plus PPO", "Blue Cross PPO Gold", "Aetna HMO Select", "Cigna OAP Advantage", "Anthem EPO Standard"];

function randomNpi() { return NPIS[Math.floor(Math.random() * NPIS.length)]; }
function randomProviderName() { return PROVIDER_NAMES[Math.floor(Math.random() * PROVIDER_NAMES.length)]; }
function randomMemberId() {
  const prefix = MEMBER_PREFIXES[Math.floor(Math.random() * MEMBER_PREFIXES.length)];
  return `${prefix}-${Math.floor(1000000 + Math.random() * 9000000)}`;
}
function randomDob() { return DOBS[Math.floor(Math.random() * DOBS.length)]; }
function randomClaimId() { return `CLM-${Math.floor(10000 + Math.random() * 90000)}`; }
function randomPaId() { return `PA-${Math.floor(100000 + Math.random() * 900000)}`; }
function randomLatency(min: number, max: number) { return Math.floor(min + Math.random() * (max - min)); }
function randomConfidence(min: number, max: number) { return Math.floor(min + Math.random() * (max - min)); }
function randomPlan() { return PLAN_NAMES[Math.floor(Math.random() * PLAN_NAMES.length)]; }

// ── Edge case selection ──
function selectEdgeCase(): EdgeCaseType {
  const r = Math.random();
  if (r < 0.70) return "none";
  if (r < 0.78) return "wrong_npi";
  if (r < 0.86) return "invalid_member_id";
  if (r < 0.91) return "dob_mismatch";
  if (r < 0.96) return "claim_not_found";
  return "api_timeout";
}

// ── Call template pool ──
interface CallTemplate {
  intent: string;
  callerType: "Provider" | "Member";
  confidenceRange: [number, number];
  script: { speaker: "caller" | "ai"; text: string; phase?: Five9Phase }[];
}

function buildProviderTemplates(npi: string, provName: string, memberId: string, dob: string): CallTemplate[] {
  return [
    {
      intent: "Benefits Verification",
      callerType: "Provider",
      confidenceRange: [90, 96],
      script: [
        { speaker: "caller", text: `This is ${provName} calling to verify benefits.`, phase: "awaiting" },
        { speaker: "ai", text: "Thank you. Can I have your NPI number please?" },
        { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
        { speaker: "ai", text: `Provider verified. ${provName}, NPI ${npi}. Please provide the member ID.`, phase: "provider-verified" },
        { speaker: "caller", text: `Member ID ${memberId}, date of birth ${dob}.`, phase: "member-verifying" },
        { speaker: "ai", text: `Member verified. To confirm, you are calling from ${provName}, NPI ${npi}, regarding member ${memberId}. Is that correct?`, phase: "member-verified" },
        { speaker: "caller", text: "That's correct.", phase: "intent-classifying" },
        { speaker: "ai", text: `Coverage is active under ${randomPlan()}. Specialist visits are covered with a thirty-dollar copay. Deductible is seventy-four percent met. No prior authorization required for in-network providers.`, phase: "response-ready" },
        { speaker: "ai", text: "Is there anything else I can help with today?" },
        { speaker: "caller", text: "No, that's all. Thank you." },
        { speaker: "ai", text: "Thank you for calling. This verification has been completed and logged.", phase: "resolved" },
      ],
    },
    {
      intent: "Eligibility Verification",
      callerType: "Provider",
      confidenceRange: [90, 95],
      script: [
        { speaker: "caller", text: "Calling to confirm eligibility for a patient.", phase: "awaiting" },
        { speaker: "ai", text: "I'd be happy to help. May I have your NPI number?" },
        { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
        { speaker: "ai", text: `Provider verified. Please provide the member ID.`, phase: "provider-verified" },
        { speaker: "caller", text: `Member ${memberId}.`, phase: "member-verifying" },
        { speaker: "ai", text: `Member verified. Eligibility confirmed. Coverage is active under the employer-sponsored ${randomPlan()} effective January 1st, 2026. No lapse detected.`, phase: "response-ready" },
      ],
    },
    {
      intent: "Claim Status",
      callerType: "Provider",
      confidenceRange: [88, 93],
      script: [
        { speaker: "caller", text: "I'm calling to check on a claim.", phase: "awaiting" },
        { speaker: "ai", text: "Of course. May I have your NPI?" },
        { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
        { speaker: "ai", text: "Provider verified. Which claim are you inquiring about?", phase: "provider-verified" },
        { speaker: "caller", text: `Claim number ${randomClaimId()}, submitted February 3rd, for member ${memberId}.`, phase: "member-verifying" },
        { speaker: "ai", text: `Member verified. The claim was received February 3rd and is currently processing. Determination expected within five business days. No additional documentation required.`, phase: "response-ready" },
      ],
    },
    {
      intent: "Prior Authorization Status",
      callerType: "Provider",
      confidenceRange: [85, 91],
      script: [
        { speaker: "caller", text: "Checking on a prior authorization request.", phase: "awaiting" },
        { speaker: "ai", text: "May I have your NPI number?" },
        { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
        { speaker: "ai", text: "Provider verified. Please provide the member ID or PA reference number.", phase: "provider-verified" },
        { speaker: "caller", text: `Member ${memberId}.`, phase: "member-verifying" },
        { speaker: "ai", text: `Member verified. The PA request is under clinical review. All required documentation has been received. Estimated determination within forty-eight hours.`, phase: "response-ready" },
      ],
    },
  ];
}

// ── Edge case script builders ──
function buildWrongNpiScript(npi: string, provName: string, memberId: string, dob: string, retrySucceeds: boolean): CallTemplate {
  const wrongNpi = "1999999999";
  const correctNpi = npi;
  const script: CallTemplate["script"] = [
    { speaker: "caller", text: `This is ${provName} calling to verify benefits.`, phase: "awaiting" },
    { speaker: "ai", text: "Thank you. Can I have your NPI number please?" },
    { speaker: "caller", text: `NPI ${wrongNpi}.`, phase: "provider-verifying" },
    { speaker: "ai", text: "I'm unable to verify that NPI. Could you please repeat or confirm the number?", phase: "provider-failed" },
  ];
  if (retrySucceeds) {
    script.push(
      { speaker: "caller", text: `Sorry, it's ${correctNpi}.`, phase: "provider-retry" },
      { speaker: "ai", text: `Provider verified. ${provName}, NPI ${correctNpi}. Please provide the member ID.`, phase: "provider-verified" },
      { speaker: "caller", text: `Member ID ${memberId}, date of birth ${dob}.`, phase: "member-verifying" },
      { speaker: "ai", text: `Member verified. Coverage is active. No issues found.`, phase: "response-ready" },
    );
  } else {
    script.push(
      { speaker: "caller", text: `I think it's ${wrongNpi}.`, phase: "provider-retry" },
      { speaker: "ai", text: "I'm still unable to verify that NPI. I'll connect you to a representative for assistance.", phase: "escalation" },
    );
  }
  return {
    intent: "Benefits Verification",
    callerType: "Provider",
    confidenceRange: retrySucceeds ? [82, 88] : [68, 76],
    script,
  };
}

function buildInvalidMemberScript(npi: string, provName: string, memberId: string, retrySucceeds: boolean): CallTemplate {
  const wrongMember = "XXX-0000000";
  const script: CallTemplate["script"] = [
    { speaker: "caller", text: `This is ${provName} calling about a patient.`, phase: "awaiting" },
    { speaker: "ai", text: "May I have your NPI number?" },
    { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
    { speaker: "ai", text: `Provider verified. Please provide the member ID.`, phase: "provider-verified" },
    { speaker: "caller", text: `Member ${wrongMember}.`, phase: "member-verifying" },
    { speaker: "ai", text: "I'm unable to locate that member record. Could you confirm the ID?", phase: "member-failed" },
  ];
  if (retrySucceeds) {
    script.push(
      { speaker: "caller", text: `Let me check. It should be ${memberId}.`, phase: "member-retry" },
      { speaker: "ai", text: `Member verified. Eligibility confirmed.`, phase: "response-ready" },
    );
  } else {
    script.push(
      { speaker: "caller", text: `I'm not sure of the correct ID.`, phase: "member-retry" },
      { speaker: "ai", text: "I'm unable to verify the member. I'll transfer you to an agent who can assist.", phase: "escalation" },
    );
  }
  return {
    intent: "Eligibility Verification",
    callerType: "Provider",
    confidenceRange: retrySucceeds ? [80, 86] : [65, 74],
    script,
  };
}

function buildDobMismatchScript(npi: string, provName: string, memberId: string, dob: string, retrySucceeds: boolean): CallTemplate {
  const wrongDob = "06/15/1990";
  const script: CallTemplate["script"] = [
    { speaker: "caller", text: `Calling to verify benefits for a patient.`, phase: "awaiting" },
    { speaker: "ai", text: "May I have your NPI?" },
    { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
    { speaker: "ai", text: `Provider verified. Please provide the member ID.`, phase: "provider-verified" },
    { speaker: "caller", text: `Member ${memberId}, date of birth ${wrongDob}.`, phase: "member-verifying" },
    { speaker: "ai", text: "The date of birth provided does not match our records. Please re-confirm.", phase: "dob-mismatch" },
  ];
  if (retrySucceeds) {
    script.push(
      { speaker: "caller", text: `Sorry, the correct date of birth is ${dob}.`, phase: "member-retry" },
      { speaker: "ai", text: `Date of birth confirmed. Member verified. Coverage is active.`, phase: "response-ready" },
    );
  } else {
    script.push(
      { speaker: "caller", text: `I have ${wrongDob} in my records.`, phase: "member-retry" },
      { speaker: "ai", text: "The date of birth still does not match. For security, I'll transfer you to verify identity.", phase: "escalation" },
    );
  }
  return {
    intent: "Benefits Verification",
    callerType: "Provider",
    confidenceRange: retrySucceeds ? [82, 87] : [70, 78],
    script,
  };
}

function buildClaimNotFoundScript(npi: string, provName: string, memberId: string): CallTemplate {
  const claimId = randomClaimId();
  return {
    intent: "Claim Status",
    callerType: "Provider",
    confidenceRange: [72, 80],
    script: [
      { speaker: "caller", text: `Calling to check on a claim status.`, phase: "awaiting" },
      { speaker: "ai", text: "May I have your NPI?" },
      { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
      { speaker: "ai", text: "Provider verified. Which claim are you inquiring about?", phase: "provider-verified" },
      { speaker: "caller", text: `Claim ${claimId} for member ${memberId}.`, phase: "member-verifying" },
      { speaker: "ai", text: `Member verified. However, I'm unable to locate claim ${claimId} in the system. Let me transfer you to a representative who can assist.`, phase: "escalation" },
    ],
  };
}

function buildApiTimeoutScript(npi: string, provName: string, memberId: string, dob: string, retrySucceeds: boolean): CallTemplate {
  const script: CallTemplate["script"] = [
    { speaker: "caller", text: `This is ${provName} calling to check eligibility.`, phase: "awaiting" },
    { speaker: "ai", text: "May I have your NPI?" },
    { speaker: "caller", text: `NPI ${npi}.`, phase: "provider-verifying" },
    { speaker: "ai", text: `Provider verified. Please provide the member ID.`, phase: "provider-verified" },
    { speaker: "caller", text: `Member ${memberId}.`, phase: "member-verifying" },
    { speaker: "ai", text: "Member verified. Let me retrieve the eligibility details.", phase: "data-timeout" },
  ];
  if (retrySucceeds) {
    script.push(
      { speaker: "ai", text: "System is back online. Eligibility confirmed. Coverage is active.", phase: "response-ready" },
    );
  } else {
    script.push(
      { speaker: "ai", text: "We're experiencing a temporary system delay. I'll connect you to a specialist who can assist.", phase: "escalation" },
    );
  }
  return {
    intent: "Eligibility Verification",
    callerType: "Provider",
    confidenceRange: retrySucceeds ? [80, 86] : [68, 75],
    script,
  };
}

function buildMemberTemplates(memberId: string): CallTemplate[] {
  return [
    {
      intent: "Claims Status",
      callerType: "Member",
      confidenceRange: [90, 96],
      script: [
        { speaker: "caller", text: "I'd like to check the status of a recent claim.", phase: "awaiting" },
        { speaker: "ai", text: "Please provide your member ID.", phase: "member-verifying" },
        { speaker: "caller", text: `It's ${memberId}.` },
        { speaker: "ai", text: "Your claim was processed and approved. Payment was issued on February 15th.", phase: "response-ready" },
      ],
    },
    {
      intent: "ID Card Replacement",
      callerType: "Member",
      confidenceRange: [92, 98],
      script: [
        { speaker: "caller", text: "I need a replacement ID card.", phase: "awaiting" },
        { speaker: "ai", text: "A new ID card has been requested. It will arrive within seven to ten business days. A digital copy has also been sent to the email on file.", phase: "response-ready" },
      ],
    },
    {
      intent: "Deductible / OOP Inquiry",
      callerType: "Member",
      confidenceRange: [90, 96],
      script: [
        { speaker: "caller", text: "Can you tell me how much of my deductible I've met so far?", phase: "awaiting" },
        { speaker: "ai", text: "Please provide your member ID.", phase: "member-verifying" },
        { speaker: "caller", text: `Member ${memberId}.` },
        { speaker: "ai", text: "You have met twelve hundred of your two-thousand-dollar individual deductible. Your out-of-pocket maximum balance remaining is four thousand two hundred dollars.", phase: "response-ready" },
      ],
    },
  ];
}

// ── API call generators per intent ──
function generateApiCalls(intent: string, memberId: string, edgeCase: EdgeCaseType): Five9ApiCall[] {
  if (edgeCase === "claim_not_found") {
    return [
      { endpoint: `GET /claim-status?claim_id=${randomClaimId()}`, source: "Core Claims System", latency: randomLatency(150, 300), status: 404 },
    ];
  }
  if (edgeCase === "api_timeout") {
    return [
      { endpoint: `GET /eligibility?member_id=${memberId}`, source: "Azure Data Lake", latency: 600, status: 504, isTimeout: true },
    ];
  }
  switch (intent) {
    case "Claim Status":
    case "Claims Status":
      return [
        { endpoint: `GET /claim-status?claim_id=${randomClaimId()}`, source: "Core Claims System", latency: randomLatency(150, 300), status: 200 },
        { endpoint: `GET /eligibility?member_id=${memberId}`, source: "Azure Data Lake", latency: randomLatency(200, 350), status: 200 },
      ];
    case "Eligibility Verification":
      return [
        { endpoint: `GET /eligibility?member_id=${memberId}`, source: "Azure Data Lake", latency: randomLatency(200, 350), status: 200 },
        { endpoint: "GET /provider-verify", source: "Provider Directory Database", latency: randomLatency(80, 150), status: 200 },
      ];
    case "Prior Authorization Status":
      return [
        { endpoint: `GET /prior-auth-status?auth_id=${randomPaId()}`, source: "Prior Authorization System", latency: randomLatency(250, 400), status: 200 },
        { endpoint: `GET /eligibility?member_id=${memberId}`, source: "Azure Data Lake", latency: randomLatency(200, 350), status: 200 },
      ];
    case "Benefits Verification":
      return [
        { endpoint: `GET /eligibility?member_id=${memberId}`, source: "Azure Data Lake", latency: randomLatency(200, 350), status: 200 },
        { endpoint: "GET /benefits-schedule", source: "Core Claims System", latency: randomLatency(120, 200), status: 200 },
      ];
    case "ID Card Replacement":
      return [
        { endpoint: `GET /member-profile?member_id=${memberId}`, source: "Azure Data Lake", latency: randomLatency(150, 250), status: 200 },
      ];
    case "Deductible / OOP Inquiry":
      return [
        { endpoint: `GET /accumulator?member_id=${memberId}`, source: "Azure Data Lake", latency: randomLatency(180, 300), status: 200 },
        { endpoint: `GET /benefits-schedule?member_id=${memberId}`, source: "Core Claims System", latency: randomLatency(120, 200), status: 200 },
      ];
    default:
      return [
        { endpoint: `GET /eligibility?member_id=${memberId}`, source: "Azure Data Lake", latency: randomLatency(200, 350), status: 200 },
      ];
  }
}

function generateStructuredResponse(intent: string, memberId: string, edgeCase: EdgeCaseType): { fields: { label: string; value: string }[]; generatedResponse: string } | null {
  if (edgeCase === "claim_not_found") {
    return {
      fields: [
        { label: "Claim", value: "Not Located" },
        { label: "Status", value: "404 — Not Found" },
      ],
      generatedResponse: "Unable to locate the specified claim in the system. Routing to agent.",
    };
  }
  if (edgeCase === "api_timeout") return null;

  const plan = randomPlan();
  switch (intent) {
    case "Claim Status":
    case "Claims Status": {
      const claimId = randomClaimId();
      return {
        fields: [
          { label: "Claim", value: `#${claimId}` },
          { label: "Status", value: "Processing" },
          { label: "Expected Completion", value: `${Math.floor(3 + Math.random() * 5)} Business Days` },
        ],
        generatedResponse: `Claim ${claimId} was received and is currently processing. Determination expected within five business days.`,
      };
    }
    case "Eligibility Verification":
      return {
        fields: [
          { label: "Plan", value: plan },
          { label: "Status", value: "Active" },
          { label: "Effective", value: "01/01/2026" },
        ],
        generatedResponse: `Eligibility confirmed. Coverage is active under the employer-sponsored ${plan}. No lapse in coverage detected.`,
      };
    case "Prior Authorization Status": {
      const paId = randomPaId();
      return {
        fields: [
          { label: "PA Request", value: `#${paId}` },
          { label: "Status", value: "Under Clinical Review" },
          { label: "ETA", value: "48 Hours" },
        ],
        generatedResponse: `PA request is under clinical review. All required clinical documentation has been received. Estimated determination within 48 hours.`,
      };
    }
    case "Benefits Verification": {
      const deductPct = Math.floor(50 + Math.random() * 40);
      const deductMet = Math.floor(800 + Math.random() * 800);
      const deductTotal = Math.floor(deductMet / (deductPct / 100));
      return {
        fields: [
          { label: "Plan", value: plan },
          { label: "Copay", value: `$${Math.floor(20 + Math.random() * 30)} (Specialist)` },
          { label: "Deductible Met", value: `${deductPct}% ($${deductMet.toLocaleString()} / $${deductTotal.toLocaleString()})` },
        ],
        generatedResponse: `Member is active. In-network specialist copay confirmed. Deductible: ${deductPct}% met. Coverage confirmed through 12/31/2026.`,
      };
    }
    case "ID Card Replacement":
      return {
        fields: [
          { label: "Member", value: memberId },
          { label: "Card Status", value: "Requested" },
          { label: "Delivery", value: "7–10 Business Days" },
        ],
        generatedResponse: "New ID card has been requested. Digital copy sent to email on file.",
      };
    case "Deductible / OOP Inquiry": {
      const met = Math.floor(600 + Math.random() * 1200);
      const total = 2000;
      const oopRemain = Math.floor(2000 + Math.random() * 3000);
      return {
        fields: [
          { label: "Deductible Met", value: `$${met.toLocaleString()} / $${total.toLocaleString()}` },
          { label: "OOP Remaining", value: `$${oopRemain.toLocaleString()}` },
          { label: "Plan Year", value: "2026" },
        ],
        generatedResponse: `Individual deductible: $${met} of $${total} met. Out-of-pocket maximum remaining: $${oopRemain.toLocaleString()}.`,
      };
    }
    default:
      return {
        fields: [{ label: "Status", value: "Processed" }],
        generatedResponse: "Request has been processed successfully.",
      };
  }
}

function pickTemplate(npi: string, provName: string, memberId: string, dob: string, edgeCase: EdgeCaseType): CallTemplate {
  if (edgeCase === "none") {
    const r = Math.random();
    if (r < 0.75) {
      const templates = buildProviderTemplates(npi, provName, memberId, dob);
      return templates[Math.floor(Math.random() * templates.length)];
    }
    return buildMemberTemplates(memberId)[Math.floor(Math.random() * 3)];
  }

  const retrySucceeds = Math.random() < 0.6; // 60% chance retry works
  switch (edgeCase) {
    case "wrong_npi":
      return buildWrongNpiScript(npi, provName, memberId, dob, retrySucceeds);
    case "invalid_member_id":
      return buildInvalidMemberScript(npi, provName, memberId, retrySucceeds);
    case "dob_mismatch":
      return buildDobMismatchScript(npi, provName, memberId, dob, retrySucceeds);
    case "claim_not_found":
      return buildClaimNotFoundScript(npi, provName, memberId);
    case "api_timeout":
      return buildApiTimeoutScript(npi, provName, memberId, dob, retrySucceeds);
    default:
      return buildProviderTemplates(npi, provName, memberId, dob)[0];
  }
}

type CallStatus = "idle" | "incoming" | "processing" | "resolved" | "escalated";

interface TranscriptLine {
  id: string;
  speaker: "caller" | "ai";
  text: string;
  typing?: boolean;
}

export function LiveCallSimulation() {
  const { pipeline } = useSimulation();
  const { results } = useDashboard();
  const {
    audioEnabled, setAudioEnabled, isLiveSimulation, setIsLiveSimulation,
    confidenceThreshold, playTTS, stopAudio, setCurrentCallOutcome,
    isPlaying, setLiveCallIntent, setFive9Phase, setFive9Session,
  } = useAudioEngine();

  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [currentIntent, setCurrentIntent] = useState<string>("");
  const [callConfidence, setCallConfidence] = useState(0);
  const [callCount, setCallCount] = useState(0);
  const [metrics, setMetrics] = useState({ deflected: 0, escalated: 0, minutesSaved: 0, costAvoided: 0 });

  const callIndexRef = useRef(0);
  const isRunningRef = useRef(false);
  const abortRef = useRef(false);

  const runCall = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    abortRef.current = false;

    const npi = randomNpi();
    const provName = randomProviderName();
    const memberId = randomMemberId();
    const dob = randomDob();
    const edgeCase = selectEdgeCase();

    const template = pickTemplate(npi, provName, memberId, dob, edgeCase);
    callIndexRef.current++;

    const [lo, hi] = template.confidenceRange;
    const conf = Math.floor(lo + Math.random() * (hi - lo));

    const escalationChance = conf < 88 ? 0.25 : 0.12;
    const forceEscalation = edgeCase === "none" && Math.random() < escalationChance && !template.script.some(s => s.phase === "escalation");

    const apiCalls = generateApiCalls(template.intent, memberId, edgeCase);
    const structuredResp = generateStructuredResponse(template.intent, memberId, edgeCase);
    const sessionId = `F9-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const hasEscalationInScript = template.script.some(s => s.phase === "escalation");
    const willEscalate = hasEscalationInScript || forceEscalation || conf < confidenceThreshold;

    const sessionData: Five9SessionData = {
      sessionId,
      callerType: template.callerType,
      providerNpi: npi,
      providerName: provName,
      providerConfidence: randomConfidence(96, 99),
      memberId,
      memberDob: dob,
      memberConfidence: randomConfidence(94, 99),
      intent: template.intent,
      confidenceScore: conf,
      apiCalls,
      structuredResponse: structuredResp,
      escalated: willEscalate,
      escalationReason: hasEscalationInScript
        ? edgeCase === "wrong_npi" ? "Provider Verification Failed"
        : edgeCase === "invalid_member_id" ? "Member Verification Failed"
        : edgeCase === "dob_mismatch" ? "DOB Verification Failed"
        : edgeCase === "claim_not_found" ? "Claim Not Found"
        : edgeCase === "api_timeout" ? "System Timeout"
        : "Confidence Below Threshold"
        : forceEscalation ? "Ambiguity Detected"
        : conf < confidenceThreshold ? "Confidence Below Threshold"
        : "",
      edgeCaseType: edgeCase,
      providerVerified: edgeCase !== "wrong_npi" || template.script.some(s => s.phase === "provider-verified"),
      memberVerified: !["invalid_member_id", "dob_mismatch"].includes(edgeCase) || template.script.some(s => s.phase === "member-verified" || s.phase === "response-ready"),
    };

    setFive9Session(sessionData);
    setFive9Phase("awaiting");
    setCurrentIntent(template.intent);
    setLiveCallIntent(template.intent);
    setCallConfidence(conf);
    setCallStatus("incoming");
    setTranscript([]);

    await new Promise((r) => setTimeout(r, 800));
    if (abortRef.current) { isRunningRef.current = false; setFive9Phase("idle"); return; }

    setCallStatus("processing");

    for (let lineIdx = 0; lineIdx < template.script.length; lineIdx++) {
      if (abortRef.current) break;
      const line = template.script[lineIdx];
      const id = `line-${Date.now()}-${Math.random()}`;

      if (line.phase) {
        setFive9Phase(line.phase);

        // Handle data-timeout with animated progression
        if (line.phase === "data-timeout") {
          setFive9Phase("data-retrieving");
          await new Promise((r) => setTimeout(r, 400));
          setFive9Phase("data-timeout");
          await new Promise((r) => setTimeout(r, 1200));
          // Check if next line is response-ready (retry succeeded) or escalation
          const nextLine = template.script[lineIdx + 1];
          if (nextLine?.phase === "response-ready") {
            setFive9Phase("data-retry");
            await new Promise((r) => setTimeout(r, 600));
            // Update API calls to show retry success
            const retryCall: Five9ApiCall = { endpoint: apiCalls[0].endpoint, source: apiCalls[0].source, latency: randomLatency(200, 350), status: 200, isRetry: true };
            setFive9Session({ ...sessionData, apiCalls: [...apiCalls, retryCall], escalated: false, escalationReason: "" });
            setFive9Phase("data-retrieved");
          }
        }

        // Normal intent classification → data retrieval flow
        if (line.phase === "intent-classifying") {
          await new Promise((r) => setTimeout(r, 400));
          setFive9Phase("intent-classified");
          await new Promise((r) => setTimeout(r, 300));
          setFive9Phase("data-retrieving");
          await new Promise((r) => setTimeout(r, 600));
          setFive9Phase("data-retrieved");
          await new Promise((r) => setTimeout(r, 200));
          setFive9Phase("response-generating");
        }

        if (line.phase === "member-verified" && edgeCase === "none") {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      setTranscript((prev) => [...prev, { id, speaker: line.speaker, text: line.text, typing: true }]);

      const voiceId = line.speaker === "caller" ? CALLER_VOICE : AI_VOICE;
      await playTTS(line.text, voiceId, line.speaker === "ai" ? 0.5 : 0.35);

      if (abortRef.current) break;

      setTranscript((prev) => prev.map((l) => (l.id === id ? { ...l, typing: false } : l)));
      await new Promise((r) => setTimeout(r, 300));
    }

    if (abortRef.current) { isRunningRef.current = false; setFive9Phase("idle"); return; }

    const isEscalated = willEscalate;
    const deflected = !isEscalated;
    const outcome = deflected ? "resolved" as const : "escalated" as const;

    setFive9Phase(deflected ? "confidence-check" : "escalation");
    setCallStatus(outcome);
    setCallCount((c) => c + 1);

    const costSaved = deflected ? 4.32 : 0;
    const minSaved = deflected ? 6 : 1;

    setMetrics((prev) => ({
      deflected: prev.deflected + (deflected ? 1 : 0),
      escalated: prev.escalated + (deflected ? 0 : 1),
      minutesSaved: prev.minutesSaved + minSaved,
      costAvoided: +(prev.costAvoided + costSaved).toFixed(2),
    }));

    setCurrentCallOutcome({
      callDeflected: deflected,
      escalationAvoided: deflected,
      costAvoided: costSaved,
      confidence: conf,
    });

    await new Promise((r) => setTimeout(r, 800));
    setFive9Phase(deflected ? "resolved" : "escalation");

    isRunningRef.current = false;
  }, [confidenceThreshold, playTTS, setCurrentCallOutcome, setFive9Phase, setFive9Session, setLiveCallIntent]);

  // Auto-advance
  useEffect(() => {
    if (!isLiveSimulation || !audioEnabled) return;
    if (callStatus === "resolved" || callStatus === "escalated") {
      const timer = setTimeout(() => {
        if (isLiveSimulation && audioEnabled) runCall();
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (callStatus === "idle") {
      const timer = setTimeout(() => {
        if (isLiveSimulation && audioEnabled) runCall();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [callStatus, isLiveSimulation, audioEnabled, runCall]);

  const handleToggle = () => {
    if (isLiveSimulation) {
      setIsLiveSimulation(false);
      abortRef.current = true;
      stopAudio();
      isRunningRef.current = false;
      setCallStatus("idle");
      setFive9Phase("idle");
      setFive9Session(null);
    } else {
      setIsLiveSimulation(true);
      setCallStatus("idle");
    }
  };

  return (
    <div className="p-3 space-y-3 five9-panel-bg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="type-h3 text-foreground">
            Live AI Call Simulation
          </div>
          {currentIntent && callStatus !== "idle" && (
            <div className="type-body mt-0.5">
              {currentIntent} · Confidence {callConfidence}%
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {callCount > 0 && (
            <span className="type-micro font-mono text-five9-muted">#{callCount}</span>
          )}
          <div className="flex items-center bg-secondary rounded-md p-0.5 gap-0.5">
            <button
              onClick={handleToggle}
              className={`flex items-center gap-1 px-2 py-1 type-micro font-semibold rounded transition-all ${
                isLiveSimulation
                  ? "five9-accent-bg text-white"
                  : "text-five9-muted hover:text-foreground"
              }`}
            >
              {isLiveSimulation ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5" />}
              {isLiveSimulation ? "LIVE" : "OFF"}
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`flex items-center gap-1 px-2 py-1 type-micro font-semibold rounded transition-all ${
                audioEnabled
                  ? "bg-emerald-500/30 text-emerald-300"
                  : "text-five9-muted hover:text-foreground"
              }`}
            >
              {audioEnabled ? "🔊" : "🔇"}
              {audioEnabled ? "Audio" : "Muted"}
            </button>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {callStatus === "incoming" && (
        <div className="rounded p-2 flex items-center gap-2 type-body font-medium bg-primary/10 border border-primary/20 text-primary animate-pulse">
          <Timer className="h-3.5 w-3.5" />
          Incoming Call — {currentIntent}
        </div>
      )}

      {callStatus === "resolved" && (
        <div className="rounded p-2 flex items-center gap-2 type-body font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Resolved by AI — No agent intervention required
        </div>
      )}

      {callStatus === "escalated" && (
        <div className="rounded p-2 flex items-center gap-2 type-body font-medium bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Escalated to Agent — Confidence {callConfidence}% &lt; {confidenceThreshold}%
        </div>
      )}

      {/* Transcript */}
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px]">
        {transcript.length === 0 && callStatus === "idle" && (
          <div className="type-body text-five9-muted text-center py-8">
            {isLiveSimulation ? "Starting next call..." : "Enable Live Simulation to start"}
          </div>
        )}
        {transcript.map((line) => (
          <div key={line.id} className={`flex gap-2 ${line.speaker === "ai" ? "flex-row" : "flex-row-reverse"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              line.speaker === "ai" ? "bg-five9-accent/10" : "bg-secondary"
            }`}>
              {line.speaker === "ai" ? (
                <img src={penguinLogo} alt="Penguin AI" className="h-4 w-4 object-contain" />
              ) : (
                <User className="h-3 w-3 text-five9-muted" />
              )}
            </div>
            <div className={`five9-card p-2 max-w-[80%] ${line.speaker === "ai" ? "five9-active-border" : ""}`}>
              <p className="type-body-lg text-foreground" style={{ fontSize: "13px", lineHeight: 1.55 }}>
                {line.typing ? (
                  <span className="inline-flex items-center gap-1">
                    {line.text}
                    <span className="animate-pulse text-five9-accent">●</span>
                  </span>
                ) : (
                  line.text
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Outcome details */}
      {callStatus === "resolved" && (
        <div className="five9-card p-2 space-y-1 five9-active-border">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="type-body">Outcome:</span>
            <span className="type-body font-medium text-emerald-600">Call Deflected</span>
            <span className="type-body">Confidence:</span>
            <span className="type-body font-medium font-mono text-foreground">{callConfidence}%</span>
            <span className="type-body">Cost Impact:</span>
            <span className="type-body font-medium font-mono text-emerald-600">+$4.32</span>
            <span className="type-body">Minutes Saved:</span>
            <span className="type-body font-medium font-mono text-emerald-600">+6 min</span>
          </div>
        </div>
      )}

      {/* Running metrics */}
      {(metrics.deflected > 0 || metrics.escalated > 0) && (
        <div className="five9-card p-2">
          <div className="type-micro uppercase tracking-[0.12em] text-five9-muted mb-1.5">Session Metrics</div>
          <div className="grid grid-cols-4 gap-1">
            <div className="text-center">
              <div className="text-[16px] font-semibold font-mono text-emerald-600">{metrics.deflected}</div>
              <div className="type-micro text-five9-muted">Deflected</div>
            </div>
            <div className="text-center">
              <div className="text-[16px] font-semibold font-mono text-amber-600">{metrics.escalated}</div>
              <div className="type-micro text-five9-muted">Escalated</div>
            </div>
            <div className="text-center">
              <div className="text-[16px] font-semibold font-mono text-foreground">{metrics.minutesSaved}</div>
              <div className="type-micro text-five9-muted">Min Saved</div>
            </div>
            <div className="text-center">
              <div className="text-[16px] font-semibold font-mono text-emerald-600">${metrics.costAvoided}</div>
              <div className="type-micro text-five9-muted">Avoided</div>
            </div>
          </div>
        </div>
      )}

      {/* Audio controls */}
      <AudioControlPanel />
    </div>
  );
}
