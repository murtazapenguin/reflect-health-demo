import { useState, useEffect, useRef } from "react";
import {
  Mic, AlertCircle,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import penguinLogo from "@/assets/penguin-ai-logo.png";
import { DemoDataReference } from "./DemoDataReference";

export function VoiceAgent() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    api.getElevenLabsConfig()
      .then(({ agent_id }) => setAgentId(agent_id))
      .catch(() => setError("ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID on the backend."));
  }, []);

  useEffect(() => {
    if (!agentId || scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [agentId]);

  useEffect(() => {
    if (!agentId || !widgetContainerRef.current) return;

    const container = widgetContainerRef.current;
    container.innerHTML = "";

    const widget = document.createElement("elevenlabs-convai");
    widget.setAttribute("agent-id", agentId);
    widget.setAttribute("variant", "expandable");
    container.appendChild(widget);

    return () => {
      container.innerHTML = "";
    };
  }, [agentId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src={penguinLogo} alt="PenguinAI" className="h-8 w-8 object-contain" />
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Live Voice Agent
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
              {error ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              ) : !agentId ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Loading agent configuration...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="relative w-24 h-24 rounded-full reflect-gradient flex items-center justify-center mb-6 shadow-lg">
                    <Mic className="h-10 w-10 text-white" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "3s" }} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Agent Ready
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Click the agent orb in the bottom-right corner to start a conversation.
                    Ask about eligibility, claims status, or prior authorization.
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    The voice agent handles authentication, lookups, and escalation — all in real time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick start guide */}
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

          {/* How it works */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-[11px] text-muted-foreground list-decimal list-inside">
                <li>Click the <strong>agent orb</strong> (bottom-right corner)</li>
                <li>Allow <strong>microphone access</strong> when prompted</li>
                <li>Speak naturally — the agent will guide you</li>
                <li>Click the orb again to <strong>end</strong> the call</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <DemoDataReference />

      {/* Widget mount point (renders as floating orb) */}
      <div ref={widgetContainerRef} />
    </div>
  );
}
