import { useState } from "react";
import { useCalls, useCallDetail } from "@/hooks/use-api";
import { format } from "date-fns";
import {
  Search, Filter, ChevronLeft, ChevronRight, Phone, Mic, Flag,
  PhoneForwarded, ArrowLeft, Clock, User, ShieldCheck, X, Calendar,
} from "lucide-react";

const INTENT_STYLES: Record<string, string> = {
  eligibility: "text-blue-700 bg-blue-50 border-blue-200",
  claims: "text-purple-700 bg-purple-50 border-purple-200",
  prior_auth: "text-orange-700 bg-orange-50 border-orange-200",
  general: "text-gray-600 bg-gray-50 border-gray-200",
  other: "text-gray-600 bg-gray-50 border-gray-200",
  unknown: "text-gray-600 bg-gray-50 border-gray-200",
};

const OUTCOME_STYLES: Record<string, string> = {
  resolved: "text-emerald-700 bg-emerald-50 border-emerald-200",
  transferred: "text-amber-700 bg-amber-50 border-amber-200",
  failed: "text-red-700 bg-red-50 border-red-200",
  not_found: "text-gray-600 bg-gray-50 border-gray-200",
  auth_failed: "text-red-700 bg-red-50 border-red-200",
  unknown: "text-gray-600 bg-gray-50 border-gray-200",
};

function CallDetailInline({ callId, onBack }: { callId: string; onBack: () => void }) {
  const { data: call, isLoading, error } = useCallDetail(callId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-five9-accent/30 border-t-five9-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="p-4 text-center">
        <p className="text-[11px] text-five9-muted mb-2">Call not found</p>
        <button onClick={onBack} className="text-[11px] text-five9-accent hover:underline">Back to list</button>
      </div>
    );
  }

  const data = call.extracted_data || {};
  const fmtDate = (d?: string) => d ? format(new Date(d), "MMM d, h:mm a") : "—";

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center gap-2 shrink-0">
        <button onClick={onBack} className="p-1 rounded hover:bg-secondary transition-colors">
          <ArrowLeft className="h-3.5 w-3.5 text-five9-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-foreground truncate">
              {call.intent === "eligibility" ? "Eligibility" : call.intent === "claims" ? "Claims" : call.intent === "prior_auth" ? "Prior Auth" : "Call"}
              {call.provider_name ? ` — ${call.provider_name}` : ""}
            </span>
            {(call.source === "elevenlabs" || call.call_id?.startsWith("el_")) ? (
              <span className="text-[8px] font-medium px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 shrink-0">
                <Mic className="h-2 w-2 inline mr-0.5" />Browser
              </span>
            ) : (
              <span className="text-[8px] font-medium px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200 shrink-0">
                <Phone className="h-2 w-2 inline mr-0.5" />Phone
              </span>
            )}
          </div>
          <span className="text-[10px] text-five9-muted">{fmtDate(call.started_at)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2">
          {([
            { icon: Clock, label: "Duration", value: `${call.duration_seconds}s` },
            { icon: Phone, label: "Intent", value: call.intent?.replace("_", " ") || "—" },
            { icon: User, label: "Outcome", value: call.outcome || "—" },
            { icon: ShieldCheck, label: "Auth", value: call.auth_success ? "Pass" : call.auth_success === false ? "Fail" : "N/A" },
          ] as const).map((m) => (
            <div key={m.label} className="five9-card p-2 text-center">
              <m.icon className="h-3 w-3 text-five9-muted mx-auto mb-0.5" />
              <div className="text-[9px] text-five9-muted uppercase">{m.label}</div>
              <div className="text-[11px] font-semibold text-foreground">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Transfer info */}
        {call.transferred && call.transfer_reason && (
          <div className="five9-card p-2.5 border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-1.5 mb-1">
              <PhoneForwarded className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-semibold text-amber-700 uppercase">Transfer Reason</span>
            </div>
            <p className="text-[11px] text-amber-800">{call.transfer_reason}</p>
          </div>
        )}

        {/* Call info */}
        <div className="five9-card p-2.5 space-y-1.5">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted">Call Info</span>
          {([
            ["Provider", call.provider_name],
            ["NPI", call.provider_npi],
            ["Patient", call.patient_name],
            ["DOB", call.patient_dob],
            ["Started", fmtDate(call.started_at)],
            ["Ended", fmtDate(call.ended_at)],
          ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-[10px]">
              <span className="text-five9-muted">{label}</span>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>

        {/* Extracted data */}
        {Object.keys(data).length > 0 && (
          <div className="five9-card p-2.5 space-y-1.5">
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted">Extracted Data</span>
            {Object.entries(data).filter(([, v]) => v != null && v !== "").map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-[10px]">
                <span className="text-five9-muted">{key.replace(/_/g, " ")}</span>
                <span className="font-medium text-foreground font-mono max-w-[60%] truncate text-right" title={String(value)}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {call.tags?.length > 0 && (
          <div className="five9-card p-2.5">
            <span className="type-micro uppercase tracking-[0.12em] text-five9-muted block mb-1.5">Tags</span>
            <div className="flex flex-wrap gap-1">
              {call.tags.map((t) => (
                <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="five9-card p-2.5 space-y-2">
          <span className="type-micro uppercase tracking-[0.12em] text-five9-muted">Transcript</span>
          {call.transcript.length === 0 ? (
            <p className="text-[10px] text-five9-muted text-center py-4">No transcript available</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {call.transcript.map((entry, idx) => (
                <div key={idx} className={`text-[10px] p-2 rounded ${
                  entry.speaker === "AI" ? "bg-primary/5 border border-primary/10" : "bg-secondary/50 border border-border"
                }`}>
                  <span className={`font-semibold uppercase text-[9px] ${
                    entry.speaker === "AI" ? "text-primary" : "text-five9-muted"
                  }`}>{entry.speaker}</span>
                  <p className="text-foreground mt-0.5 leading-relaxed">{entry.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Five9CallLog() {
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const pageSize = 15;

  const { data, isLoading, error } = useCalls({
    page,
    page_size: pageSize,
    search: search || null,
    intent: intent !== "all" ? intent : null,
    outcome: outcome !== "all" ? outcome : null,
    start_date: startDate || null,
    end_date: endDate || null,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  if (selectedCallId) {
    return (
      <div className="five9-panel-bg h-full">
        <CallDetailInline callId={selectedCallId} onBack={() => setSelectedCallId(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 five9-panel-bg h-full overflow-y-auto space-y-3">
      <div className="text-xs font-semibold text-foreground">Call Log</div>

      {/* Filters */}
      <div className="five9-card p-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-five9-muted" />
            <input
              type="text"
              placeholder="Search provider, patient, call ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-7 pr-2 py-1.5 text-[10px] rounded border border-border bg-card text-foreground placeholder:text-five9-muted focus:outline-none focus:border-five9-accent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-five9-muted pointer-events-none" />
            <select
              value={intent}
              onChange={(e) => { setIntent(e.target.value); setPage(1); }}
              className="pl-6 pr-2 py-1.5 text-[10px] rounded border border-border bg-card text-foreground focus:outline-none focus:border-five9-accent appearance-none cursor-pointer"
            >
              <option value="all">All Intents</option>
              <option value="eligibility">Eligibility</option>
              <option value="claims">Claims</option>
              <option value="prior_auth">Prior Auth</option>
              <option value="other">Other</option>
            </select>
          </div>
          <select
            value={outcome}
            onChange={(e) => { setOutcome(e.target.value); setPage(1); }}
            className="px-2 py-1.5 text-[10px] rounded border border-border bg-card text-foreground focus:outline-none focus:border-five9-accent appearance-none cursor-pointer"
          >
            <option value="all">All Outcomes</option>
            <option value="resolved">Resolved</option>
            <option value="transferred">Transferred</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <Calendar className="h-3 w-3 text-five9-muted shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-1.5 py-1 text-[10px] rounded border border-border bg-card text-foreground focus:outline-none focus:border-five9-accent"
          />
          <span className="text-five9-muted">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-1.5 py-1 text-[10px] rounded border border-border bg-card text-foreground focus:outline-none focus:border-five9-accent"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
              className="p-0.5 rounded hover:bg-secondary text-five9-muted"
              title="Clear dates"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-five9-muted">
          {data ? `${data.total} call${data.total !== 1 ? "s" : ""}` : "Loading..."}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-five9-accent/30 border-t-five9-accent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-[11px] text-red-600">Failed to load calls.</div>
      ) : (
        <>
          <div className="five9-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2 w-[24px]"></th>
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2">Time</th>
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2">Src</th>
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2">Provider</th>
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2">Patient</th>
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2">Intent</th>
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2">Outcome</th>
                  <th className="text-left text-[9px] font-semibold text-five9-muted uppercase tracking-wider px-2.5 py-2">Dur</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((call) => (
                  <tr
                    key={call.call_id}
                    onClick={() => setSelectedCallId(call.call_id)}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="px-2.5 py-2">
                      {call.flagged && <Flag className="h-2.5 w-2.5 text-red-500 fill-red-500" />}
                    </td>
                    <td className="px-2.5 py-2 text-[10px] font-mono text-five9-muted whitespace-nowrap">
                      {call.started_at ? format(new Date(call.started_at), "MMM d, h:mm a") : "—"}
                    </td>
                    <td className="px-2.5 py-2">
                      {(call.source === "elevenlabs" || call.call_id?.startsWith("el_")) ? (
                        <Mic className="h-3 w-3 text-purple-600" title="Browser" />
                      ) : (
                        <Phone className="h-3 w-3 text-five9-muted" title="Phone" />
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-[10px] text-foreground max-w-[100px] truncate">{call.provider_name || "—"}</td>
                    <td className="px-2.5 py-2 text-[10px] text-foreground max-w-[100px] truncate">{call.patient_name || "—"}</td>
                    <td className="px-2.5 py-2">
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${INTENT_STYLES[call.intent] || INTENT_STYLES.unknown}`}>
                        {call.intent?.replace("_", " ") || "—"}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded border ${OUTCOME_STYLES[call.outcome] || OUTCOME_STYLES.unknown}`}>
                          {call.outcome || "—"}
                        </span>
                        {call.transferred && <PhoneForwarded className="h-2.5 w-2.5 text-amber-600" />}
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-[10px] font-mono text-five9-muted">
                      {call.duration_seconds
                        ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, "0")}`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <p className="text-[11px] text-five9-muted">No calls found</p>
                      <p className="text-[10px] text-five9-muted/70 mt-1">
                        {search || intent !== "all" || outcome !== "all" || startDate || endDate
                          ? "Try adjusting your filters."
                          : "Calls will appear here once the AI agent handles them."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-five9-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" /> Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
