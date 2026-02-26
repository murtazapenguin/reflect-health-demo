import { useState, useEffect, useRef } from "react";
import { User, Send, Sparkles } from "lucide-react";
import penguinLogo from "@/assets/penguin-logo.png";

interface ChatMessage {
  id: string;
  speaker: "member" | "agent";
  text: string;
  timestamp: Date;
}

const INITIAL_MESSAGES: Omit<ChatMessage, "timestamp">[] = [
  { id: "m1", speaker: "member", text: "Hi, I need to check my eligibility for an upcoming specialist visit." },
  { id: "m2", speaker: "agent", text: "Of course! Let me pull up your account. Could you provide your member ID?" },
  { id: "m3", speaker: "member", text: "Sure, it's MBR-48291." },
];

const INCOMING_MESSAGES: string[] = [
  "And can you also confirm if I need a referral?",
  "My primary care doctor mentioned something about prior authorization.",
  "What would my copay be for this visit?",
];

const AI_SUGGESTIONS: string[] = [
  "Member MBR-48291 is active under BlueCross PPO. Specialist visits are covered with a $30 copay. No referral is needed for in-network providers. Would you like me to verify your provider's network status?",
  "No prior authorization is required for this procedure code. Coverage is confirmed through end of plan year (12/31/2026). Your PCP can submit a referral if preferred, but it is not required under your PPO plan.",
  "Copay for in-network specialist: $30. Out-of-network: $75 + 30% coinsurance after deductible. Your current deductible status: $1,112 of $1,500 met (74%).",
];

export function Five9ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>(
    INITIAL_MESSAGES.map(m => ({ ...m, timestamp: new Date() }))
  );
  const [agentInput, setAgentInput] = useState("");
  const [currentSuggestion, setCurrentSuggestion] = useState(AI_SUGGESTIONS[0]);
  const [suggestionConfidence, setSuggestionConfidence] = useState(94);
  const [msgIndex, setMsgIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex(prev => {
        const next = prev + 1;
        if (next <= INCOMING_MESSAGES.length) {
          const newMsg: ChatMessage = {
            id: `auto-${next}`,
            speaker: "member",
            text: INCOMING_MESSAGES[next - 1],
            timestamp: new Date(),
          };
          setMessages(p => [...p, newMsg]);
          setCurrentSuggestion(AI_SUGGESTIONS[Math.min(next, AI_SUGGESTIONS.length - 1)]);
          setSuggestionConfidence([94, 96, 91][Math.min(next, 2)]);
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!agentInput.trim()) return;
    setMessages(p => [...p, { id: `agent-${Date.now()}`, speaker: "agent", text: agentInput, timestamp: new Date() }]);
    setAgentInput("");
  };

  const useSuggestion = () => {
    setAgentInput(currentSuggestion);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="grid grid-cols-12 gap-0 h-full">
      {/* Chat window */}
      <div className="col-span-8 border-r five9-border flex flex-col five9-panel-bg">
        <div className="p-3 border-b five9-border">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-five9-muted">Live Chat — Member MBR-48291</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.speaker === "member" ? "flex-row" : "flex-row-reverse"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                msg.speaker === "member" ? "bg-secondary" : "bg-five9-accent/10"
              }`}>
                {msg.speaker === "member"
                  ? <User className="h-3 w-3 text-five9-muted" />
                  : <img src={penguinLogo} alt="AI" className="h-4 w-4 object-contain" />
                }
              </div>
              <div className={`five9-card p-2 max-w-[75%] feed-item-enter ${msg.speaker !== "member" ? "five9-active-border" : ""}`}>
                <p className="text-[11px] text-foreground leading-relaxed">{msg.text}</p>
                <span className="text-[8px] text-five9-muted">{msg.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Reply area — pinned to bottom */}
        <div className="border-t five9-border p-3 space-y-2 shrink-0">
          <textarea
            ref={textareaRef}
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a reply..."
            rows={agentInput.length > 80 ? 3 : 1}
            className="w-full p-2 text-[11px] rounded border border-border bg-card resize-none focus:outline-none focus:ring-1 focus:ring-five9-accent"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={sendMessage}
              disabled={!agentInput.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-medium five9-accent-bg text-white hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-2.5 w-2.5" /> Send
            </button>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="col-span-4 overflow-y-auto five9-panel-bg p-3 space-y-3">
        <div className="flex items-center gap-1.5">
          <img src={penguinLogo} alt="Penguin AI" className="h-4 w-4 object-contain" />
          <span className="text-[10px] font-semibold text-foreground">AI Chat Assist</span>
        </div>
        <div className="five9-card p-2.5 five9-active-border space-y-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-five9-muted">Suggested Reply</span>
          <p className="text-[11px] text-foreground leading-relaxed">{currentSuggestion}</p>
          <button
            onClick={useSuggestion}
            className="w-full py-1.5 rounded text-[10px] font-medium five9-accent-bg text-white hover:opacity-90 flex items-center justify-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Use Suggestion
          </button>
        </div>
        <div className="five9-card p-2.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-five9-muted">Confidence</span>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full five9-accent-bg transition-all" style={{ width: `${suggestionConfidence}%` }} />
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-600">{suggestionConfidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
