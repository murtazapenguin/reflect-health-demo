import { createPortal } from "react-dom";
import { useDashboard } from "@/contexts/DashboardContext";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { VolumePreset } from "@/lib/roi-calculations";

interface Scenario {
  label: string;
  preset: VolumePreset;
  description: string;
}

const SCENARIOS: Scenario[] = [
  { label: "Enterprise", preset: "high", description: "50K calls | 45K claims/mo" },
  { label: "Baseline", preset: "medium", description: "29K calls | 30K claims/mo" },
  { label: "Lean", preset: "low", description: "15K calls | 20K claims/mo" },
];

export function ScenarioSelector() {
  const { setPreset } = useDashboard();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flipUp: false });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const dropH = 160;
    const flipUp = r.bottom + dropH > window.innerHeight;
    setPos({
      top: flipUp ? r.top - dropH - 4 : r.bottom + 4,
      left: Math.max(8, r.right - 224),
      flipUp,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-all"
      >
        Scenarios
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        createPortal(
          <div
            ref={dropRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, minWidth: 224 }}
            className="bg-card border border-border rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="p-2 pb-1">
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground px-1">
                Select Scenario
              </span>
            </div>
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => { setPreset(s.preset); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors first:rounded-t last:rounded-b"
              >
                <span className="text-[11px] font-medium text-foreground block">
                  {s.label}
                  {s.preset === "medium" && <span className="text-[9px] text-muted-foreground ml-1.5">(Default)</span>}
                </span>
                <span className="text-[9px] text-muted-foreground">{s.description}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
