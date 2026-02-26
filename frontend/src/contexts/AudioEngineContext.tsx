import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

export interface CallOutcome {
  callDeflected: boolean;
  escalationAvoided: boolean;
  costAvoided: number;
  confidence: number;
}

export type AudioMode = "embedded" | "executive";

// ── Five9 Live Session Data ──
export type Five9Phase =
  | "idle"
  | "awaiting"
  | "provider-verifying"
  | "provider-verified"
  | "provider-failed"
  | "provider-retry"
  | "member-verifying"
  | "member-verified"
  | "member-failed"
  | "member-retry"
  | "dob-mismatch"
  | "intent-classifying"
  | "intent-classified"
  | "data-retrieving"
  | "data-retrieved"
  | "data-timeout"
  | "data-retry"
  | "response-generating"
  | "response-ready"
  | "confidence-check"
  | "escalation"
  | "resolved";

export type EdgeCaseType = "none" | "wrong_npi" | "invalid_member_id" | "dob_mismatch" | "claim_not_found" | "api_timeout";

export interface Five9ApiCall {
  endpoint: string;
  source: string;
  latency: number;
  status: number;
  params?: string;
  isTimeout?: boolean;
  isRetry?: boolean;
}

export interface Five9SessionData {
  sessionId: string;
  callerType: "Provider" | "Member";
  providerNpi: string;
  providerName: string;
  providerConfidence: number;
  memberId: string;
  memberDob: string;
  memberConfidence: number;
  intent: string;
  confidenceScore: number;
  apiCalls: Five9ApiCall[];
  structuredResponse: { fields: { label: string; value: string }[]; generatedResponse: string } | null;
  escalated: boolean;
  escalationReason: string;
  edgeCaseType: EdgeCaseType;
  providerVerified: boolean;
  memberVerified: boolean;
}

interface AudioEngineState {
  // Shared state
  audioEnabled: boolean;
  setAudioEnabled: (v: boolean) => void;
  isLiveSimulation: boolean;
  setIsLiveSimulation: (v: boolean) => void;
  confidenceThreshold: number;
  setConfidenceThreshold: (v: number) => void;
  currentCallOutcome: CallOutcome | null;
  setCurrentCallOutcome: (o: CallOutcome | null) => void;
  liveCallIntent: string;
  setLiveCallIntent: (v: string) => void;

  // Five9 session state
  five9Phase: Five9Phase;
  setFive9Phase: (p: Five9Phase) => void;
  five9Session: Five9SessionData | null;
  setFive9Session: (s: Five9SessionData | null) => void;

  // Playback controls
  isMuted: boolean;
  setIsMuted: (v: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (s: number) => void;

  // Audio state
  isPlaying: boolean;
  currentSpeaker: "caller" | "ai" | null;
  audioMode: AudioMode | null;

  // TTS helper — returns a promise that resolves when audio finishes
  playTTS: (text: string, voiceId: string, volume?: number) => Promise<void>;
  stopAudio: () => void;
}

const AudioEngineContext = createContext<AudioEngineState | null>(null);

export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isLiveSimulation, setIsLiveSimulation] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [currentCallOutcome, setCurrentCallOutcome] = useState<CallOutcome | null>(null);
  const [liveCallIntent, setLiveCallIntent] = useState("");
  const [five9Phase, setFive9Phase] = useState<Five9Phase>("idle");
  const [five9Session, setFive9Session] = useState<Five9SessionData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<"caller" | "ai" | null>(null);
  const [audioMode, setAudioMode] = useState<AudioMode | null>(null);

  const playLock = useRef(false);
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const stopAudio = useCallback(() => {
    window.speechSynthesis.cancel();
    activeUtterance.current = null;
    playLock.current = false;
    setIsPlaying(false);
    setCurrentSpeaker(null);
    setAudioMode(null);
  }, []);

  const playTTS = useCallback(async (text: string, voiceId: string, _volume = 0.4): Promise<void> => {
    // Pre-process text so digit sequences are spoken as individual digits
    const spokenText = text
      // NPI, member IDs, claim numbers, PA IDs — spell out the digit runs
      .replace(/\b(\d{4,})\b/g, (_m, digits: string) => digits.split("").join(" "))
      // Prefixed IDs like CLM-00481922, PA-00012345, BCX-1234567
      .replace(/([A-Z]{2,4})-(\d+)/g, (_m, prefix: string, digits: string) =>
        `${prefix.split("").join(" ")} ${digits.split("").join(" ")}`)
      // Dates like 01/14/1986 — leave as-is (speech handles short numbers fine)
      ;

    const words = spokenText.split(/\s+/).length;
    const estimatedMs = Math.max(2200, (words / 2.5) * 1000);

    if (isMuted) {
      await new Promise((r) => setTimeout(r, estimatedMs));
      return;
    }

    window.speechSynthesis.cancel();

    while (playLock.current) {
      await new Promise((r) => setTimeout(r, 50));
    }

    playLock.current = true;
    const speaker = voiceId === "EXAVITQu4vr4xnSDxMaL" ? "caller" as const : "ai" as const;
    setCurrentSpeaker(speaker);
    setIsPlaying(true);

    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(spokenText);
      activeUtterance.current = utterance;

      const availableVoices = voices.length > 0 ? voices : synth.getVoices();
      if (speaker === "ai") {
        const preferred = availableVoices.find((v) => v.name.includes("Samantha"))
          || availableVoices.find((v) => v.name.includes("Google UK English Female"))
          || availableVoices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
          || availableVoices.find((v) => v.lang.startsWith("en"));
        if (preferred) utterance.voice = preferred;
        utterance.pitch = 1.05;
        utterance.rate = 0.92 * playbackSpeed;
      } else {
        const preferred = availableVoices.find((v) => v.name.includes("Daniel"))
          || availableVoices.find((v) => v.name.includes("Google UK English Male"))
          || availableVoices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("male"))
          || availableVoices.find((v) => v.lang.startsWith("en"));
        if (preferred) utterance.voice = preferred;
        utterance.pitch = 0.9;
        utterance.rate = 0.95 * playbackSpeed;
      }
      utterance.volume = Math.min(_volume * 1.5, 1);

      await new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.speak(utterance);
        // Safety timeout in case speech synthesis hangs
        setTimeout(resolve, estimatedMs * 2);
      });
    } catch {
      await new Promise((r) => setTimeout(r, estimatedMs));
    } finally {
      activeUtterance.current = null;
      playLock.current = false;
      setIsPlaying(false);
      setCurrentSpeaker(null);
    }
  }, [isMuted, playbackSpeed, voices]);

  return (
    <AudioEngineContext.Provider value={{
      audioEnabled, setAudioEnabled,
      isLiveSimulation, setIsLiveSimulation,
      confidenceThreshold, setConfidenceThreshold,
      currentCallOutcome, setCurrentCallOutcome,
      liveCallIntent, setLiveCallIntent,
      five9Phase, setFive9Phase,
      five9Session, setFive9Session,
      isMuted, setIsMuted,
      playbackSpeed, setPlaybackSpeed,
      isPlaying, currentSpeaker, audioMode,
      playTTS, stopAudio,
    }}>
      {children}
    </AudioEngineContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudioEngine() {
  const ctx = useContext(AudioEngineContext);
  if (!ctx) throw new Error("useAudioEngine must be used within AudioEngineProvider");
  return ctx;
}
