import { useState, useEffect } from "react";
import { CheckCircle, Shield, Activity, AlertTriangle, RefreshCw, X, Sparkles } from "lucide-react";
import penguinLogo from "@/assets/penguin-logo-pink.png";

/* ─── Live Inbound Feed ─── */
const INBOUND_TYPES = [
  { type: "Eligibility Check", source: "Orthopedic Clinic", payer: "BCBS PPO" },
  { type: "Claim Status", source: "Cardiology Associates", payer: "Aetna HMO" },
  { type: "Prior Auth Inquiry", source: "Imaging Center", payer: "UHC Choice Plus" },
  { type: "COB Verification", source: "Primary Care Group", payer: "Cigna Open Access" },
  { type: "Benefits Breakdown", source: "Surgery Center", payer: "BCBS PPO" },
  { type: "Eligibility Check", source: "Dermatology Associates", payer: "Humana Gold" },
  { type: "Claim Status", source: "Women's Health Center", payer: "Aetna PPO" },
  { type: "Prior Auth Inquiry", source: "Neurology Group", payer: "UHC Select" },
  { type: "Benefits Breakdown", source: "Pediatric Associates", payer: "BCBS HMO" },
  { type: "COB Verification", source: "Rehab Center", payer: "Cigna PPO" },
];

interface InboundItem {
  id: number;
  type: string;
  source: string;
  payer: string;
  status: "processing" | "validated" | "completed";
  confidence: number;
  time: string;
}

export function ProviderPortalView() {
  const [inbounds, setInbounds] = useState<InboundItem[]>([]);
  const [counters, setCounters] = useState({ eligibility: 142, claims: 89, priorAuth: 37 });

  useEffect(() => {
    let idx = 0;
    const add = () => {
      const src = INBOUND_TYPES[idx % INBOUND_TYPES.length];
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const newItem: InboundItem = {
        id: Date.now(),
        type: src.type,
        source: src.source,
        payer: src.payer,
        status: "processing",
        confidence: 95 + Math.floor(Math.random() * 5),
        time: now,
      };

      setInbounds(prev => [newItem, ...prev].slice(0, 12));

      setTimeout(() => {
        setInbounds(prev => prev.map(item => item.id === newItem.id ? { ...item, status: "validated" } : item));
      }, 1200 + Math.random() * 800);

      setTimeout(() => {
        setInbounds(prev => prev.map(item => item.id === newItem.id ? { ...item, status: "completed" } : item));
        setCounters(prev => {
          if (src.type.includes("Eligibility")) return { ...prev, eligibility: prev.eligibility + 1 };
          if (src.type.includes("Claim")) return { ...prev, claims: prev.claims + 1 };
          return { ...prev, priorAuth: prev.priorAuth + 1 };
        });
      }, 2800 + Math.random() * 1200);

      idx++;
    };

    add();
    const iv = setInterval(add, 4000 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, []);

  const active = inbounds.filter(i => i.status !== "completed");
  const resolved = inbounds.filter(i => i.status === "completed");

  return (
    <div className="space-y-5">
      {/* Member Eligibility Card — matches screenshot style */}
      <MemberEligibilityCard />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Provider Portal Activity Feed</h2>
          <p className="text-xs text-muted-foreground">Live Eligibility & Claims Inbound</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--opyn-green))] bg-[hsl(var(--opyn-green-light))] px-2.5 py-1 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--opyn-green))] animate-pulse" /> Live
        </span>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Eligibility Checks", value: counters.eligibility },
          { label: "Claims Status Requests", value: counters.claims },
          { label: "Prior Auth Verifications", value: counters.priorAuth },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold font-mono text-foreground">{c.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{c.label}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Today</p>
          </div>
        ))}
      </div>

      {/* Active inbounds */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Activity className="h-3.5 w-3.5 text-[hsl(var(--opyn-purple))]" />
          <span className="text-xs font-semibold">Active Inbounds</span>
          <span className="ml-auto text-[10px] text-muted-foreground">{active.length} active</span>
        </div>
        <div className="space-y-2 max-h-[240px] overflow-y-auto">
          {active.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No active inbounds</p>}
          {active.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0 feed-item-enter">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                item.status === "processing" ? "bg-[hsl(var(--opyn-purple))] animate-pulse" : "bg-[hsl(var(--opyn-green))]"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground">Incoming {item.type}</p>
                <p className="text-[10px] text-muted-foreground">{item.source} — {item.payer}</p>
              </div>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                item.status === "processing"
                  ? "bg-[hsl(var(--opyn-purple-light))] text-[hsl(var(--opyn-purple))]"
                  : "bg-[hsl(var(--opyn-green-light))] text-[hsl(var(--opyn-green))]"
              }`}>
                {item.status === "processing" ? "Processing" : "Validated"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{item.confidence}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="rounded-2xl border border-[hsl(var(--opyn-green)/0.3)] bg-[hsl(var(--opyn-green-light))] p-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--opyn-green))]" />
            <span className="text-xs font-semibold text-[hsl(var(--opyn-green))]">Resolved</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{resolved.length} completed</span>
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {resolved.slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center gap-3 text-[11px]">
                <CheckCircle className="h-3 w-3 text-[hsl(var(--opyn-green))] shrink-0" />
                <span className="text-foreground">{item.type}</span>
                <span className="text-muted-foreground">— {item.source}</span>
                <span className="ml-auto text-[9px] text-muted-foreground">{item.time}</span>
                <span className="text-[9px] font-mono text-[hsl(var(--opyn-green))]">{item.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Case Summary — matches screenshot pink gradient style */}
      <AICaseSummary />

      {/* AI Validation badge */}
      <div className="rounded-2xl border border-[hsl(var(--opyn-purple)/0.2)] bg-[hsl(var(--opyn-purple-light))] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={penguinLogo} alt="" className="h-5 w-5 object-contain" />
          <div>
            <p className="text-[11px] font-semibold">AI Pre-Validated Response</p>
            <p className="text-[10px] text-muted-foreground">Confidence: 98% • Escalation: Not Required</p>
          </div>
        </div>
        <Shield className="h-4 w-4 text-[hsl(var(--opyn-purple))]" />
      </div>
    </div>
  );
}

/* ─── Member Eligibility Card (matches screenshot 8) ─── */
function MemberEligibilityCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[hsl(var(--opyn-green-light))] flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-[hsl(var(--opyn-green))]" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Maria Smithfield</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium">Member ID</p>
          <p className="text-sm font-semibold font-mono">445621982341</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-medium">Birthdate</p>
          <p className="text-sm font-semibold">1/1/1995</p>
        </div>
      </div>

      <span className="inline-block text-[10px] font-bold text-foreground bg-[hsl(var(--opyn-green-light))] px-3 py-1 rounded-full">
        Coverage Active
      </span>

      <p className="text-xs font-bold text-foreground">Effective 1/1/2025 – 12/31/2026</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium">Plan</p>
          <p className="text-sm font-bold">Gold PPO</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-medium">Network</p>
          <p className="text-sm font-bold">First Health</p>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Case Summary (matches screenshot 6 pink gradient) ─── */
function AICaseSummary() {
  return (
    <div className="rounded-2xl p-4 shadow-sm space-y-2" style={{ background: "linear-gradient(135deg, hsl(335 100% 60% / 0.12), hsl(20 90% 55% / 0.08))" }}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
        <h3 className="text-sm font-bold text-foreground">AI Case Summary</h3>
      </div>
      <div className="space-y-1.5 text-[11px] text-foreground">
        <p><span className="font-bold">Referral:</span> Provided in-network options for shoulder arthroscopy with preferred provider match.</p>
        <p><span className="font-bold">Follow-up:</span> Contacted provider regarding a missing price estimate for facility fees.</p>
        <p><span className="font-bold">Resolution:</span> Initiated a billing dispute after the member received charges exceeding the negotiated rate.</p>
      </div>
    </div>
  );
}
