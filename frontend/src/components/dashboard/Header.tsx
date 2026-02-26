import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard, type DashboardTab, type DeploymentMode } from "@/contexts/DashboardContext";
import { SlidersHorizontal, Shield, RefreshCw, Phone, FileText, Globe, TrendingUp, Play, Monitor, Plug, Info, Brain, List, LogOut, Mic, PhoneForwarded } from "lucide-react";
import { type VolumePreset } from "@/lib/roi-calculations";
import { ScenarioSelector } from "./ScenarioSelector";
import { DeploymentComparison } from "./embedded/DeploymentComparison";
import { ExecutivePlaybackModal } from "./ExecutivePlaybackModal";
import { KPITriggerButton } from "./KPISidebar";
import penguinLogo from "@/assets/penguin-icon.png";
import reflectLogo from "@/assets/reflect-health-logo.png";

const presetLabels: Record<VolumePreset, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const tabs: { id: DashboardTab; label: string; subtitle: string; icon: React.ReactNode }[] = [
  { id: "contact", label: "Intake & Identity", subtitle: "Identity Verification & Eligibility", icon: <Phone className="h-3.5 w-3.5" /> },
  { id: "claims", label: "Claims & Coverage Operations", subtitle: "Adjudication & Review Intelligence", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "network", label: "Network & Connectivity", subtitle: "Contract & Ecosystem Optimization", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "roi", label: "Financial Impact Simulator", subtitle: "Financial Performance Modeling", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "intelligence", label: "Call Intelligence", subtitle: "Upload & Automate Call Recordings", icon: <Brain className="h-3.5 w-3.5" /> },
  { id: "agent", label: "Live Agent", subtitle: "Talk to AI Agent In-Browser", icon: <Mic className="h-3.5 w-3.5" /> },
  { id: "escalations", label: "Escalations", subtitle: "Calls Transferred to Humans", icon: <PhoneForwarded className="h-3.5 w-3.5" /> },
];

function SyncIndicator() {
  const { lastUpdated, isSyncing } = useDashboard();
  const time = lastUpdated.toLocaleTimeString("en-US", { hour12: false });
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
      <RefreshCw className={`h-3 w-3 ${isSyncing ? "sync-spinning text-primary" : ""}`} />
      <span>Last Sync: {time}</span>
    </div>
  );
}

export function Header({ metricsOpen, onToggleMetrics }: { metricsOpen?: boolean; onToggleMetrics?: () => void }) {
  const { mode, setMode, preset, setPreset, setDrawerOpen, activeTab, setActiveTab, deploymentMode, setDeploymentMode } = useDashboard();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="border-b border-border bg-card/90 backdrop-blur-sm">
      {/* Top bar */}
      <div className="px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={reflectLogo} alt="Reflect Health" className="h-8" />
          <span className="hidden md:inline text-[10px] text-muted-foreground border-l border-border pl-3">
            AI Orchestration Command Center
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Deployment Mode Toggle */}
          <div className="flex items-center bg-secondary rounded-md p-0.5 gap-0.5">
            <button
              onClick={() => setDeploymentMode("white-label")}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
                deploymentMode === "white-label"
                  ? "reflect-gradient text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="h-2.5 w-2.5" />
              White-Label
            </button>
            <button
              onClick={() => setDeploymentMode("opyn")}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
                deploymentMode === "opyn"
                  ? "bg-[hsl(265,60%,55%)] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-2.5 w-2.5" />
              Opyn Health
            </button>
            <button
              onClick={() => setDeploymentMode("embedded")}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
                deploymentMode === "embedded"
                  ? "five9-accent-bg text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plug className="h-2.5 w-2.5" />
              Five9 Voice
            </button>
          </div>
          <button
            onClick={() => setComparisonOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Compare deployment modes"
          >
            <Info className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => navigate("/calls")}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Call Log"
          >
            <List className="h-3 w-3" />
            Call Log
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded text-muted-foreground hover:text-foreground transition-all"
            title="Sign Out"
          >
            <LogOut className="h-3 w-3" />
          </button>

          <img src={penguinLogo} alt="Penguin AI" className="h-6 w-6 object-contain opacity-60" />
        </div>
      </div>

      {/* Controls bar */}
      <div className="px-5 py-1.5 flex items-center justify-between border-t border-border/50 bg-secondary/30">
        <div className="flex items-center gap-2">
          <SyncIndicator />
          <span className="text-[10px] text-muted-foreground border-l border-border pl-2 font-mono">
            Demo: +1 (415) 909-5732
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaybackOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded bg-gradient-to-r from-[hsl(340,80%,55%)] to-[hsl(25,95%,55%)] text-white hover:opacity-90 transition-all"
          >
            <Play className="h-3 w-3" />
            Launch AI Call Deflection
          </button>

          <ScenarioSelector />

          {/* Volume Presets */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-secondary rounded-md p-0.5 gap-0.5">
              {(["low", "medium", "high"] as VolumePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
                    preset === p
                      ? "reflect-gradient text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {presetLabels[p]}
                </button>
              ))}
            </div>
            {preset === "medium" && (
              <span className="text-[9px] text-muted-foreground italic">Baseline Mode</span>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-secondary rounded-md p-0.5 gap-0.5">
            <button
              onClick={() => setMode("internal")}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded transition-all reflect-gradient text-white`}
            >
              <Shield className="h-2.5 w-2.5" />
              Internal
            </button>
          </div>

          {onToggleMetrics && (
            <KPITriggerButton onClick={onToggleMetrics} />
          )}

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-all"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Controls
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="px-5 flex items-center gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-underline flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-primary active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <DeploymentComparison open={comparisonOpen} onClose={() => setComparisonOpen(false)} />
      <ExecutivePlaybackModal open={playbackOpen} onClose={() => setPlaybackOpen(false)} />
    </header>
  );
}
