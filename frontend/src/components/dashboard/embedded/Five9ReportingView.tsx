import { useKPIs, useKPITrend } from "@/hooks/use-api";
import {
  Phone, CheckCircle2, PhoneOff, Clock, TrendingUp, TrendingDown,
  Shield, Target, FileText, ExternalLink, BarChart3, AlertTriangle,
} from "lucide-react";

const MOCK_QA = {
  overallAccuracy: 94.2,
  accuracyByIntent: [
    { intent: "Eligibility", accuracy: 96.8, total: 142 },
    { intent: "Claims", accuracy: 93.1, total: 87 },
    { intent: "Prior Auth", accuracy: 91.5, total: 34 },
    { intent: "General", accuracy: 89.7, total: 18 },
  ],
  confidenceDistribution: [
    { range: "95-100%", count: 156, pct: 55.7 },
    { range: "90-94%", count: 68, pct: 24.3 },
    { range: "85-89%", count: 32, pct: 11.4 },
    { range: "80-84%", count: 14, pct: 5.0 },
    { range: "<80%", count: 10, pct: 3.6 },
  ],
  recentReviews: [
    { id: "QA-1042", intent: "Eligibility", score: 98, status: "Passed", note: "Accurate coverage lookup" },
    { id: "QA-1041", intent: "Claims", score: 87, status: "Flagged", note: "Missing appeal deadline in response" },
    { id: "QA-1040", intent: "Eligibility", score: 95, status: "Passed", note: "Correct copay and deductible info" },
    { id: "QA-1039", intent: "Prior Auth", score: 72, status: "Failed", note: "Incorrect transfer routing" },
    { id: "QA-1038", intent: "Claims", score: 96, status: "Passed", note: "Accurate claim status with paid amount" },
  ],
};

interface Five9ReportingViewProps {
  onNavigateToCallLog: () => void;
}

export function Five9ReportingView({ onNavigateToCallLog }: Five9ReportingViewProps) {
  const { data: kpis, isLoading: kpisLoading } = useKPIs();
  const { data: trend } = useKPITrend(30);

  const trendMax = trend ? Math.max(...trend.map((t) => t.total_calls), 1) : 1;

  return (
    <div className="p-4 five9-panel-bg h-full overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-foreground">Reporting &amp; Tracking</div>
        <button
          onClick={onNavigateToCallLog}
          className="flex items-center gap-1 text-[10px] text-five9-accent hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View Call Log
        </button>
      </div>

      {/* Section A: Dashboard Overview KPIs */}
      {kpisLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-five9-accent/30 border-t-five9-accent rounded-full animate-spin" />
        </div>
      ) : kpis ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <KpiCard
              icon={Phone}
              label="Total Calls"
              value={String(kpis.total_calls)}
              color="text-five9-accent"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Deflection Rate"
              value={`${(kpis.deflection_rate * 100).toFixed(1)}%`}
              color="text-emerald-600"
              trend={kpis.deflection_rate > 0.5 ? "up" : "down"}
            />
            <KpiCard
              icon={PhoneOff}
              label="Transfer Rate"
              value={`${(kpis.transfer_rate * 100).toFixed(1)}%`}
              color="text-amber-600"
              trend={kpis.transfer_rate < 0.3 ? "up" : "down"}
            />
            <KpiCard
              icon={Clock}
              label="Avg Handle Time"
              value={`${Math.floor(kpis.avg_handle_time_seconds / 60)}:${String(Math.round(kpis.avg_handle_time_seconds % 60)).padStart(2, "0")}`}
              color="text-five9-accent"
            />
          </div>

          {/* Intent and Outcome breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Calls by Intent */}
            <div className="five9-card p-3 space-y-2">
              <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
                <BarChart3 className="h-3 w-3" /> Calls by Intent
              </span>
              <div className="space-y-1.5">
                {Object.entries(kpis.calls_by_intent).map(([key, count]) => {
                  const pct = kpis.total_calls > 0 ? (count / kpis.total_calls) * 100 : 0;
                  return (
                    <div key={key} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground font-medium capitalize">{key.replace("_", " ")}</span>
                        <span className="text-five9-muted font-mono">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full five9-accent-bg transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calls by Outcome */}
            <div className="five9-card p-3 space-y-2">
              <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
                <Target className="h-3 w-3" /> Calls by Outcome
              </span>
              <div className="space-y-1.5">
                {Object.entries(kpis.calls_by_outcome).map(([key, count]) => {
                  const pct = kpis.total_calls > 0 ? (count / kpis.total_calls) * 100 : 0;
                  const color = key === "resolved" ? "bg-emerald-500" : key === "transferred" ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={key} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground font-medium capitalize">{key.replace("_", " ")}</span>
                        <span className="text-five9-muted font-mono">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Trend chart */}
          {trend && trend.length > 0 && (
            <div className="five9-card p-3 space-y-2">
              <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> 30-Day Call Volume Trend
              </span>
              <div className="flex items-end gap-[2px] h-24">
                {trend.map((point) => {
                  const resolvedH = (point.resolved / trendMax) * 100;
                  const transferredH = (point.transferred / trendMax) * 100;
                  return (
                    <div
                      key={point.date}
                      className="flex-1 flex flex-col justify-end gap-px group relative"
                      title={`${point.date}: ${point.total_calls} calls (${point.resolved} resolved, ${point.transferred} transferred)`}
                    >
                      <div
                        className="rounded-t-sm bg-emerald-500 min-h-[1px] transition-all group-hover:opacity-80"
                        style={{ height: `${resolvedH}%` }}
                      />
                      <div
                        className="rounded-b-sm bg-amber-500 min-h-[1px] transition-all group-hover:opacity-80"
                        style={{ height: `${transferredH}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 text-[9px] text-five9-muted">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-emerald-500" /> Resolved
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-amber-500" /> Transferred
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="five9-card p-4 text-center text-[11px] text-five9-muted">
          No KPI data available
        </div>
      )}

      {/* Section B: Key Metrics */}
      <div className="five9-card p-3 space-y-2">
        <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
          <Target className="h-3 w-3" /> Key Performance Indicators
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded border border-border bg-secondary/20 text-center">
            <div className="text-[9px] text-five9-muted uppercase">Auth Success</div>
            <div className="text-lg font-bold font-mono text-foreground">
              {kpis ? `${(kpis.auth_success_rate * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
          <div className="p-2 rounded border border-border bg-secondary/20 text-center">
            <div className="text-[9px] text-five9-muted uppercase">AI Resolution</div>
            <div className="text-lg font-bold font-mono text-emerald-600">
              {kpis ? `${(kpis.deflection_rate * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
          <div className="p-2 rounded border border-border bg-secondary/20 text-center">
            <div className="text-[9px] text-five9-muted uppercase">Escalation</div>
            <div className="text-lg font-bold font-mono text-amber-600">
              {kpis ? `${(kpis.transfer_rate * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Section C: Quality Assurance (mock data) */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-five9-accent" />
          Quality Assurance
        </div>

        {/* Overall accuracy */}
        <div className="five9-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted">Overall AI Accuracy</span>
            <span className="text-lg font-bold font-mono text-emerald-600">{MOCK_QA.overallAccuracy}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${MOCK_QA.overallAccuracy}%` }}
            />
          </div>
        </div>

        {/* Accuracy by intent */}
        <div className="five9-card p-3 space-y-2">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <Target className="h-3 w-3" /> Accuracy by Intent
          </span>
          <div className="space-y-2">
            {MOCK_QA.accuracyByIntent.map((item) => (
              <div key={item.intent} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-foreground font-medium">{item.intent}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-five9-muted font-mono">{item.total} calls</span>
                    <span className={`font-bold font-mono ${item.accuracy >= 95 ? "text-emerald-600" : item.accuracy >= 90 ? "text-five9-accent" : "text-amber-600"}`}>
                      {item.accuracy}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.accuracy >= 95 ? "bg-emerald-500" : item.accuracy >= 90 ? "five9-accent-bg" : "bg-amber-500"
                    }`}
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence distribution */}
        <div className="five9-card p-3 space-y-2">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
            <BarChart3 className="h-3 w-3" /> Confidence Score Distribution
          </span>
          <div className="space-y-1">
            {MOCK_QA.confidenceDistribution.map((bucket) => (
              <div key={bucket.range} className="flex items-center gap-2 text-[10px]">
                <span className="w-14 text-five9-muted font-mono text-right shrink-0">{bucket.range}</span>
                <div className="flex-1 h-4 rounded bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded transition-all duration-500 ${
                      bucket.range.startsWith("95") || bucket.range.startsWith("90")
                        ? "bg-emerald-500"
                        : bucket.range.startsWith("85")
                          ? "five9-accent-bg"
                          : "bg-amber-500"
                    }`}
                    style={{ width: `${bucket.pct}%` }}
                  />
                </div>
                <span className="w-16 text-foreground font-mono shrink-0">{bucket.count} ({bucket.pct}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent QA reviews */}
        <div className="five9-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
              <FileText className="h-3 w-3" /> Recent QA Reviews
            </span>
            <button
              onClick={onNavigateToCallLog}
              className="text-[9px] text-five9-accent hover:underline flex items-center gap-0.5"
            >
              View in Call Log <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="space-y-1">
            {MOCK_QA.recentReviews.map((review) => (
              <div
                key={review.id}
                className="flex items-center justify-between p-2 rounded border border-border bg-card hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {review.status === "Passed" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  ) : review.status === "Flagged" ? (
                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-[10px] text-foreground font-medium">
                      {review.id} · {review.intent}
                    </div>
                    <div className="text-[9px] text-five9-muted">{review.note}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-mono font-bold ${
                    review.score >= 90 ? "text-emerald-600" : review.score >= 80 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {review.score}%
                  </span>
                  <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${
                    review.status === "Passed"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : review.status === "Flagged"
                        ? "text-amber-700 bg-amber-50 border-amber-200"
                        : "text-red-700 bg-red-50 border-red-200"
                  }`}>
                    {review.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  color: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="five9-card p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] text-five9-muted">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold font-mono text-foreground">{value}</span>
        {trend && (
          trend === "up"
            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
      </div>
    </div>
  );
}
