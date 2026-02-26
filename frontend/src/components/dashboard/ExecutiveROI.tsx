import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import { MetricCard } from "./MetricCard";
import { CountUpValue } from "./CountUpValue";
import { ExecutiveWalkthroughButton } from "./ExecutiveWalkthrough";
import { Slider } from "@/components/ui/slider";
import { DollarSign, TrendingUp, Clock, Users } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FinancialBreakdownModal } from "./FinancialBreakdownModal";

export function ExecutiveROI() {
  const { results, mode, platformParams, setPlatformParams } = useDashboard();
  const { combined, callCenter, claims } = results;
  const [breakdownMetric, setBreakdownMetric] = useState<string | null>(null);

  const monthlySavings = combined.totalAnnualSavings / 12;
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    savings: Math.round(monthlySavings * (i + 1)),
    cost: platformParams.annualPlatformCost,
  }));

  return (
    <div className="space-y-5">
      {/* Walkthrough button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Executive Summary
        </span>
        <div className="flex items-center gap-2">
          <ExecutiveWalkthroughButton />
        </div>
      </div>

      {/* Hero metrics — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button id="total-savings" className="metric-card flex flex-col gap-1.5 reflect-border text-left hover:border-primary/40 transition-colors tint-savings" onClick={() => setBreakdownMetric("savings")}>
          <div className="flex items-center justify-between">
            <span className="metric-label">Total Annual Savings</span>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <CountUpValue
            value={combined.totalAnnualSavings}
            formatter={fmtCurrency}
            className="metric-value metric-positive"
          />
        </button>
        <button id="roi-multiple" className="metric-card flex flex-col gap-1.5 reflect-border text-left hover:border-primary/40 transition-colors" onClick={() => setBreakdownMetric("roi")}>
          <div className="flex items-center justify-between">
            <span className="metric-label">ROI Multiple</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <CountUpValue
            value={combined.roi}
            formatter={(n) => `${fmtDecimal(n)}x`}
            className="metric-value metric-positive"
          />
        </button>
        <button id="payback-period" className="text-left hover:border-primary/40 transition-colors rounded-lg" onClick={() => setBreakdownMetric("payback")}>
          <MetricCard
            label="Payback Period"
            value={`${fmtDecimal(combined.paybackMonths)} mo`}
            trend="positive"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        </button>
        <button id="fte-reduction" className="text-left hover:border-primary/40 transition-colors rounded-lg tint-fte" onClick={() => setBreakdownMetric("fte")}>
          <MetricCard
            label="Total FTE Reduction"
            value={fmtDecimal(callCenter.fteSaved + claims.fteSaved)}
            sub={`Calls: ${fmtDecimal(callCenter.fteSaved)} · Claims: ${fmtDecimal(claims.fteSaved)}`}
            trend="positive"
            icon={<Users className="h-3.5 w-3.5" />}
          />
        </button>
      </div>

      {/* 12-month chart */}
      <div id="savings-chart" className="module-panel">
        <div className="module-header">
          <span className="text-xs font-semibold text-foreground">12-Month Cumulative Savings</span>
        </div>
        <div className="p-4 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(335, 100%, 60%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(335, 100%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 10 }}
                axisLine={{ stroke: "hsl(220, 13%, 91%)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(220, 13%, 91%)",
                  borderRadius: 6,
                  fontSize: 11,
                }}
                formatter={(value: number) => [fmtCurrency(value), "Cumulative Savings"]}
              />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="hsl(335, 100%, 60%)"
                strokeWidth={2}
                fill="url(#savingsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform Investment — always visible */}
      <div className="module-panel p-4 space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-semibold">Annual Platform Investment</span>
          <span className="font-mono text-foreground">{fmtCurrency(platformParams.annualPlatformCost)}</span>
        </div>
        {mode === "internal" && (
          <Slider
            value={[platformParams.annualPlatformCost]}
            min={50000}
            max={500000}
            step={10000}
            onValueChange={([v]) => setPlatformParams({ annualPlatformCost: v })}
          />
        )}
      </div>

      <FinancialBreakdownModal metric={breakdownMetric} onClose={() => setBreakdownMetric(null)} />
    </div>
  );
}
