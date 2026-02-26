import { useDashboard } from "@/contexts/DashboardContext";
import { X } from "lucide-react";
import { Slider } from "@/components/ui/slider";

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

export function ControlsDrawer() {
  const {
    drawerOpen,
    setDrawerOpen,
    callParams,
    setCallParams,
    claimsParams,
    setClaimsParams,
    platformParams,
    setPlatformParams,
    mode,
  } = useDashboard();

  if (!drawerOpen) return null;

  const fmtDollar = (v: number) => `$${v}`;
  const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const fmtNum = (v: number) => v.toLocaleString();
  const fmtMin = (v: number) => `${v} min`;

  return (
    <>
      <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-card border-l border-border z-50 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Interactive Controls</h2>
          <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Call Center */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Call Center</h3>
            <SliderRow label="Monthly Calls" value={callParams.monthlyCalls} min={1000} max={100000} step={1000} format={fmtNum} onChange={(v) => setCallParams({ ...callParams, monthlyCalls: v })} />
            <SliderRow label="Handle Time" value={callParams.handleTimeMin} min={2} max={20} step={0.5} format={fmtMin} onChange={(v) => setCallParams({ ...callParams, handleTimeMin: v })} />
            <SliderRow label="Agent Cost / Hr" value={callParams.agentCostHr} min={12} max={50} step={1} format={fmtDollar} onChange={(v) => setCallParams({ ...callParams, agentCostHr: v })} />
            <SliderRow label="Provider %" value={callParams.providerPct} min={0.1} max={0.8} step={0.05} format={fmtPct} onChange={(v) => setCallParams({ ...callParams, providerPct: v })} />
            <SliderRow label="Eligible %" value={callParams.eligiblePct} min={0.1} max={1} step={0.05} format={fmtPct} onChange={(v) => setCallParams({ ...callParams, eligiblePct: v })} />
            <SliderRow label="Accuracy %" value={callParams.accuracyPct} min={0.5} max={1} step={0.01} format={fmtPct} onChange={(v) => setCallParams({ ...callParams, accuracyPct: v })} />
            <SliderRow label="AI Process Savings %" value={callParams.aiProcessSavingsPct} min={0.1} max={0.9} step={0.05} format={fmtPct} onChange={(v) => setCallParams({ ...callParams, aiProcessSavingsPct: v })} />
          </div>

          {/* Claims */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Claims</h3>
            <SliderRow label="Monthly Claims" value={claimsParams.monthlyClaims} min={1000} max={100000} step={1000} format={fmtNum} onChange={(v) => setClaimsParams({ ...claimsParams, monthlyClaims: v })} />
            <SliderRow label="Manual Review %" value={claimsParams.manualReviewPct} min={0.1} max={0.8} step={0.05} format={fmtPct} onChange={(v) => setClaimsParams({ ...claimsParams, manualReviewPct: v })} />
            <SliderRow label="Manual Time" value={claimsParams.manualTimeMin} min={2} max={30} step={1} format={fmtMin} onChange={(v) => setClaimsParams({ ...claimsParams, manualTimeMin: v })} />
            <SliderRow label="FTE Hourly Cost" value={claimsParams.fteHourlyCost} min={15} max={60} step={1} format={fmtDollar} onChange={(v) => setClaimsParams({ ...claimsParams, fteHourlyCost: v })} />
            <SliderRow label="AI Labor Reduction %" value={claimsParams.aiLaborReductionPct} min={0.1} max={0.9} step={0.05} format={fmtPct} onChange={(v) => setClaimsParams({ ...claimsParams, aiLaborReductionPct: v })} />
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Platform</h3>
            <SliderRow label="Annual Platform Cost" value={platformParams.annualPlatformCost} min={50000} max={500000} step={10000} format={(v) => `$${(v / 1000).toFixed(0)}K`} onChange={(v) => setPlatformParams({ annualPlatformCost: v })} />
          </div>

          {mode === "internal" && (
            <p className="text-[10px] text-muted-foreground italic">
              Margin data and compliance depth visible in Internal mode only.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
