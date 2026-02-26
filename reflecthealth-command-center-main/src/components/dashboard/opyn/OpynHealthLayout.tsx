import { useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Monitor, User, Building2, Activity, CheckCircle, Phone, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import penguinLogo from "@/assets/penguin-logo-pink.png";
import { MemberBenefitAssistant } from "./MemberBenefitAssistant";
import { CostTransparencyPanel } from "./CostTransparencyPanel";
import { ProviderPortalView } from "./ProviderPortalView";
import { useOpynSimulation, type SimPhase } from "./useOpynSimulation";

type OpynMode = "member" | "provider";

/* ─── Mini animated sparkline ─── */
function MiniSparkline({ value }: { value: number }) {
  const [points, setPoints] = useState<number[]>(() => Array.from({ length: 8 }, () => 30 + Math.random() * 20));

  useEffect(() => {
    setPoints(prev => [...prev.slice(1), 20 + (value % 40) + Math.random() * 15]);
  }, [value]);

  const max = Math.max(...points, 1);
  const h = 20;
  const w = 100;
  const step = w / (points.length - 1);
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * h}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5 mt-1" preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke="hsl(var(--opyn-green))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-500" />
    </svg>
  );
}

/* ─── Orchestration Pop-out Panel ─── */
interface OrchestrationPanelProps {
  open: boolean;
  onClose: () => void;
}

function OrchestrationPanel({ open, onClose }: OrchestrationPanelProps) {
  const [liveMode, setLiveMode] = useState(true);
  const [metrics, setMetrics] = useState({
    memberResolved: 72,
    providerEligibility: 85,
    callDeflection: 31,
    escalationsPrevented: 24,
    annualizedCost: 1.20,
  });
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!liveMode) return;
    const iv = setInterval(() => {
      setMetrics(prev => ({
        memberResolved: Math.min(99, prev.memberResolved + (Math.random() > 0.5 ? 1 : 0)),
        providerEligibility: Math.min(99, prev.providerEligibility + (Math.random() > 0.6 ? 1 : 0)),
        callDeflection: Math.min(50, prev.callDeflection + (Math.random() > 0.7 ? 1 : 0)),
        escalationsPrevented: Math.min(45, prev.escalationsPrevented + (Math.random() > 0.6 ? 1 : 0)),
        annualizedCost: Math.min(3, +(prev.annualizedCost + 0.02 + Math.random() * 0.02).toFixed(2)),
      }));
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, [liveMode]);

  const metricItems = [
    { label: "Member Inquiries Resolved", value: `${metrics.memberResolved}%`, sub: "automated", raw: metrics.memberResolved },
    { label: "Provider Eligibility Checks", value: `${metrics.providerEligibility}%`, sub: "automated", raw: metrics.providerEligibility },
    { label: "Call Deflection Impact", value: `-${metrics.callDeflection}%`, sub: "vs. baseline", raw: metrics.callDeflection },
    { label: "Escalations Prevented", value: `+${metrics.escalationsPrevented}%`, sub: "improvement", raw: metrics.escalationsPrevented },
    { label: "Annualized Cost Impact", value: `$${metrics.annualizedCost.toFixed(2)}M`, sub: "savings", raw: metrics.annualizedCost },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-[280px] flex flex-col border-l border-border shadow-xl overflow-hidden bg-card">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[hsl(var(--opyn-purple))]" />
            <h3 className="text-[11px] font-semibold">AI Orchestration Activity</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
          {/* Static / Live toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground font-medium">
              {liveMode ? "Live Mode" : "Static Demo"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-muted-foreground">Static</span>
              <Switch checked={liveMode} onCheckedChange={setLiveMode} className="scale-75" />
              <span className="text-[8px] text-muted-foreground">Live</span>
            </div>
          </div>

          {liveMode && (
            <div className="flex items-center gap-1 text-[9px] text-[hsl(var(--opyn-green))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--opyn-green))] animate-pulse" />
              Metrics updating in real-time
            </div>
          )}

          <div className="space-y-3">
            {metricItems.map((m) => (
              <div
                key={m.label}
                className={`rounded-xl border border-border p-3 space-y-1 transition-all duration-300 ${pulse && liveMode ? "border-[hsl(var(--opyn-green)/0.4)]" : ""}`}
              >
                <p className="text-[9px] text-muted-foreground font-medium">{m.label}</p>
                <p className="text-lg font-bold font-mono text-foreground">{m.value}</p>
                <p className="text-[9px] text-muted-foreground">{m.sub}</p>
                {liveMode && <MiniSparkline value={m.raw} />}
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-[9px] font-semibold text-muted-foreground">COMPLIANCE</p>
            {["HIPAA Check: Passed", "Data Access: Logged", "Transcript: Stored", "Decision Tree: Logged"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-[10px]">
                <CheckCircle className="h-3 w-3 text-[hsl(var(--opyn-green))]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

export function OpynHealthLayout() {
  const { setDeploymentMode } = useDashboard();
  const [portalMode, setPortalMode] = useState<OpynMode>("member");
  const [orchestrationOpen, setOrchestrationOpen] = useState(false);
  const sim = useOpynSimulation();

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--opyn-bg))]">
      {/* Header */}
      <header className="px-5 py-3 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--opyn-green))] to-[hsl(var(--opyn-purple))] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">O</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Opyn Health Portal</h1>
              <p className="text-[9px] text-muted-foreground">Powered by Penguin AI Orchestration</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Member / Provider toggle */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setPortalMode("member")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                portalMode === "member"
                  ? "bg-[hsl(var(--opyn-green))] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3 w-3" />
              Member Mode
            </button>
            <button
              onClick={() => setPortalMode("provider")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                portalMode === "provider"
                  ? "bg-[hsl(var(--opyn-purple))] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3 w-3" />
              Provider Mode
            </button>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* AI Orchestration trigger */}
          <button
            onClick={() => setOrchestrationOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-all relative"
          >
            <Activity className="h-3 w-3 text-[hsl(var(--opyn-purple))]" />
            AI Activity
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[hsl(var(--opyn-green))] animate-pulse" />
          </button>

          <button
            onClick={() => setDeploymentMode("white-label")}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Monitor className="h-2.5 w-2.5" />
            White-Label
          </button>
          <button
            onClick={() => setDeploymentMode("embedded")}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Phone className="h-2.5 w-2.5" />
            Five9 Voice
          </button>

          <img src={penguinLogo} alt="Penguin AI" className="h-5 object-contain opacity-40" />
        </div>
      </header>

      {/* Subtitle bar */}
      <div className="px-5 py-2 border-b border-border bg-gradient-to-r from-[hsl(var(--opyn-purple-light))] to-[hsl(var(--opyn-green-light))]">
        <p className="text-[10px] font-medium text-[hsl(var(--opyn-purple))]">
          Embedded AI Orchestration Layer for Member & Provider Experience
        </p>
      </div>

      {/* Main content — full width now */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-5">
          {portalMode === "member" ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <MemberBenefitAssistant sim={sim} />
              <CostTransparencyPanel sim={sim} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <ProviderPortalView />
            </div>
          )}
        </main>
      </div>

      {/* Pop-out panel */}
      <OrchestrationPanel open={orchestrationOpen} onClose={() => setOrchestrationOpen(false)} />
    </div>
  );
}
