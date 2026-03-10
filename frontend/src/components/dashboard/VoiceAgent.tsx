import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  Mic, MicOff, PhoneOff, Volume2, VolumeX, Loader2,
  MessageSquare, Bot, User, AlertCircle, Phone, ExternalLink, CheckCircle,
  ArrowRight, PhoneForwarded,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import penguinAiLogo from "@/assets/penguin-ai-logo.png";
import { DemoDataReference } from "./DemoDataReference";
import { useConversationContext } from "@/contexts/ConversationContext";

const TRANSFER_PHRASES = [
  "transfer you",
  "transferring you",
  "connect you with",
  "connecting you with",
  "routing you to",
  "passing you to",
  "let me get a human",
  "human agent",
  "team member",
  "team members",
  "hand you off",
  "handing you off",
  "escalating to",
  "i'll connect you to",
];

const TRANSFER_MODAL_DURATION_MS = 3000;

function detectTransfer(messages: Message[]): boolean {
  const lastAgentMessages = messages.filter((m) => m.role === "agent").slice(-3);
  return lastAgentMessages.some((m) =>
    TRANSFER_PHRASES.some((p) => m.text.toLowerCase().includes(p))
  );
}

interface Message {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export function VoiceAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [micMuted, setMicMuted] = useState(false);
  const [savedCallId, setSavedCallId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<Date | null>(null);
  const isEndingRef = useRef(false);

  const {
    conversationId, setConversationId, setIsCallActive,
    wasTransferred, setWasTransferred, setTransferReason,
  } = useConversationContext();

  const conversation = useConversation({
    onConnect: async ({ conversationId: connId }) => {
      setIsConnecting(false);
      setError(null);
      setConversationId(connId);
      setIsCallActive(true);
      startTimeRef.current = new Date();
      setSavedCallId(null);
      setWasTransferred(false);
      setTransferReason(null);
      isEndingRef.current = false;

      try {
        await api.registerSession(connId);
      } catch {
        console.error("Failed to register session");
      }
    },
    onDisconnect: () => {
      setIsCallActive(false);
      if (!isEndingRef.current && messages.length > 0) {
        isEndingRef.current = true;
        saveAndCleanup();
      }
    },
    onMessage: (msg) => {
      const role: "user" | "agent" = msg.role === "user" ? "user" : "agent";
      setMessages((prev) => [
        ...prev,
        { role, text: msg.message, timestamp: new Date(), isFinal: true },
      ]);
    },
    onError: (err) => {
      const msg = typeof err === "string" ? err : (err as any)?.message || "Connection error";
      if (msg.includes("quota")) {
        setError("ElevenLabs quota exceeded. Please check your plan usage at elevenlabs.io.");
      } else {
        setError(msg);
      }
      setIsConnecting(false);
    },
  });

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (wasTransferred || messages.length === 0) return;
    if (detectTransfer(messages)) {
      setWasTransferred(true);
      const triggerMsg = [...messages]
        .filter((m) => m.role === "agent")
        .reverse()
        .find((m) => TRANSFER_PHRASES.some((p) => m.text.toLowerCase().includes(p)));
      setTransferReason(triggerMsg?.text ?? null);
      setShowTransferModal(true);
    }
  }, [messages, wasTransferred, setWasTransferred, setTransferReason]);

  useEffect(() => {
    if (!showTransferModal) return;
    const timeout = window.setTimeout(() => {
      setShowTransferModal(false);
    }, TRANSFER_MODAL_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [showTransferModal]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setMessages([]);
    setWasTransferred(false);
    setTransferReason(null);
    setShowTransferModal(false);

    try {
      const { signed_url } = await api.getElevenLabsSignedUrl();
      await conversation.startSession({ signedUrl: signed_url });
    } catch (err: any) {
      const msg = err?.message || "Failed to start conversation";
      if (msg.includes("503") || msg.includes("not configured")) {
        setError("ElevenLabs is not configured yet. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID on the backend.");
      } else if (msg.includes("Microphone") || msg.includes("getUserMedia") || msg.includes("NotAllowedError")) {
        setError("Microphone access is required. Please allow microphone access and try again.");
      } else if (msg.includes("quota")) {
        setError("ElevenLabs quota exceeded. Please check your plan usage at elevenlabs.io.");
      } else {
        setError(msg);
      }
      setIsConnecting(false);
    }
  }, [conversation]);

  const saveAndCleanup = useCallback(async () => {
    const currentMessages = [...messages];
    const convId = conversationId;

    if (currentMessages.length === 0) return;

    setIsSaving(true);
    const duration = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current.getTime()) / 1000)
      : 0;

    try {
      const result = await api.saveElevenLabsConversation({
        conversation_id: convId,
        transcript: currentMessages.map((m) => ({
          speaker: m.role === "agent" ? "agent" : "user",
          text: m.text,
        })),
        duration_seconds: duration,
      });
      setSavedCallId(result.call_id);
    } catch {
      console.error("Failed to save conversation");
    } finally {
      setIsSaving(false);
    }

    if (convId) {
      try {
        await api.endSession(convId);
      } catch {
        // ignore
      }
    }
  }, [messages, conversationId]);

  const endConversation = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    setIsCallActive(false);

    await conversation.endSession();
    await saveAndCleanup();
  }, [conversation, saveAndCleanup, setIsCallActive]);

  const isActive = conversation.status === "connected";

  return (
    <div className="five9-panel-bg h-full flex flex-col">
      {showTransferModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTransferModal(false);
          }}
        >
          <div className="bg-card rounded-lg shadow-2xl px-4 py-3 border border-border animate-scale-in flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
              <PhoneForwarded className="h-4 w-4 text-amber-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">
                Transferring to human
              </span>
              <span className="text-[11px] text-muted-foreground">
                Connecting your call to a team member...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b five9-border shrink-0">
        <div className="flex items-center gap-2">
          <img src={penguinAiLogo} alt="PenguinAI" className="h-4" />
          <div>
            <h2 className="text-[12px] font-semibold text-foreground flex items-center gap-2">
              Live Voice Agent
              {isActive && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              )}
            </h2>
            <p className="text-[10px] text-five9-muted">
              Powered by ElevenLabs
            </p>
          </div>
        </div>
        {/* Session info */}
        <div className="flex items-center gap-3">
          {conversationId && (
            <span className="text-[9px] font-mono text-five9-muted">{conversationId.slice(0, 10)}...</span>
          )}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-five9-muted">{messages.length} msgs</span>
          </div>
          {(isSaving || savedCallId) && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
              isSaving ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
              {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <CheckCircle className="h-2.5 w-2.5" />}
              {isSaving ? "Saving" : "Saved"}
            </span>
          )}
        </div>
      </div>

      {/* AI Disclosure Banner (California AB 489 compliance — non-dismissable during active call) */}
      {isActive && (
        <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-50 border-b border-blue-200 shrink-0">
          <Bot className="h-3 w-3 text-blue-500" />
          <span className="text-[10px] text-blue-700 font-medium">
            You are speaking with an AI assistant. Say "transfer me" at any time to reach a human agent.
          </span>
        </div>
      )}

      {/* Conversation area */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-3">
        <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1">
          {messages.length === 0 && !isActive && !isConnecting ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Mic className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Ready to connect
              </h3>
              <p className="text-[11px] text-five9-muted max-w-xs mb-4">
                Start a conversation with the AI healthcare agent. Ask about eligibility
                or claims status.
              </p>
              <button
                onClick={startConversation}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg five9-accent-bg text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Start Conversation
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3.5 py-2 ${
                      msg.role === "agent"
                        ? "five9-card"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {msg.role === "agent" ? (
                        <Bot className="h-3 w-3 text-five9-accent" />
                      ) : (
                        <User className="h-3 w-3 text-gray-400" />
                      )}
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          msg.role === "agent" ? "text-five9-accent" : "text-five9-muted"
                        }`}
                      >
                        {msg.role === "agent" ? "AI Agent" : "You"}
                      </span>
                    </div>
                    <p className="text-[12px] text-foreground leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isActive && conversation.isSpeaking && (
                <div className="flex justify-start">
                  <div className="five9-card px-3.5 py-2.5 flex items-center gap-3">
                    <div className="flex items-center gap-[3px] h-4">
                      {[0, 0.1, 0.2, 0.3, 0.15, 0.25, 0.05].map((delay, i) => (
                        <div
                          key={i}
                          className="waveform-bar"
                          style={{ animationDelay: `${delay}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-five9-accent font-medium">Agent speaking...</span>
                  </div>
                </div>
              )}

              {/* Subtle transfer indicator */}
              {wasTransferred && (
                <div className="flex justify-center py-2 animate-fade-in">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                    <ArrowRight className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] text-amber-700 font-medium">Call transferred to agent</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {isActive && (
          <div className="flex items-center gap-3 pt-3 border-t five9-border shrink-0">
            <button
              onClick={() => setMicMuted(!micMuted)}
              title={micMuted ? "Unmute" : "Mute"}
              className={`h-9 w-9 rounded-full flex items-center justify-center border transition-colors ${
                micMuted
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>

            <div className="flex items-center gap-2 flex-1">
              {volume > 0 ? (
                <Volume2 className="h-3.5 w-3.5 text-five9-muted shrink-0" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-five9-muted shrink-0" />
              )}
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
                onValueChange={([v]) => setVolume(v)}
              />
            </div>

            <button
              onClick={endConversation}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-medium hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End
            </button>
          </div>
        )}

        {/* Post-call actions */}
        {!isActive && !isConnecting && messages.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t five9-border shrink-0">
            <button
              onClick={startConversation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg five9-accent-bg text-white text-[11px] font-medium hover:opacity-90 transition-opacity"
            >
              <Phone className="h-3.5 w-3.5" />
              New Conversation
            </button>
            {savedCallId && (
              <a
                href={`/calls/${savedCallId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-[11px] font-medium text-foreground hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View in Call Log
              </a>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold text-red-700">Connection Error</p>
            <p className="text-[10px] text-red-600 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Try These Prompts (only when idle) */}
      {!isActive && !isConnecting && messages.length === 0 && (
        <div className="px-4 pb-3 space-y-1.5">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Try These Prompts
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              "I need to check eligibility for a patient",
              "Can you look up a claim status?",
              "What's the copay for a specialist visit?",
              "I need to verify my provider credentials",
            ].map((prompt, i) => (
              <div
                key={i}
                className="px-2.5 py-1.5 rounded five9-card text-[10px] text-five9-muted"
              >
                "{prompt}"
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo data reference (collapsed at bottom) */}
      <div className="px-4 pb-3">
        <DemoDataReference />
      </div>
    </div>
  );
}
