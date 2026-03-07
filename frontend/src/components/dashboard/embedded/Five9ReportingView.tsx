import { useKPIs, useKPITrend, useAccuracyKPIs } from "@/hooks/use-api";
import {
  Phone, CheckCircle2, PhoneOff, Clock, TrendingUp, TrendingDown,
  Shield, Target, FileText, ExternalLink, BarChart3, AlertTriangle,
  XCircle,
} from "lucide-react";

interface Five9ReportingViewProps {
  onNavigateToCallLog: () => void;
}

export function Five9ReportingView({ onNavigateToCallLog }: Five9ReportingViewProps) {
  const { data: kpis, isLoading: kpisLoading } = useKPIs();
  const { data: trend } = useKPITrend(30);
  const { data: accuracy, isLoading: accuracyLoading } = useAccuracyKPIs();

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

      {/* Section C: Quality Assurance (real data) */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-five9-accent" />
          Quality Assurance
        </div>

        {accuracyLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-4 h-4 border-2 border-five9-accent/30 border-t-five9-accent rounded-full animate-spin" />
          </div>
        ) : accuracy ? (
          <>
            {/* Overall accuracy + stats row */}
            <div className="five9-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="type-micro uppercase tracking-[0.12em] text-five9-muted">Overall AI Accuracy</span>
                <span className={`text-lg font-bold font-mono ${accuracy.avg_auto_score >= 90 ? "text-emerald-600" : accuracy.avg_auto_score >= 70 ? "text-five9-accent" : "text-amber-600"}`}>
                  {accuracy.avg_auto_score.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${accuracy.avg_auto_score >= 90 ? "bg-emerald-500" : accuracy.avg_auto_score >= 70 ? "five9-accent-bg" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(accuracy.avg_auto_score, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="text-center">
                  <div className="text-[9px] text-five9-muted uppercase">Scored</div>
                  <div className="text-[12px] font-bold font-mono text-foreground">{accuracy.total_scored}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-five9-muted uppercase">Reviewed</div>
                  <div className="text-[12px] font-bold font-mono text-foreground">{accuracy.total_reviewed}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-five9-muted uppercase">Needs Review</div>
                  <div className="text-[12px] font-bold font-mono text-amber-600">{accuracy.needs_review}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-five9-muted uppercase">Human Avg</div>
                  <div className="text-[12px] font-bold font-mono text-foreground">
                    {accuracy.avg_human_score !== null ? `${accuracy.avg_human_score.toFixed(1)}` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Accuracy by intent */}
            {Object.keys(accuracy.accuracy_by_intent).length > 0 && (
              <div className="five9-card p-3 space-y-2">
                <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
                  <Target className="h-3 w-3" /> Accuracy by Intent
                </span>
                <div className="space-y-2">
                  {Object.entries(accuracy.accuracy_by_intent).map(([intent, score]) => (
                    <div key={intent} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-foreground font-medium capitalize">{intent.replace("_", " ")}</span>
                        <span className={`font-bold font-mono ${score >= 90 ? "text-emerald-600" : score >= 70 ? "text-five9-accent" : "text-amber-600"}`}>
                          {score.toFixed(1)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            score >= 90 ? "bg-emerald-500" : score >= 70 ? "five9-accent-bg" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(score, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score distribution */}
            {Object.keys(accuracy.score_distribution).length > 0 && (() => {
              const totalDist = Object.values(accuracy.score_distribution).reduce((a, b) => a + b, 0);
              const orderedBuckets = ["90-100", "80-89", "70-79", "60-69", "0-59"];
              return (
                <div className="five9-card p-3 space-y-2">
                  <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> Score Distribution
                  </span>
                  <div className="space-y-1">
                    {orderedBuckets.map((range) => {
                      const count = accuracy.score_distribution[range] || 0;
                      const pct = totalDist > 0 ? (count / totalDist) * 100 : 0;
                      const barColor = range === "90-100" ? "bg-emerald-500"
                        : range === "80-89" ? "bg-blue-500"
                        : range === "70-79" ? "five9-accent-bg"
                        : "bg-amber-500";
                      return (
                        <div key={range} className="flex items-center gap-2 text-[10px]">
                          <span className="w-12 text-five9-muted font-mono text-right shrink-0">{range}</span>
                          <div className="flex-1 h-4 rounded bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-16 text-foreground font-mono shrink-0">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Category averages from human reviews */}
            {Object.keys(accuracy.category_averages).length > 0 && (
              <div className="five9-card p-3 space-y-2">
                <span className="type-micro uppercase tracking-[0.12em] text-five9-muted flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Human QA Category Averages
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(accuracy.category_averages).map(([cat, avg]) => (
                    <div key={cat} className="p-2 rounded border border-border bg-secondary/20 text-center">
                      <div className="text-[9px] text-five9-muted uppercase capitalize">{cat}</div>
                      <div className={`text-lg font-bold font-mono ${avg >= 90 ? "text-emerald-600" : avg >= 70 ? "text-five9-accent" : "text-amber-600"}`}>
                        {avg.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              {accuracy.recent_reviews.length === 0 ? (
                <p className="text-[10px] text-five9-muted text-center py-3">
                  No QA reviews yet. Open a call in the Call Log to submit one.
                </p>
              ) : (
                <div className="space-y-1">
                  {accuracy.recent_reviews.map((review) => (
                    <div
                      key={review.id}
                      className="flex items-center justify-between p-2 rounded border border-border bg-card hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {review.status === "passed" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        ) : review.status === "flagged" ? (
                          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                        ) : review.status === "failed" ? (
                          <XCircle className="h-3 w-3 text-red-600 shrink-0" />
                        ) : (
                          <FileText className="h-3 w-3 text-gray-500 shrink-0" />
                        )}
                        <div>
                          <div className="text-[10px] text-foreground font-medium">
                            {review.call_id} &middot; {review.reviewer}
                          </div>
                          {review.notes && <div className="text-[9px] text-five9-muted">{review.notes}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-mono font-bold ${
                          review.review_score >= 90 ? "text-emerald-600" : review.review_score >= 80 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {review.review_score}
                        </span>
                        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border capitalize ${
                          review.status === "passed"
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : review.status === "flagged"
                              ? "text-amber-700 bg-amber-50 border-amber-200"
                              : review.status === "failed"
                                ? "text-red-700 bg-red-50 border-red-200"
                                : "text-gray-600 bg-gray-50 border-gray-200"
                        }`}>
                          {review.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="five9-card p-4 text-center text-[11px] text-five9-muted">
            No accuracy data available yet. Calls will be auto-scored as they come in.
          </div>
        )}
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
