import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConversation } from "@elevenlabs/react";
import {
  Mic, MicOff, PhoneOff, Volume2, VolumeX, Loader2,
  MessageSquare, Bot, User, AlertCircle, Phone, ExternalLink, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import penguinLogo from "@/assets/penguin-ai-logo.png";
import { DemoDataReference } from "./DemoDataReference";

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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedCallId, setSavedCallId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<Date | null>(null);
  const navigate = useNavigate();

  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEndingRef = useRef(false);

  const conversation = useConversation({
    onConnect: ({ conversationId: connId }) => {
      setIsConnecting(false);
      setError(null);
      setConversationId(connId);
      startTimeRef.current = new Date();
      setSavedCallId(null);
      isEndingRef.current = false;
    },
    onDisconnect: () => {
      // If the agent ended the call (not user), trigger save
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

      if (role === "agent") {
        const lower = msg.message.toLowerCase();
        const isTransfer = lower.includes("connect you with") || lower.includes("transfer you") || lower.includes("team member");
        const isGoodbye = lower.includes("have a great day") || lower.includes("thank you for calling") || lower.includes("goodbye");
        if (isTransfer || isGoodbye) {
          if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
          autoEndTimerRef.current = setTimeout(() => {
            if (!isEndingRef.current) {
              endConversation();
            }
          }, 3000);
        }
      }
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
    return () => {
      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
    };
  }, []);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setMessages([]);

    try {
      const { signed_url } = await api.getElevenLabsSignedUrl();
      const id = await conversation.startSession({
        signedUrl: signed_url,
      });
      setConversationId(id);
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
  }, [messages, conversationId]);

  const endConversation = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);

    await conversation.endSession();
    await saveAndCleanup();
  }, [conversation, saveAndCleanup]);

  const isActive = conversation.status === "connected";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src={penguinLogo} alt="PenguinAI" className="h-8 w-8 object-contain" />
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Live Voice Agent
            {isActive && (
              <Badge className="bg-emerald-100 text-emerald-700 text-[9px] animate-pulse">
                Connected
              </Badge>
            )}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Talk to the AI agent directly in your browser — powered by ElevenLabs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main conversation area */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1"
              >
                {messages.length === 0 && !isActive && !isConnecting ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8">
                    <div className="relative w-24 h-24 rounded-full reflect-gradient flex items-center justify-center mb-6 shadow-lg">
                      <Mic className="h-10 w-10 text-white" />
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "3s" }} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Ready to connect
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Start a conversation with the AI healthcare agent. Ask about eligibility,
                      claims status, or prior authorization — just like calling the phone line.
                    </p>
                    <Button
                      onClick={startConversation}
                      disabled={isConnecting}
                      className="reflect-gradient text-white hover:opacity-90 shadow-lg px-8 py-3"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Phone className="h-4 w-4 mr-2" />
                          Start Conversation
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                          msg.role === "agent"
                            ? "bg-primary/5 border border-primary/15"
                            : "bg-secondary border border-border"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {msg.role === "agent" ? (
                            <Bot className="h-3 w-3 text-primary" />
                          ) : (
                            <User className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              msg.role === "agent"
                                ? "reflect-gradient-text"
                                : "text-muted-foreground"
                            }`}
                          >
                            {msg.role === "agent" ? "AI Agent" : "You"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}

                {isActive && conversation.isSpeaking && (
                  <div className="flex justify-start">
                    <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="flex items-center gap-[3px] h-5">
                        {[0, 0.1, 0.2, 0.3, 0.15, 0.25, 0.05].map((delay, i) => (
                          <div
                            key={i}
                            className="waveform-bar"
                            style={{ animationDelay: `${delay}s` }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-primary font-medium">Agent speaking...</span>
                    </div>
                  </div>
                )}
              </div>

              {isActive && (
                <div className="flex items-center gap-3 pt-3 border-t border-border shrink-0">
                  <div className="relative">
                    <Button
                      variant={micMuted ? "destructive" : "outline"}
                      size="icon"
                      className={`h-10 w-10 rounded-full ${!micMuted ? "voice-pulse-active" : ""}`}
                      onClick={() => setMicMuted(!micMuted)}
                      title={micMuted ? "Unmute" : "Mute"}
                    >
                      {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    {volume > 0 ? (
                      <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground shrink-0" />
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

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={endConversation}
                    className="rounded-full px-4"
                  >
                    <PhoneOff className="h-4 w-4 mr-1" />
                    End
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Session Status</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5">
                <div className="flex justify-between">
                  <dt className="type-micro text-muted-foreground">Status</dt>
                  <dd>
                    <Badge
                      variant="secondary"
                      className={
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : isConnecting
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {isActive ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="type-micro text-muted-foreground">Agent</dt>
                  <dd className="text-xs font-medium text-foreground">
                    {isActive ? "Speaking" : "Idle"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="type-micro text-muted-foreground">Messages</dt>
                  <dd className="text-xs font-mono font-medium text-foreground">
                    {messages.length}
                  </dd>
                </div>
                {conversationId && (
                  <div className="flex justify-between">
                    <dt className="type-micro text-muted-foreground">Session ID</dt>
                    <dd className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]" title={conversationId}>
                      {conversationId.slice(0, 12)}...
                    </dd>
                  </div>
                )}
                {(isSaving || savedCallId) && (
                  <div className="flex justify-between items-center">
                    <dt className="type-micro text-muted-foreground">Call Log</dt>
                    <dd>
                      {isSaving ? (
                        <Badge className="bg-amber-100 text-amber-700 text-[9px]">
                          <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                          Saving...
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">
                          <CheckCircle className="h-2.5 w-2.5 mr-1" />
                          Saved
                        </Badge>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
              {savedCallId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-xs"
                  onClick={() => navigate(`/calls/${savedCallId}`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  View in Call Log
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Try These Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  "I need to check eligibility for a patient",
                  "Can you look up a claim status?",
                  "I want to check on a prior authorization",
                  "I need to verify my provider credentials",
                ].map((prompt, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-[11px] text-muted-foreground"
                  >
                    "{prompt}"
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-destructive mb-1">Connection Error</p>
                    <p className="text-[11px] text-destructive/80 leading-relaxed">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isActive && !isConnecting && (
            <Button
              onClick={startConversation}
              className="w-full reflect-gradient text-white hover:opacity-90 shadow-lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
          )}
        </div>
      </div>

      <DemoDataReference />
    </div>
  );
}
