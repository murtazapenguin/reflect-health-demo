import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { Play, X, User, CheckCircle2, ShieldCheck, DollarSign, TrendingUp, Clock, Brain } from "lucide-react";
import penguinLogo from "@/assets/penguin-logo.png";

const CALLER_VOICE = "EXAVITQu4vr4xnSDxMaL";
const AI_VOICE = "onwK4e9ZLuTAKqWW03F9";

const EXECUTIVE_SCRIPT: { speaker: "caller" | "ai"; text: string; durationMs: number }[] = [
  { speaker: "caller", text: "I'm calling to verify benefits for a UHC Choice Plus member before scheduling a specialist visit.", durationMs: 6000 },
  { speaker: "ai", text: "Please provide the member ID and date of birth.", durationMs: 4000 },
  { speaker: "caller", text: "Member ID 4578921, date of birth January 14, 1986.", durationMs: 4000 },
  { speaker: "ai", text: "Coverage is active. Specialist visits are covered with a thirty-dollar copay. No prior authorization required for in-network providers.", durationMs: 8000 },
  { speaker: "ai", text: "This verification has been completed automatically.", durationMs: 4000 },
];

// Timed overlays shown during playback
const TIMED_OVERLAYS: { afterLineIndex: number; label: string; icon: typeof Brain; color: string }[] = [
  { afterLineIndex: 1, label: "Intent Classified: Benefits Verification", icon: Brain, color: "text-primary" },
  { afterLineIndex: 3, label: "Policy Validated — Section 7.4", icon: ShieldCheck, color: "text-primary" },
];

// Final overlays shown at completion
const COMPLETION_OVERLAYS = [
  { label: "Confidence: 92%", icon: Brain, color: "text-primary" },
  { label: "Call Orchestrated", icon: CheckCircle2, color: "text-emerald-600" },
  { label: "+$4.32 Cost Impact", icon: DollarSign, color: "text-emerald-600" },
  { label: "+6 Minutes Saved", icon: Clock, color: "text-emerald-600" },
];

interface TranscriptLine {
  id: string;
  speaker: "caller" | "ai";
  text: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExecutivePlaybackModal({ open, onClose }: Props) {
  const { playTTS, stopAudio, isPlaying: audioPlaying } = useAudioEngine();
  const { results } = useDashboard();
  const { combined, callCenter } = results;

  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [activeOverlays, setActiveOverlays] = useState<string[]>([]);
  const abortRef = useRef(false);

  // Reset on close + body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      abortRef.current = true;
      setTranscript([]);
      setCompleted(false);
      setPlaying(false);
      setActiveOverlays([]);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const runPlayback = useCallback(async () => {
    if (playing) return;
    abortRef.current = false;
    setPlaying(true);
    setCompleted(false);
    setTranscript([]);
    setActiveOverlays([]);

    for (let i = 0; i < EXECUTIVE_SCRIPT.length; i++) {
      if (abortRef.current) break;

      const line = EXECUTIVE_SCRIPT[i];
      const id = `exec-${i}`;

      // Add transcript line
      setTranscript((prev) => [...prev, { id, speaker: line.speaker, text: line.text }]);

      // Play TTS (awaits completion — no overlap possible)
      const voiceId = line.speaker === "caller" ? CALLER_VOICE : AI_VOICE;
      await playTTS(line.text, voiceId, 0.5);

      if (abortRef.current) break;

      // Check for timed overlays after this line
      const overlay = TIMED_OVERLAYS.find((o) => o.afterLineIndex === i);
      if (overlay) {
        setActiveOverlays((prev) => [...prev, overlay.label]);
      }

      // 300ms buffer between speakers
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!abortRef.current) {
      // Show completion overlays
      setActiveOverlays((prev) => [...prev, ...COMPLETION_OVERLAYS.map((o) => o.label)]);
      setCompleted(true);
    }
    setPlaying(false);
  }, [playing, playTTS]);

  const handleClose = () => {
    abortRef.current = true;
    stopAudio();
    setPlaying(false);
    onClose();
  };

  if (!open) return null;

  const allOverlayDefs = [...TIMED_OVERLAYS.map((o) => ({ label: o.label, icon: o.icon, color: o.color })), ...COMPLETION_OVERLAYS];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm max-sm:items-start max-sm:pt-10 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-[90%] max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-[0.96] duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Executive Playback — Benefits Verification Call</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Incoming · Provider · Benefits Verification · UHC Choice Plus</p>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Play button */}
          {!playing && !completed && (
            <button
              onClick={runPlayback}
              className="w-full py-3 rounded-lg reflect-gradient text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Play className="h-4 w-4" />
              Play Executive Playback
            </button>
          )}

          {/* Transcript */}
          {transcript.length > 0 && (
            <div className="space-y-2">
              {transcript.map((line) => (
                <div key={line.id} className={`flex gap-2 ${line.speaker === "ai" ? "flex-row" : "flex-row-reverse"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    line.speaker === "ai" ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    {line.speaker === "ai" ? <img src={penguinLogo} alt="Penguin AI" className="h-4 w-4 object-contain" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className={`rounded-lg p-2.5 max-w-[80%] border ${
                    line.speaker === "ai" ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/50"
                  }`}>
                    <p className="text-[11px] text-foreground leading-relaxed">{line.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overlays */}
          {activeOverlays.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {activeOverlays.map((label) => {
                const def = allOverlayDefs.find((d) => d.label === label);
                if (!def) return null;
                return (
                  <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-[10px] font-medium animate-fade-in">
                    <def.icon className={`h-3 w-3 ${def.color}`} />
                    <span className={def.color}>{def.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confidence indicator during playback */}
          {playing && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-mono font-semibold text-primary">92%</span>
              <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full reflect-gradient" style={{ width: "92%" }} />
              </div>
            </div>
          )}

          {/* Completion summary */}
          {completed && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Projected Annual Impact
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block">Call Savings</span>
                  <span className="text-sm font-bold font-mono text-foreground">{fmtCurrency(callCenter.annualSavings)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block">FTE Reduction</span>
                  <span className="text-sm font-bold font-mono text-foreground">{fmtDecimal(callCenter.fteSaved, 1)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block">ROI Multiple</span>
                  <span className="text-sm font-bold font-mono text-foreground">{fmtDecimal(combined.roi, 2)}×</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase block">Payback Period</span>
                  <span className="text-sm font-bold font-mono text-foreground">{fmtDecimal(combined.paybackMonths, 1)} mo</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
