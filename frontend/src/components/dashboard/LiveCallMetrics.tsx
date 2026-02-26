import { useDashboard } from "@/contexts/DashboardContext";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "./MetricCard";
import { Phone, Clock, ArrowRightLeft, ShieldCheck, Activity, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format } from "date-fns";

export function LiveCallMetrics() {
  const { realKPIs, realTrend } = useDashboard();
  const navigate = useNavigate();

  if (!realKPIs) return null;

  const chartData = realTrend.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    total: d.total_calls,
    resolved: d.resolved,
    transferred: d.transferred,
  }));

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-semantic-coverage animate-pulse" />
          <span className="type-micro uppercase tracking-[0.15em] reflect-gradient-text font-semibold">
            Live Call Intelligence
          </span>
        </div>
        <button
          onClick={() => navigate("/calls")}
          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-all"
        >
          <ExternalLink className="h-3 w-3" />
          View Call Log
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Calls"
          value={String(realKPIs.total_calls)}
          icon={<Phone className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Deflection Rate"
          value={`${realKPIs.deflection_rate.toFixed(1)}%`}
          trend="positive"
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Avg Handle Time"
          value={`${realKPIs.avg_handle_time_seconds.toFixed(0)}s`}
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Auth Success"
          value={`${realKPIs.auth_success_rate.toFixed(1)}%`}
          trend="positive"
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Call volume trend */}
        {chartData.length > 0 && (
          <div className="border border-border rounded-lg bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="type-micro uppercase tracking-[0.15em] text-muted-foreground">Call Volume (30d)</span>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="resolved" stackId="1" fill="hsl(152, 40%, 50%)" fillOpacity={0.3} stroke="hsl(152, 40%, 50%)" name="Resolved" />
                  <Area type="monotone" dataKey="transferred" stackId="1" fill="hsl(38, 92%, 50%)" fillOpacity={0.3} stroke="hsl(38, 92%, 50%)" name="Transferred" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Intent + Outcome breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border rounded-lg bg-card p-4">
            <span className="type-micro uppercase tracking-[0.15em] text-muted-foreground">By Intent</span>
            <div className="mt-3 space-y-2">
              {Object.entries(realKPIs.calls_by_intent)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([intent, count]) => (
                  <div key={intent} className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground capitalize">{intent.replace("_", " ")}</span>
                    <span className="text-[11px] font-mono font-medium text-foreground">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="border border-border rounded-lg bg-card p-4">
            <span className="type-micro uppercase tracking-[0.15em] text-muted-foreground">By Outcome</span>
            <div className="mt-3 space-y-2">
              {Object.entries(realKPIs.calls_by_outcome)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([outcome, count]) => (
                  <div key={outcome} className="flex items-center justify-between">
                    <span className={`text-[11px] capitalize ${
                      outcome === "resolved" ? "text-emerald-600" :
                      outcome === "transferred" ? "text-amber-600" :
                      "text-foreground"
                    }`}>{outcome.replace("_", " ")}</span>
                    <span className="text-[11px] font-mono font-medium text-foreground">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
