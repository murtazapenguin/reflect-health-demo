import { DetailModal } from "./DetailModal";
import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface Props {
  metric: string | null;
  onClose: () => void;
}

export function FinancialBreakdownModal({ metric, onClose }: Props) {
  const { results, platformParams, callParams } = useDashboard();
  const { combined, callCenter, claims } = results;
  const [sensitivityAccuracy, setSensitivityAccuracy] = useState(callParams.accuracyPct);

  if (!metric) return null;

  const monthlySavings = combined.totalAnnualSavings / 12;
  const projectionData = Array.from({ length: 12 }, (_, i) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    savings: Math.round(monthlySavings * (i + 1)),
    adjusted: Math.round(monthlySavings * (sensitivityAccuracy / callParams.accuracyPct) * (i + 1)),
  }));

  return (
    <DetailModal open title="Financial Breakdown" onClose={onClose} width="max-w-2xl">
      <div className="space-y-4">
        {/* Savings breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest block">Call Center Savings</span>
            <span className="text-lg font-bold font-mono text-primary">{fmtCurrency(callCenter.annualSavings)}</span>
            <span className="text-[10px] text-muted-foreground block">{fmtDecimal(callCenter.fteSaved)} FTE saved</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest block">Claims Savings</span>
            <span className="text-lg font-bold font-mono text-primary">{fmtCurrency(claims.annualSavings)}</span>
            <span className="text-[10px] text-muted-foreground block">{fmtDecimal(claims.fteSaved)} FTE saved</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest block">Platform Cost</span>
            <span className="text-lg font-bold font-mono text-foreground">{fmtCurrency(platformParams.annualPlatformCost)}</span>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest block">Net Annual ROI</span>
            <span className="text-lg font-bold font-mono text-primary">{fmtDecimal(combined.roi)}x</span>
            <span className="text-[10px] text-muted-foreground block">Payback: {fmtDecimal(combined.paybackMonths)} months</span>
          </div>
        </div>

        {/* 12-month projection chart */}
        <div className="rounded-lg border border-border p-3">
          <span className="text-[10px] font-semibold text-foreground block mb-2">12-Month Cumulative Projection</span>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="modalSavingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(335, 100%, 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(335, 100%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 91%)", borderRadius: 6, fontSize: 11 }} formatter={(v: number) => [fmtCurrency(v), ""]} />
                <Area type="monotone" dataKey="savings" stroke="hsl(335, 100%, 60%)" strokeWidth={2} fill="url(#modalSavingsGrad)" name="Current" />
                <Area type="monotone" dataKey="adjusted" stroke="hsl(20, 90%, 55%)" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="Sensitivity" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sensitivity slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Accuracy Sensitivity</span>
            <span className="font-mono text-foreground">{(sensitivityAccuracy * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[sensitivityAccuracy]}
            min={0.5}
            max={1}
            step={0.01}
            onValueChange={([v]) => setSensitivityAccuracy(v)}
          />
          <span className="text-[9px] text-muted-foreground">Adjust to see impact on projections (dashed line)</span>
        </div>
      </div>
    </DetailModal>
  );
}
