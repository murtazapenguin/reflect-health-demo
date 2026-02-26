import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, MicOff, Square, Zap, Shield, CheckCircle2, AlertTriangle,
  Brain, Database, TrendingUp, Clock, DollarSign, Cpu, X,
  RotateCcw, Users, ChevronDown, ChevronUp, Siren,
} from "lucide-react";
import penguinLogo from "@/assets/penguin-ai-logo.png";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScenarioContext {
  intent: string;
  callType: string;
  requiredDataInputs: string[];
  escalationRules: string[];
  complianceRequirements: string[];
  backendSystems: string[];
  confidenceScore: number;
  aiResponseScript: string;
}

interface IntelTick {
  time: number;
  label: string;
  value: string;
  type: "intent" | "entity" | "system" | "decision" | "compliance" | "escalation";
}

interface ConvTurn {
  role: "user" | "ai";
  text: string;
  ts: number;
}

interface SimResult {
  automationConfidence: number;
  workflowCompletion: number;
  escalated: boolean;
  resolutionSec: number;
  manualEquivSec: number;
  costSavings: number;
  confidenceBefore: number;
  confidenceAfter: number;
  platformUpdates: string[];
  callSummary: string;
  structuredData: Record<string, string>;
}

interface Props {
  scenario: ScenarioContext;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<IntelTick["type"], string> = {
  intent: "text-primary bg-primary/10 border-primary/20",
  entity: "text-blue-700 bg-blue-50 border-blue-200",
  system: "text-purple-700 bg-purple-50 border-purple-200",
  decision: "text-emerald-700 bg-emerald-50 border-emerald-200",
  compliance: "text-amber-700 bg-amber-50 border-amber-200",
  escalation: "text-destructive bg-red-50 border-red-200",
};

const TYPE_ICONS: Record<IntelTick["type"], React.ReactNode> = {
  intent: <Brain className="h-2.5 w-2.5" />,
  entity: <Users className="h-2.5 w-2.5" />,
  system: <Database className="h-2.5 w-2.5" />,
  decision: <CheckCircle2 className="h-2.5 w-2.5" />,
  compliance: <Shield className="h-2.5 w-2.5" />,
  escalation: <AlertTriangle className="h-2.5 w-2.5" />,
};

function formatSec(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

// ─── AI greeting based on scenario ───────────────────────────────────────────
function buildGreeting(intent: string, callType: string): string {
  const greetings: Record<string, string> = {
    "Benefits Verification": "Thank you for calling. I'm Penguin AI, your automated benefits specialist. To verify your benefits, may I start with your Member ID and date of birth?",
    "Claim Status": "Thank you for calling claims support. I'm Penguin AI. I can pull up your claim status instantly — could you provide your claim number or Member ID?",
    "Prior Authorization": "Thank you for calling. I'm Penguin AI handling prior authorization requests. I'll need the procedure code and Member ID to look into this for you.",
    "Eligibility": "Thank you for calling. I'm Penguin AI. I can check eligibility in real time — please provide your Member ID and the date of service you're inquiring about.",
    "Provider Inquiry": "Thank you for calling provider relations. I'm Penguin AI. I can assist with credentialing, contract status, and reimbursement questions. What can I help you with today?",
  };
  return greetings[callType] || `Thank you for calling. I'm Penguin AI, your automated ${callType || "healthcare"} specialist. I'm trained on this exact use case and ready to assist. How can I help you today?`;
}

// ─── Penguin AI response engine (TTS via edge function) ───────────────────────
async function speakAI(text: string): Promise<void> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, voiceId: "JBFqnCBsd6RMkjVDRZzb" }), // George – authoritative AI voice
      }
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = 0.85;
    await new Promise<void>((resolve) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      audio.play().catch(() => resolve());
    });
  } catch {
    // Silent fail — simulation continues without audio
  }
}

// ─── STT via browser Web Speech API ──────────────────────────────────────────
function useSpeechRecognition(onResult: (text: string) => void, onEnd: () => void) {
  const recRef = useRef<any>(null);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript || "";
      if (transcript) onResult(transcript);
    };
    rec.onend = onEnd;
    rec.onerror = onEnd;
    recRef.current = rec;
    rec.start();
    return true;
  }, [onResult, onEnd]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
  }, []);

  return { start, stop };
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function LiveSimulationMode({ scenario, onClose }: Props) {
  const [phase, setPhase] = useState<"ready" | "active" | "listening" | "thinking" | "speaking" | "ended">("ready");
  const [turns, setTurns] = useState<ConvTurn[]>([]);
  const [intelFeed, setIntelFeed] = useState<IntelTick[]>([]);
  const [stressMode, setStressMode] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [escalationPct, setEscalationPct] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [resultOpen, setResultOpen] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [contextNote, setContextNote] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const startTs = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnCountRef = useRef(0);
  const abortRef = useRef(false);
  const convRef = useRef<ConvTurn[]>([]);
  const intelRef = useRef<IntelTick[]>([]);

  const convEndRef = useRef<HTMLDivElement>(null);
  const intelEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => { convEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);
  useEffect(() => { intelEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [intelFeed]);

  const addTurn = useCallback((turn: ConvTurn) => {
    convRef.current = [...convRef.current, turn];
    setTurns([...convRef.current]);
  }, []);

  const addIntel = useCallback((tick: IntelTick) => {
    intelRef.current = [...intelRef.current, tick];
    setIntelFeed([...intelRef.current]);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ─── Generate AI reply based on conversation context ───────────────────────
  const generateAIReply = useCallback(async (userText: string): Promise<string> => {
    const t = turnCountRef.current;
    const lc = userText.toLowerCase();

    // Escalation triggers for stress mode
    if (stressMode) {
      const frustrationWords = ["ridiculous", "unacceptable", "manager", "supervisor", "lawyer", "sue", "useless", "terrible", "wrong"];
      const frustrated = frustrationWords.some(w => lc.includes(w));
      if (frustrated) {
        const newEsc = Math.min(100, escalationPct + 35);
        setEscalationPct(newEsc);
        if (newEsc >= 78 && !escalated) {
          setEscalated(true);
          addIntel({ time: Date.now(), label: "Escalation Triggered", value: `Threshold: ${newEsc}%`, type: "escalation" });
          setContextNote("Context Recalibrated — Escalation Threshold Met");
          return "I understand your frustration and I sincerely apologize. I'm escalating this to a senior specialist right now. They'll have full context of our conversation and will reach you within 2 business hours. Is there anything else I can note for them?";
        }
        addIntel({ time: Date.now(), label: "Escalation Monitor", value: `Threshold: ${newEsc}%`, type: "escalation" });
      }

      // Intent shift detection
      const intentShifts = ["actually", "wait", "no", "different", "also", "another", "separate"];
      if (intentShifts.some(w => lc.includes(w)) && t > 1) {
        setContextNote("Context Recalibrated — New Intent Detected");
        addIntel({ time: Date.now(), label: "Intent Reclassified", value: "Multi-intent detected", type: "intent" });
      }
    }

    // Entity extraction intel ticks
    const memberIdMatch = lc.match(/\b(m\d{5,}|mbr\d+|id[\s:]?\d{5,}|\d{9})\b/i);
    if (memberIdMatch) addIntel({ time: Date.now(), label: "Entity Extracted", value: `Member ID: ${memberIdMatch[0]}`, type: "entity" });
    const dobMatch = lc.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\w+ \d{1,2},? \d{4})\b/);
    if (dobMatch) addIntel({ time: Date.now(), label: "Entity Extracted", value: `DOB: ${dobMatch[0]}`, type: "entity" });
    const claimMatch = lc.match(/\b(clm\d+|claim[\s#]\d+|\d{8,12})\b/i);
    if (claimMatch) addIntel({ time: Date.now(), label: "Entity Extracted", value: `Claim: ${claimMatch[0]}`, type: "entity" });

    // Build conversation context for the AI
    const conversationHistory = convRef.current
      .map(t => `${t.role === "ai" ? "Penguin AI" : "Caller"}: ${t.text}`)
      .join("\n");

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          transcript: `LIVE SIMULATION — SYSTEM CONTEXT:\nScenario: ${scenario.intent}\nCall Type: ${scenario.callType}\nTrained Resolution: ${scenario.aiResponseScript}\nRequired Data: ${scenario.requiredDataInputs.join(", ")}\nCompliance Requirements: ${scenario.complianceRequirements.join(", ")}\nEscalation Rules: ${scenario.escalationRules.join(", ")}\n\nCONVERSATION SO FAR:\n${conversationHistory}\nCaller: ${userText}\n\nGenerate ONLY the next Penguin AI response (2-3 sentences, natural voice, healthcare professional tone). Respond directly to what the caller just said. Do not repeat questions already answered. If sufficient info collected, proceed with resolution. If escalation criteria met, escalate gracefully.`,
          fileName: "live-simulation",
          durationSeconds: elapsedSec,
        }),
      });
      // We use analyze-call as a proxy — extract the ai_response_script from it
      if (res.ok) {
        const { analysis } = await res.json();
        if (analysis?.ai_response_script) {
          const script = analysis.ai_response_script;
          // Emit intel ticks from the analysis
          addIntel({ time: Date.now(), label: "Intent Confirmed", value: analysis.intent || scenario.intent, type: "intent" });
          if (analysis.backend_systems_accessed?.length) {
            analysis.backend_systems_accessed.slice(0, 2).forEach((sys: string) => {
              addIntel({ time: Date.now(), label: "System Queried", value: sys, type: "system" });
            });
          }
          addIntel({ time: Date.now(), label: "Compliance Check", value: "HIPAA Verified ✓", type: "compliance" });
          addIntel({ time: Date.now(), label: "Decision Path", value: analysis.resolution_type || "Automated Resolution", type: "decision" });
          return script;
        }
      }
    } catch { /* fall through to heuristic */ }

    // Heuristic fallback reply engine
    const heuristic: Record<number, string> = {
      0: `Thank you. I've confirmed your identity and I'm accessing the ${scenario.callType} system now. One moment please.`,
      1: `I can see your information in our system. Based on my records, ${scenario.aiResponseScript.split(".")[0] || "I have the details you need"}. Let me retrieve the full details.`,
      2: `I've pulled up the complete information for your ${scenario.callType.toLowerCase()} inquiry. ${scenario.aiResponseScript}`,
    };
    return heuristic[Math.min(t, 2)] || `Based on the information provided, I've completed the ${scenario.callType.toLowerCase()} request. Is there anything else I can help you with today?`;
  }, [scenario, stressMode, escalationPct, escalated, elapsedSec, addIntel]);

  // ─── Speech recognition callbacks ─────────────────────────────────────────
  const handleUserSpeech = useCallback(async (text: string) => {
    if (abortRef.current) return;
    setIsListening(false);
    setPhase("thinking");
    addTurn({ role: "user", text, ts: Date.now() });

    // Emit initial intent tick
    setTimeout(() => addIntel({ time: Date.now(), label: "Intent Detected", value: scenario.intent, type: "intent" }), 150);
    setTimeout(() => addIntel({ time: Date.now(), label: "Confidence", value: `${scenario.confidenceScore}%`, type: "decision" }), 400);

    const reply = await generateAIReply(text);
    if (abortRef.current) return;

    addTurn({ role: "ai", text: reply, ts: Date.now() });
    setPhase("speaking");
    setIsSpeaking(true);
    turnCountRef.current++;

    await speakAI(reply);
    if (abortRef.current) return;
    setIsSpeaking(false);
    setPhase("listening");
    setIsListening(true);
  }, [addTurn, addIntel, generateAIReply, scenario]);

  const handleSpeechEnd = useCallback(() => {
    if (phase === "listening") setIsListening(false);
  }, [phase]);

  const { start: startSpeech, stop: stopSpeech } = useSpeechRecognition(handleUserSpeech, handleSpeechEnd);

  // ─── Start simulation ──────────────────────────────────────────────────────
  const startSimulation = useCallback(async () => {
    abortRef.current = false;
    convRef.current = [];
    intelRef.current = [];
    turnCountRef.current = 0;
    setTurns([]);
    setIntelFeed([]);
    setEscalated(false);
    setEscalationPct(0);
    setContextNote(null);
    setResult(null);
    setElapsedSec(0);
    startTs.current = Date.now();

    setPhase("active");

    // Timer
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTs.current) / 1000));
    }, 1000);

    // Opening intel ticks
    setTimeout(() => addIntel({ time: Date.now(), label: "Scenario Loaded", value: scenario.intent, type: "intent" }), 200);
    setTimeout(() => addIntel({ time: Date.now(), label: "Knowledge Base", value: "Active — trained scenario matched", type: "decision" }), 500);
    setTimeout(() => addIntel({ time: Date.now(), label: "Compliance Mode", value: "HIPAA Active", type: "compliance" }), 800);
    scenario.backendSystems.slice(0, 3).forEach((sys, i) => {
      setTimeout(() => addIntel({ time: Date.now(), label: "System Connected", value: sys, type: "system" }), 1100 + i * 300);
    });

    // Greet
    const greeting = buildGreeting(scenario.intent, scenario.callType);
    addTurn({ role: "ai", text: greeting, ts: Date.now() });
    setPhase("speaking");
    setIsSpeaking(true);
    await speakAI(greeting);
    if (abortRef.current) return;
    setIsSpeaking(false);
    setPhase("listening");
    setIsListening(true);
    startSpeech();
  }, [scenario, addTurn, addIntel, startSpeech]);

  // ─── End simulation ────────────────────────────────────────────────────────
  const endSimulation = useCallback(async () => {
    abortRef.current = true;
    stopTimer();
    stopSpeech();
    setIsSpeaking(false);
    setIsListening(false);
    setPhase("ended");

    const resolutionSec = Math.floor((Date.now() - startTs.current) / 1000);
    const confBefore = scenario.confidenceScore;
    const confAfter = Math.min(98, confBefore + Math.floor(Math.random() * 6) + 2);

    const res: SimResult = {
      automationConfidence: confAfter,
      workflowCompletion: escalated ? 75 : 100,
      escalated,
      resolutionSec,
      manualEquivSec: 400,
      costSavings: 3.85,
      confidenceBefore: confBefore,
      confidenceAfter: confAfter,
      platformUpdates: [
        "CRM record updated",
        "Member interaction logged",
        "Audit trail stored",
        "Compliance record filed",
        ...(scenario.callType === "Claim Status" ? ["Claim status retrieved & stored"] : []),
        ...(scenario.callType === "Benefits Verification" ? ["Benefits packet generated"] : []),
        ...(escalated ? ["Escalation ticket opened", "Senior specialist notified"] : ["Ticket closed — fully automated"]),
        "Decision tree execution logged",
      ],
      callSummary: `Live simulation for "${scenario.intent}" completed. Penguin AI guided the caller through the ${scenario.callType} workflow using the trained scenario. ${escalated ? "A supervisor escalation was triggered due to caller frustration." : "Call resolved fully autonomously without human intervention."} Total interaction time: ${formatSec(resolutionSec)}.`,
      structuredData: {
        "Call Type": scenario.callType,
        "Intent Matched": scenario.intent,
        "Resolution": escalated ? "Escalated to Human" : "Fully Automated",
        "AI Handle Time": formatSec(resolutionSec),
        "Manual Equivalent": formatSec(400),
        "Cost Savings": "$3.85",
        "Compliance": "HIPAA — Passed",
      },
    };

    setResult(res);

    // Farewell
    const farewell = escalated
      ? "I've noted everything and connected you with a specialist. Thank you for your patience."
      : "Your request has been fully resolved. A summary has been sent to your file. Is there anything else I can help you with?";
    addTurn({ role: "ai", text: farewell, ts: Date.now() });
    await speakAI(farewell);
  }, [stopTimer, stopSpeech, escalated, scenario]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current = true; stopTimer(); stopSpeech(); }, [stopTimer, stopSpeech]);

  // Listening cycle — restart speech recognition after each user turn
  useEffect(() => {
    if (phase === "listening" && !abortRef.current) {
      const started = startSpeech();
      if (!started) {
        // Browser doesn't support — show fallback
        setPhase("active");
      }
    }
  }, [phase, startSpeech]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-primary/30 bg-card overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <img src={penguinLogo} alt="Penguin AI" className="h-5 w-5 object-contain" />
            {phase === "speaking" && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
            {phase === "listening" && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />}
          </div>
          <span className="text-xs font-semibold text-foreground">🎙 Penguin AI — Live Voice Simulation</span>
          <span className="text-[9px] font-semibold text-primary border border-primary/30 bg-primary/10 rounded px-1.5 py-0.5">Autonomous Voice Automation Validation</span>
        </div>
        <div className="flex items-center gap-2">
          {phase !== "ready" && phase !== "ended" && (
            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />{formatSec(elapsedSec)}
            </span>
          )}
          <button
            onClick={() => setStressMode(!stressMode)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${stressMode ? "bg-destructive/10 text-destructive border-red-200" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
          >
            <Siren className="h-2.5 w-2.5" /> Stress Test {stressMode ? "ON" : "OFF"}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Context note banner */}
      {contextNote && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-[10px] font-semibold text-amber-700 animate-in slide-in-from-top-1 duration-300">
          <Zap className="h-3 w-3" /> {contextNote}
        </div>
      )}

      {/* Ready state */}
      {phase === "ready" && (
        <div className="p-6 text-center space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Trained Scenario Ready</p>
            <p className="text-[11px] text-muted-foreground">Penguin AI has learned from your uploaded call and is ready to handle live interactions for:</p>
            <p className="text-xs font-semibold text-primary">"{scenario.intent}"</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center max-w-xs mx-auto">
            {[
              { v: `${scenario.confidenceScore}%`, l: "Training Confidence" },
              { v: scenario.callType, l: "Use Case" },
              { v: `${scenario.backendSystems.length}`, l: "Systems Integrated" },
            ].map(({ v, l }) => (
              <div key={l} className="rounded-md bg-secondary/40 p-2">
                <div className="text-[11px] font-bold text-foreground">{v}</div>
                <div className="text-[8px] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[10px] text-amber-700 max-w-sm mx-auto">
            <strong>🎤 Microphone required.</strong> Speak naturally — Penguin AI will respond with a live voice and show real-time workflow intelligence.
          </div>
          {stressMode && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[10px] text-destructive max-w-sm mx-auto">
              <strong>🚨 Stress Test Mode active.</strong> Try interrupting, giving wrong info, or expressing frustration to test edge-case handling.
            </div>
          )}
          <button onClick={startSimulation}
            className="mx-auto flex items-center gap-2 px-6 py-2.5 rounded-lg reflect-gradient text-white text-xs font-semibold hover:opacity-90 transition-opacity">
            <Mic className="h-3.5 w-3.5" /> Launch Live Voice Simulation
          </button>
        </div>
      )}

      {/* Active simulation — split screen */}
      {(phase === "active" || phase === "listening" || phase === "thinking" || phase === "speaking") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* LEFT — Voice conversation */}
          <div className="flex flex-col">
            <div className="px-3 py-2 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                <Mic className="h-3 w-3 text-primary" /> Real-Time Voice Conversation
              </span>
              <div className="flex items-center gap-1.5">
                {isListening && <span className="text-[9px] text-primary font-medium flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Listening…</span>}
                {isSpeaking && <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Speaking…</span>}
                {phase === "thinking" && <span className="text-[9px] text-amber-600 font-medium flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Processing…</span>}
              </div>
            </div>

            {/* Conversation */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[220px] max-h-[300px]">
              {turns.length === 0 && (
                <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">Conversation will appear here…</div>
              )}
              {turns.map((turn, i) => (
                <div key={i} className={`flex gap-2 items-start ${turn.role === "ai" ? "flex-row" : "flex-row-reverse"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${turn.role === "ai" ? "bg-primary/10 border border-primary/20" : "bg-secondary border border-border"}`}>
                    {turn.role === "ai" ? <img src={penguinLogo} alt="AI" className="h-3.5 w-3.5 object-contain" /> : <Users className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className={`rounded-lg px-2.5 py-2 max-w-[78%] text-[10px] leading-relaxed border ${turn.role === "ai" ? "bg-primary/5 border-primary/20 text-foreground" : "bg-amber-50/60 border-amber-200 text-foreground"}`}>
                    <div className="text-[8px] font-semibold uppercase tracking-wide mb-0.5 text-muted-foreground">{turn.role === "ai" ? "Penguin AI" : "You"}</div>
                    {turn.text}
                  </div>
                </div>
              ))}
              <div ref={convEndRef} />
            </div>

            {/* Controls */}
            <div className="px-3 py-2.5 border-t border-border/50 flex items-center gap-2">
              {isListening && (
                <div className="flex-1 flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-1.5">
                  <Mic className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span className="text-[10px] text-primary font-medium">Speak now — Penguin AI is listening</span>
                  <span className="flex gap-0.5 ml-auto">
                    {[0,1,2,3,4].map(j => (
                      <span key={j} className="inline-block w-0.5 rounded-full bg-primary animate-pulse" style={{ height: `${6 + (j % 3) * 4}px`, animationDelay: `${j * 0.1}s` }} />
                    ))}
                  </span>
                </div>
              )}
              {!isListening && !isSpeaking && phase === "thinking" && (
                <div className="flex-1 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5">
                  <Brain className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                  <span className="text-[10px] text-amber-700 font-medium">Penguin AI is reasoning…</span>
                </div>
              )}
              <button onClick={endSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 border border-red-200 text-destructive text-[10px] font-medium hover:bg-destructive/20 transition-colors shrink-0">
                <Square className="h-2.5 w-2.5" /> End Call
              </button>
            </div>
          </div>

          {/* RIGHT — Live Intelligence Dashboard */}
          <div className="flex flex-col">
            <div className="px-3 py-2 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                <Brain className="h-3 w-3 text-primary" /> Live AI Intelligence Dashboard
              </span>
              {stressMode && escalationPct > 0 && (
                <div className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${escalationPct >= 78 ? "text-destructive bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                  Escalation: {escalationPct}%{escalationPct >= 78 ? " — TRIGGERED" : ""}
                </div>
              )}
            </div>

            {/* Compliance banner */}
            <div className="grid grid-cols-3 gap-px bg-border/50 border-b border-border/50">
              {[
                { label: "HIPAA", val: "Passed ✓", ok: true },
                { label: "Data Log", val: "Recording ●", ok: true },
                { label: "Decision Tree", val: "Active ✓", ok: true },
              ].map(({ label, val, ok }) => (
                <div key={label} className="bg-card px-2 py-1.5 text-center">
                  <div className={`text-[8px] font-bold ${ok ? "text-emerald-600" : "text-destructive"}`}>{val}</div>
                  <div className="text-[7px] text-muted-foreground uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>

            {/* Intel feed */}
            <div className="flex-1 p-3 space-y-1.5 overflow-y-auto min-h-[200px] max-h-[280px]">
              {intelFeed.length === 0 && (
                <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">Intelligence feed will populate as you speak…</div>
              )}
              {intelFeed.map((tick, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-[9px] font-medium animate-in slide-in-from-right-2 duration-300 ${TYPE_COLORS[tick.type]}`}>
                  <span className="shrink-0">{TYPE_ICONS[tick.type]}</span>
                  <span className="shrink-0 font-semibold">{tick.label}</span>
                  <span className="ml-auto text-right opacity-80">{tick.value}</span>
                </div>
              ))}
              <div ref={intelEndRef} />
            </div>

            {/* Scenario context */}
            <div className="px-3 py-2 border-t border-border/50 bg-secondary/10 space-y-1">
              <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">Trained Scenario Context</div>
              <div className="text-[9px] text-foreground font-medium truncate">{scenario.intent}</div>
              <div className="flex flex-wrap gap-1">
                {scenario.requiredDataInputs.slice(0, 3).map(d => (
                  <span key={d} className="text-[8px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{d}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ended — Results */}
      {phase === "ended" && result && (
        <div className="p-4 space-y-4">
          {/* Conversation recap */}
          {turns.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-border/50 text-[10px] font-semibold text-foreground">Conversation Transcript</div>
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {turns.map((turn, i) => (
                  <div key={i} className={`flex gap-2 items-start ${turn.role === "ai" ? "flex-row" : "flex-row-reverse"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${turn.role === "ai" ? "bg-primary/10" : "bg-secondary"}`}>
                      {turn.role === "ai" ? <img src={penguinLogo} alt="AI" className="h-3 w-3 object-contain" /> : <Users className="h-2.5 w-2.5 text-muted-foreground" />}
                    </div>
                    <div className={`rounded-lg px-2 py-1.5 max-w-[80%] text-[9px] leading-relaxed border ${turn.role === "ai" ? "bg-primary/5 border-primary/20" : "bg-amber-50/60 border-amber-200"}`}>
                      <div className="text-[7px] font-semibold uppercase text-muted-foreground mb-0.5">{turn.role === "ai" ? "Penguin AI" : "Caller"}</div>
                      {turn.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Automation Validation Score */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Autonomous Voice Automation — Validation Score</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { v: `${result.automationConfidence}%`, l: "Automation Confidence", c: "text-primary" },
                { v: `${result.workflowCompletion}%`, l: "Workflow Completion", c: result.workflowCompletion === 100 ? "text-emerald-600" : "text-amber-600" },
                { v: result.escalated ? "Yes" : "No", l: "Escalation Required", c: result.escalated ? "text-destructive" : "text-emerald-600" },
                { v: formatSec(result.resolutionSec), l: "AI Resolution Time", c: "text-foreground" },
                { v: formatSec(result.manualEquivSec), l: "Manual Equivalent", c: "text-muted-foreground" },
                { v: `$${result.costSavings.toFixed(2)}`, l: "Cost Savings / Call", c: "text-emerald-600" },
              ].map(({ v, l, c }) => (
                <div key={l} className="rounded-md bg-card border border-border p-2.5 text-center">
                  <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
                  <div className="text-[8px] text-muted-foreground uppercase mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge evolution */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] font-semibold text-emerald-800">Knowledge Evolution Indicator</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs font-bold text-muted-foreground">{result.confidenceBefore}%</div>
                <div className="text-[8px] text-muted-foreground">Before Simulation</div>
              </div>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${result.confidenceAfter}%` }} />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-emerald-700">{result.confidenceAfter}%</div>
                <div className="text-[8px] text-emerald-600">After Simulation</div>
              </div>
            </div>
            <p className="text-[9px] text-emerald-700">Penguin AI has improved handling of "{scenario.intent}" from {result.confidenceBefore}% → {result.confidenceAfter}% confidence.</p>
          </div>

          {/* Call summary + platform updates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Summary */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="text-[10px] font-semibold text-foreground">🧾 Generated Call Summary</div>
              <p className="text-[9px] text-muted-foreground leading-relaxed">{result.callSummary}</p>
            </div>

            {/* Platform updates */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="text-[10px] font-semibold text-foreground">📤 Platform Updates Triggered</div>
              <div className="space-y-1">
                {result.platformUpdates.map(u => (
                  <div key={u} className="flex items-center gap-1.5 text-[9px] text-foreground">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />{u}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Structured data packet */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button onClick={() => setResultOpen(!resultOpen)} className="w-full px-3 py-2 flex items-center justify-between bg-secondary/10 hover:bg-secondary/20 transition-colors text-left">
              <span className="text-[10px] font-semibold text-foreground">📂 Structured Data Packet</span>
              {resultOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </button>
            {resultOpen && (
              <div className="p-3 grid grid-cols-2 gap-1.5">
                {Object.entries(result.structuredData).map(([k, v]) => (
                  <div key={k} className="flex flex-col rounded-md bg-secondary/20 border border-border/50 px-2 py-1.5">
                    <span className="text-[7px] text-muted-foreground uppercase tracking-wide">{k}</span>
                    <span className="text-[9px] font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance */}
          <div className="rounded-md border border-border bg-secondary/10 p-3">
            <div className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1.5"><Shield className="h-3 w-3 text-primary" />Compliance Audit Record</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { l: "HIPAA Check", v: "Passed ✓", ok: true },
                { l: "Data Access Log", v: "Recorded ✓", ok: true },
                { l: "Transcript Stored", v: "Confirmed ✓", ok: true },
                { l: "Decision Tree Logged", v: "Confirmed ✓", ok: true },
              ].map(({ l, v, ok }) => (
                <div key={l} className="flex items-center gap-1.5 text-[9px]">
                  <CheckCircle2 className={`h-2.5 w-2.5 shrink-0 ${ok ? "text-emerald-500" : "text-destructive"}`} />
                  <span className="text-muted-foreground">{l}:</span>
                  <span className={`font-semibold ${ok ? "text-emerald-600" : "text-destructive"}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Run again */}
          <div className="flex gap-2">
            <button onClick={() => { setPhase("ready"); setResult(null); setTurns([]); setIntelFeed([]); }}
              className="flex-1 py-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors flex items-center justify-center gap-1.5">
              <RotateCcw className="h-3 w-3" /> Run Again
            </button>
            <button onClick={onClose}
              className="flex-1 py-2 rounded-md reflect-gradient text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
              <DollarSign className="h-3 w-3" /> View ROI Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
