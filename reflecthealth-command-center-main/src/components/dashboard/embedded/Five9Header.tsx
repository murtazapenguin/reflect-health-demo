import { useState, useEffect } from "react";
import { Circle, ChevronDown, Monitor, Download } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { ExportSummary } from "../ExportSummary";
import penguinLogo from "@/assets/penguin-icon.png";
import type { Five9Tab } from "./Five9Layout";

interface Five9HeaderProps {
  activeTab: Five9Tab;
  setActiveTab: (t: Five9Tab) => void;
}

export function Five9Header({ activeTab, setActiveTab }: Five9HeaderProps) { // audio-engine-fix
  const { setDeploymentMode } = useDashboard();
  
  const [elapsed, setElapsed] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <header className="five9-header px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-white font-semibold text-sm tracking-tight">Five9</span>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("agent")}
            className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${
              activeTab === "agent"
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            Agent Desktop
          </button>
          <button
            onClick={() => setActiveTab("supervisor")}
            className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${
              activeTab === "supervisor"
                ? "bg-white/20 text-white"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            Supervisor
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          <Download className="h-2.5 w-2.5" />
          Export
        </button>
        <button
          onClick={() => setDeploymentMode("opyn")}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          Opyn Health
        </button>
        <button
          onClick={() => setDeploymentMode("white-label")}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          <Monitor className="h-2.5 w-2.5" />
          White-Label
        </button>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex items-center gap-2">
          <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
          <span className="text-[11px] text-emerald-300 font-medium">Ready</span>
          <ChevronDown className="h-3 w-3 text-white/40" />
        </div>
        <div className="h-4 w-px bg-white/20" />
        <span className="text-[11px] text-white/70 font-mono">{formatTime(elapsed)}</span>
        <div className="h-4 w-px bg-white/20" />
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white font-semibold">
          JD
        </div>
        <img src={penguinLogo} alt="Penguin AI" className="h-6 w-6 object-contain opacity-70" />
      </div>

      <ExportSummary open={exportOpen} onClose={() => setExportOpen(false)} type="five9" />
    </header>
  );
}
