import { useState, useEffect, useRef } from "react";
import { useSimulation } from "@/contexts/SimulationContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAudioEngine, type Five9Phase } from "@/contexts/AudioEngineContext";
import { DetailModal } from "../DetailModal";
import penguinAiLogo from "@/assets/penguin-ai-logo.png";
import penguinLogo from "@/assets/penguin-logo.png";
import {
  ArrowRight, Shield, FileText, Sparkles, AlertCircle, ChevronDown, ChevronUp,
  Database, Activity, CheckCircle2, UserCheck, Fingerprint, MessageSquare, Lock, Server, Loader2,
  XCircle, RefreshCw, Clock
} from "lucide-react";

// ── Provider-focused pipeline stages ──
const PIPELINE_STAGES = [
  { label: "Provider Verify", icon: UserCheck, phases: ["provider-verifying", "provider-verified", "provider-failed", "provider-retry"] as Five9Phase[] },
  { label: "Member Verify", icon: Fingerprint, phases: ["member-verifying", "member-verified", "member-failed", "member-retry", "dob-mismatch"] as Five9Phase[] },
  { label: "Intent", icon: Sparkles, phases: ["intent-classifying", "intent-classified"] as Five9Phase[] },
  { label: "Data Retrieval", icon: Database, phases: ["data-retrieving", "data-retrieved", "data-timeout", "data-retry"] as Five9Phase[] },
  { label: "Response", icon: MessageSquare, phases: ["response-generating", "response-ready"] as Five9Phase[] },
  { label: "Confidence", icon: Shield, phases: ["confidence-check"] as Five9Phase[] },
  { label: "Escalation", icon: AlertCircle, phases: ["escalation", "resolved"] as Five9Phase[] },
];

const DATA_SOURCES = [
  { name: "Azure Data Lake", detail: "Eligibility + Historical Claims" },
  { name: "Core Claims System", detail: "Real-Time Status" },
  { name: "Prior Authorization System", detail: "" },
  { name: "Provider Directory Database", detail: "" },
];

function phaseToStageIndex(phase: Five9Phase): number {
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    if (PIPELINE_STAGES[i].phases.includes(phase)) return i;
  }
  if (phase === "resolved" || phase === "escalation") return 6;
  return -1;
}

// Failure phases
const FAILURE_PHASES: Five9Phase[] = ["provider-failed", "member-failed", "dob-mismatch", "data-timeout"];
const RETRY_PHASES: Five9Phase[] = ["provider-retry", "member-retry", "data-retry"];

function LatencyCounter({ target, isTimeout }: { target: number; isTimeout?: boolean }) {
  const [value, setValue] = useState(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    startTime.current = performance.now();
    setValue(0);
    const duration = isTimeout ? 1500 : Math.min(target * 2, 800);
    let frame: number;
    const animate = () => {
      const elapsed = performance.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(target * progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, isTimeout]);

  return <span>{value}ms</span>;
}

export function Five9AIPanel() {
  const { pipeline } = useSimulation();
  const { callParams } = useDashboard();
  const { five9Phase, five9Session, liveCallIntent } = useAudioEngine();
  const [confidenceModalOpen, setConfidenceModalOpen] = useState(false);
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);
  const [systemActivityOpen, setSystemActivityOpen] = useState(false);

  const session = five9Session;
  const phase = five9Phase;
  const activeStageIdx = phaseToStageIndex(phase);
  const isIdle = phase === "idle";
  const isAwaiting = phase === "awaiting";
  const isFailure = FAILURE_PHASES.includes(phase);
  const isRetry = RETRY_PHASES.includes(phase);

  const displayIntent = session?.intent || liveCallIntent || "";
  const isEscalated = session?.escalated || false;
  const confidenceScore = session?.confidenceScore || pipeline.confidence;
  const isDataPhase = phase === "data-retrieving" || phase === "data-retrieved" || phase === "data-timeout" || phase === "data-retry";
  const edgeCase = session?.edgeCaseType || "none";

  // Check which phases have been reached
  const isProviderVerified = session?.providerVerified && activeStageIdx > 0 && phase !== "provider-verifying" && phase !== "provider-failed";
  const isProviderFailed = phase === "provider-failed";
  const isProviderRetrying = phase === "provider-retry";

  const isMemberVerified = session?.memberVerified && activeStageIdx > 1 && phase !== "member-verifying" && phase !== "member-failed" && phase !== "dob-mismatch";
  const isMemberFailed = phase === "member-failed";
  const isDobMismatch = phase === "dob-mismatch";
  const isMemberRetrying = phase === "member-retry";

  const isIntentClassified = activeStageIdx >= 2 && (phase === "intent-classified" || activeStageIdx > 2);
  const hasResponse = activeStageIdx >= 4 && (phase === "response-ready" || activeStageIdx > 4);

  const isDataTimeout = phase === "data-timeout";
  const isDataRetry = phase === "data-retry";

  const complianceFlags = [
    { label: "HIPAA Compliant", ok: true },
    { label: "PII Masked", ok: true },
    { label: "Audit Logged", ok: true },
    { label: "Escalation Policy", ok: !isEscalated },
  ];

  // Provider verification card state
  function getProviderCardState() {
    if (isProviderFailed) return { bg: "bg-amber-500/10 border-amber-500/30", icon: "amber", label: "Provider Not Found", showData: true, failed: true };
    if (isProviderRetrying) return { bg: "bg-amber-500/5 border-amber-500/20 animate-pulse", icon: "retry", label: "Retrying Verification…", showData: false, failed: false };
    if (phase === "provider-verifying") return { bg: "bg-primary/5 border-primary/20 animate-pulse", icon: "loading", label: "Verifying…", showData: false, failed: false };
    if (isProviderVerified) return { bg: "bg-emerald-500/5 border-emerald-500/20", icon: "success", label: "Provider Verified", showData: true, failed: false };
    return { bg: "bg-secondary/30 border-border", icon: "pending", label: "Provider Pending", showData: false, failed: false };
  }

  function getMemberCardState() {
    if (isMemberFailed) return { bg: "bg-amber-500/10 border-amber-500/30", icon: "amber", label: "Member Not Found", showData: true, failed: true };
    if (isDobMismatch) return { bg: "bg-amber-500/10 border-amber-500/30", icon: "amber", label: "DOB Mismatch", showData: true, failed: true };
    if (isMemberRetrying) return { bg: "bg-amber-500/5 border-amber-500/20 animate-pulse", icon: "retry", label: "Retrying Verification…", showData: false, failed: false };
    if (phase === "member-verifying") return { bg: "bg-primary/5 border-primary/20 animate-pulse", icon: "loading", label: "Verifying…", showData: false, failed: false };
    if (isMemberVerified) return { bg: "bg-emerald-500/5 border-emerald-500/20", icon: "success", label: "Member Verified", showData: true, failed: false };
    return { bg: "bg-secondary/30 border-border", icon: "pending", label: "Member Pending", showData: false, failed: false };
  }

  function renderVerificationIcon(type: string) {
    switch (type) {
      case "loading": return <Loader2 className="h-3 w-3 text-primary animate-spin" />;
      case "success": return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
      case "amber": return <XCircle className="h-3 w-3 text-amber-600" />;
      case "retry": return <RefreshCw className="h-3 w-3 text-amber-500 animate-spin" />;
      default: return <div className="w-3 h-3 rounded-full bg-secondary" />;
    }
  }

  const provState = getProviderCardState();
  const memState = getMemberCardState();

  return (
    <div className="p-3 space-y-2.5 five9-panel-bg h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <img src={penguinAiLogo} alt="Penguin AI" className="h-3.5" />
          <span className="type-h3 text-foreground">Provider Orchestration</span>
        </div>
        {session && <span className="type-micro text-five9-muted font-mono">{session.sessionId.slice(0, 12)}</span>}
      </div>

      {/* Awaiting state */}
      {isAwaiting && (
        <div className="five9-card p-3 flex items-center gap-2 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          <span className="text-[11px] text-muted-foreground">Awaiting Caller Input…</span>
        </div>
      )}

      {/* Idle state */}
      {isIdle && (
        <div className="five9-card p-4 text-center">
          <span className="text-[11px] text-muted-foreground">Enable Live Simulation to begin orchestration</span>
        </div>
      )}

      {/* ── PIPELINE ── */}
      {!isIdle && (
        <div className="five9-card p-2.5 space-y-2 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <img src={penguinLogo} alt="" className="h-3 w-3 object-contain" />
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted">Processing Pipeline</span>
          </div>
          <div className="flex items-center gap-0.5 flex-wrap">
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive = i === activeStageIdx;
              const isCompleted = i < activeStageIdx;
              const isFailed = isActive && (isFailure || isRetry);
              return (
                <div key={stage.label} className="flex items-center gap-0.5 shrink-0">
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-300 ${
                    isFailed
                      ? "bg-amber-500/20 text-amber-700 border border-amber-500/30"
                      : isActive
                        ? "five9-accent-bg text-white animate-pulse"
                        : isCompleted
                          ? "five9-accent-bg text-white"
                          : "bg-secondary text-five9-muted"
                  }`}>
                    <stage.icon className="h-2.5 w-2.5" />
                    <span className="hidden xl:inline">{stage.label}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight className={`h-2 w-2 ${isCompleted ? "text-five9-accent" : "text-five9-muted/30"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VERIFICATION STATUS ── */}
      {session && !isIdle && !isAwaiting && (
        <div className="five9-card p-2.5 space-y-1.5 animate-fade-in">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <UserCheck className="h-3 w-3" /> Verification Status
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* Provider */}
            <div className={`p-2 rounded border transition-all duration-500 ${provState.bg}`}>
              <div className="flex items-center gap-1 mb-0.5">
                {renderVerificationIcon(provState.icon)}
                <span className={`text-[10px] font-semibold ${
                  provState.failed ? "text-amber-700" : isProviderVerified ? "text-emerald-700" : "text-muted-foreground"
                }`}>
                  {provState.label}
                </span>
              </div>
              {provState.showData && (
                <div className="text-[9px] text-muted-foreground space-y-0.5 animate-fade-in">
                  <div>NPI: <span className="font-mono text-foreground">{session.providerNpi}</span></div>
                  {provState.failed ? (
                    <div className="text-amber-600 font-medium">Status: Not Recognized</div>
                  ) : (
                    <div>Confidence: <span className="font-mono text-foreground">{session.providerConfidence}%</span></div>
                  )}
                </div>
              )}
            </div>
            {/* Member */}
            <div className={`p-2 rounded border transition-all duration-500 ${memState.bg}`}>
              <div className="flex items-center gap-1 mb-0.5">
                {renderVerificationIcon(memState.icon)}
                <span className={`text-[10px] font-semibold ${
                  memState.failed ? "text-amber-700" : isMemberVerified ? "text-emerald-700" : "text-muted-foreground"
                }`}>
                  {memState.label}
                </span>
              </div>
              {memState.showData && (
                <div className="text-[9px] text-muted-foreground space-y-0.5 animate-fade-in">
                  <div>ID: <span className="font-mono text-foreground">{session.memberId}</span></div>
                  {memState.failed && isDobMismatch ? (
                    <div className="text-amber-600 font-medium">DOB does not match records</div>
                  ) : memState.failed ? (
                    <div className="text-amber-600 font-medium">Member not located</div>
                  ) : (
                    <div>DOB Confirmed · <span className="font-mono text-foreground">{session.memberConfidence}%</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INTENT CLASSIFICATION ── */}
      {session && isIntentClassified && (
        <div className="five9-card p-2.5 space-y-1 animate-fade-in">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Intent Classified
          </span>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-foreground">{displayIntent}</span>
            <span className="text-[11px] font-mono font-semibold text-primary">{confidenceScore}%</span>
          </div>
        </div>
      )}

      {phase === "intent-classifying" && (
        <div className="five9-card p-2.5 space-y-1 animate-pulse">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Classifying Intent…
          </span>
          <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
        </div>
      )}

      {/* ── DATA RETRIEVAL ── */}
      {session && activeStageIdx >= 3 && !isAwaiting && (
        <div className={`five9-card p-2.5 space-y-1.5 animate-fade-in ${isDataTimeout ? "border-amber-500/30" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
              <Database className="h-3 w-3" /> Reflect Data Retrieval
            </span>
            {isDataPhase && !isDataTimeout && (
              <Activity className="h-3 w-3 text-primary animate-pulse" />
            )}
            {isDataTimeout && (
              <Clock className="h-3 w-3 text-amber-500 animate-pulse" />
            )}
            {isDataRetry && (
              <RefreshCw className="h-3 w-3 text-primary animate-spin" />
            )}
          </div>

          {/* Timeout banner */}
          {isDataTimeout && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5 flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
              <span className="text-[10px] text-amber-700 font-medium">Data Retrieval Timeout — Retrying…</span>
            </div>
          )}
          {isDataRetry && (
            <div className="bg-primary/5 border border-primary/20 rounded p-1.5 flex items-center gap-1.5 animate-fade-in">
              <RefreshCw className="h-3 w-3 text-primary animate-spin shrink-0" />
              <span className="text-[10px] text-primary font-medium">Retry in progress…</span>
            </div>
          )}

          <div className="space-y-0.5">
            {DATA_SOURCES.map((src) => (
              <div key={src.name} className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  isDataTimeout ? "bg-amber-500 animate-pulse" : isDataPhase ? "bg-primary animate-pulse" : "bg-emerald-500"
                }`} />
                <span className="text-foreground font-medium">{src.name}</span>
                {src.detail && <span className="text-muted-foreground">({src.detail})</span>}
              </div>
            ))}
          </div>
          {/* Dynamic API calls */}
          <div className="mt-1.5 space-y-1 border-t border-border pt-1.5">
            {session.apiCalls.map((call, i) => (
              <div
                key={i}
                className={`rounded p-1.5 text-[9px] font-mono space-y-0.5 animate-fade-in ${
                  call.status === 404 ? "bg-red-500/5 border border-red-500/20"
                  : call.isTimeout ? "bg-amber-500/5 border border-amber-500/20"
                  : call.isRetry ? "bg-emerald-500/5 border border-emerald-500/20"
                  : "bg-secondary/50"
                }`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-semibold">{call.endpoint}</span>
                  <span className={
                    call.status === 404 ? "text-red-600 font-semibold"
                    : call.status === 504 ? "text-amber-600 font-semibold"
                    : call.isRetry ? "text-emerald-600 font-semibold"
                    : "text-emerald-600"
                  }>
                    {call.status === 404 ? "404 Not Found"
                     : call.status === 504 ? "504 Timeout"
                     : call.isRetry ? `${call.status} OK (Retry)`
                     : `${call.status} OK`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Source: {call.source}</span>
                  <span>Latency: <LatencyCounter target={call.latency} isTimeout={call.isTimeout} /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STRUCTURED RESPONSE ── */}
      {session?.structuredResponse && hasResponse && (
        <div className={`five9-card p-2.5 space-y-1.5 animate-fade-in ${
          edgeCase === "claim_not_found" ? "border-red-500/20" : "five9-active-border"
        }`}>
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <FileText className="h-3 w-3" /> Structured Response
          </span>
          <div className={`rounded p-2 space-y-1 ${edgeCase === "claim_not_found" ? "bg-red-500/5" : "bg-secondary/30"}`}>
            {session.structuredResponse.fields.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{f.label}</span>
                <span className={`font-semibold font-mono ${
                  f.value.includes("Not") || f.value.includes("404") ? "text-red-600" : "text-foreground"
                }`}>{f.value}</span>
              </div>
            ))}
          </div>
          <div className="pt-1 border-t border-border">
            <span className="type-micro text-five9-muted block mb-0.5">Generated Response:</span>
            <p className="text-[11px] text-foreground leading-relaxed">{session.structuredResponse.generatedResponse}</p>
          </div>
        </div>
      )}

      {/* ── CONFIDENCE + ESCALATION ── */}
      {session && activeStageIdx >= 5 && (
        <button
          onClick={() => setConfidenceModalOpen(true)}
          className="five9-card p-2.5 space-y-1.5 w-full text-left hover:border-five9-accent/30 transition-colors animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
              <Shield className="h-3 w-3" /> Confidence Score
            </span>
            <span className={`text-[14px] font-mono font-bold ${
              confidenceScore > callParams.accuracyPct * 100 ? "text-emerald-600" : "text-amber-600"
            }`}>
              {confidenceScore}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 five9-accent-bg"
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Threshold: {(callParams.accuracyPct * 100).toFixed(0)}%</span>
            <span className={`font-semibold ${!isEscalated ? "text-emerald-600" : "text-amber-600"}`}>
              {!isEscalated ? "Auto-Resolved" : "Escalation Required"}
            </span>
          </div>
        </button>
      )}

      {/* Escalation banner */}
      {isEscalated && (activeStageIdx >= 5 || phase === "escalation") && (
        <div className="five9-card p-2.5 border-amber-500/30 bg-amber-50 space-y-1 animate-fade-in">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 animate-pulse">
            <AlertCircle className="h-3 w-3" />
            Escalation Detected
          </div>
          <p className="text-[10px] text-amber-600">
            {session?.escalationReason || "Confidence Below Threshold"}. Routing to Senior Agent. Full context + transcript transferred.
          </p>
        </div>
      )}

      {/* ── COMPLIANCE ── */}
      {session && activeStageIdx >= 3 && (
        <button
          onClick={() => setComplianceModalOpen(true)}
          className="five9-card p-2.5 space-y-1.5 w-full text-left hover:border-five9-accent/30 transition-colors animate-fade-in"
        >
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <Lock className="h-3 w-3" /> Real-time Compliance
          </span>
          <div className="grid grid-cols-2 gap-1">
            {complianceFlags.map((flag) => (
              <div key={flag.label} className="flex items-center gap-1">
                {flag.ok ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ) : (
                  <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                )}
                <span className={`text-[10px] ${flag.ok ? "text-foreground" : "text-amber-600"}`}>{flag.label}</span>
              </div>
            ))}
          </div>
        </button>
      )}

      {/* ── SYSTEM ACTIVITY ── */}
      {session && (
        <div className="five9-card overflow-hidden animate-fade-in">
          <button
            onClick={() => setSystemActivityOpen(!systemActivityOpen)}
            className="w-full p-2.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
          >
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
              <Server className="h-3 w-3" /> System Activity
            </span>
            {systemActivityOpen ? <ChevronUp className="h-3 w-3 text-five9-muted" /> : <ChevronDown className="h-3 w-3 text-five9-muted" />}
          </button>
          {systemActivityOpen && (
            <div className="px-2.5 pb-2.5 space-y-1 text-[9px] font-mono animate-fade-in">
              {[
                { label: "Five9 Session ID", value: session.sessionId },
                { label: "Reflect API Token", value: "●●●●●●●●" + session.sessionId.slice(-4) },
                { label: "Caller Type", value: session.callerType },
                { label: "Edge Case", value: edgeCase === "none" ? "None" : edgeCase.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
                { label: "Audit Log", value: "Created" },
                { label: "Transcript", value: "Stored" },
                { label: "Access Logged", value: "Yes" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-0.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <DetailModal open={confidenceModalOpen} onClose={() => setConfidenceModalOpen(false)} title="AI Confidence Analysis">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
              <span className="text-[9px] text-muted-foreground uppercase block">Current</span>
              <span className="text-xl font-bold font-mono text-primary">{confidenceScore}%</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
              <span className="text-[9px] text-muted-foreground uppercase block">Threshold</span>
              <span className="text-xl font-bold font-mono text-foreground">{(callParams.accuracyPct * 100).toFixed(0)}%</span>
            </div>
          </div>
          {edgeCase !== "none" && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] font-semibold text-amber-700">Edge Case: {edgeCase.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
              <p className="text-[9px] text-amber-600 mt-0.5">Confidence reduced due to verification anomaly.</p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Signal Breakdown</span>
            {[
              { label: "Provider Match", value: edgeCase === "wrong_npi" ? Math.max(confidenceScore - 15, 55) : (session?.providerConfidence || 99) },
              { label: "Member Match", value: ["invalid_member_id", "dob_mismatch"].includes(edgeCase) ? Math.max(confidenceScore - 12, 60) : (session?.memberConfidence || 98) },
              { label: "Intent Match", value: confidenceScore },
              { label: "Policy Alignment", value: Math.min(confidenceScore + 2, 99) },
              { label: "Historical Pattern", value: Math.max(confidenceScore - 4, 82) },
              { label: "Data Retrieval", value: edgeCase === "api_timeout" ? Math.max(confidenceScore - 10, 58) : Math.min(confidenceScore + 1, 97) },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{s.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${s.value < 75 ? "bg-red-500" : s.value < 85 ? "bg-amber-500" : ""}`} style={{ width: `${s.value}%`, ...( s.value >= 85 ? {} : {}) }} />
                    {s.value >= 85 && <div className="h-full rounded-full five9-accent-bg -mt-1" style={{ width: `${s.value}%` }} />}
                  </div>
                  <span className={`font-mono font-medium ${s.value < 75 ? "text-red-600" : s.value < 85 ? "text-amber-600" : "text-foreground"}`}>{s.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DetailModal>

      <DetailModal open={complianceModalOpen} onClose={() => setComplianceModalOpen(false)} title="Compliance Detail">
        <div className="space-y-3">
          {complianceFlags.map(flag => (
            <div key={flag.label} className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-2 mb-1">
                {flag.ok ? <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                <span className="text-[11px] font-semibold text-foreground">{flag.label}</span>
                <span className={`text-[9px] font-medium ml-auto ${flag.ok ? "text-emerald-600" : "text-amber-600"}`}>{flag.ok ? "PASS" : "WARNING"}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {flag.label === "HIPAA Compliant" && "All PHI/PII data encrypted in transit and at rest. Access logged per HIPAA §164.312."}
                {flag.label === "PII Masked" && "SSNs, DOBs, and member IDs masked in all AI processing pipelines."}
                {flag.label === "Audit Logged" && "Complete interaction audit trail maintained with timestamp, agent ID, and AI decision rationale."}
                {flag.label === "Escalation Policy" && (flag.ok ? "Confidence above threshold. Automated resolution permitted." : "Below threshold. Escalation required per policy.")}
              </p>
            </div>
          ))}
        </div>
      </DetailModal>
    </div>
  );
}
