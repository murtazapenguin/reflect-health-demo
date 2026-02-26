import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const BENCHMARKS = [
  { name: "Legacy TPA Manual", savingsMultiple: 0, paybackMonths: Infinity, roiMultiple: 0 },
  { name: "Basic RPA Tools", savingsMultiple: 0.25, paybackMonths: 18, roiMultiple: 1.2 },
  { name: "Point AI Solutions", savingsMultiple: 0.5, paybackMonths: 10, roiMultiple: 2.5 },
];

export function CompetitiveIndex() {
  const { results } = useDashboard();
  const { combined } = results;
  const [open, setOpen] = useState(false);

  return (
    <div className="module-panel">
      <button
        onClick={() => setOpen(!open)}
        className="w-full module-header cursor-pointer hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">TPA Competitive Index</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-2">
          {/* Reflect row */}
          <div className="flex items-center justify-between p-2.5 rounded bg-primary/10 border border-primary/20">
            <span className="text-xs font-semibold text-primary">Reflect AI</span>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-foreground">{fmtCurrency(combined.totalAnnualSavings)}</span>
              <span className="text-[9px] text-muted-foreground ml-2">{fmtDecimal(combined.roi)}x · {fmtDecimal(combined.paybackMonths)}mo</span>
            </div>
          </div>

          {BENCHMARKS.map((b) => (
            <div key={b.name} className="flex items-center justify-between p-2.5 rounded bg-secondary/20">
              <span className="text-xs text-muted-foreground">{b.name}</span>
              <div className="text-right">
                <span className="text-xs font-mono text-muted-foreground">
                  {b.savingsMultiple === 0 ? "$0" : fmtCurrency(combined.totalAnnualSavings * b.savingsMultiple)}
                </span>
                <span className="text-[9px] text-muted-foreground ml-2">
                  {b.roiMultiple}x · {b.paybackMonths === Infinity ? "N/A" : `${b.paybackMonths}mo`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
