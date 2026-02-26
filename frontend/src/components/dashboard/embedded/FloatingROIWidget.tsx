import { useState } from "react";
import { useSimulation } from "@/contexts/SimulationContext";
import { CountUpValue } from "../CountUpValue";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { ChevronUp, ChevronDown, Zap, Clock, TrendingDown, DollarSign } from "lucide-react";

export function FloatingROIWidget() {
  const [expanded, setExpanded] = useState(true);
  const { counters } = useSimulation();

  const items = [
    { label: "Calls Assisted", value: counters.callsDeflected, formatter: (n: number) => Math.round(n).toString(), icon: <Zap className="h-3 w-3" /> },
    { label: "Minutes Saved", value: counters.manualMinutesSaved, formatter: (n: number) => fmtDecimal(n, 0), icon: <Clock className="h-3 w-3" /> },
    { label: "Escalations Prevented", value: Math.round(counters.callsDeflected * 0.4), formatter: (n: number) => Math.round(n).toString(), icon: <TrendingDown className="h-3 w-3" /> },
    { label: "Cost Impact", value: counters.costAvoided, formatter: fmtCurrency, icon: <DollarSign className="h-3 w-3" /> },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="five9-card shadow-lg overflow-hidden" style={{ width: expanded ? 220 : 180 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 flex items-center justify-between five9-accent-bg text-white"
        >
          <span className="text-[10px] font-semibold">Today's AI Impact</span>
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
        {expanded && (
          <div className="p-2.5 space-y-2">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-five9-muted">
                  {item.icon}
                  <span className="text-[10px]">{item.label}</span>
                </div>
                <CountUpValue
                  value={item.value}
                  formatter={item.formatter}
                  className="text-[11px] font-bold font-mono text-foreground"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
