import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCalls, useKPIs } from "@/hooks/use-api";
import { useLogout } from "@/hooks/use-logout";
import { format } from "date-fns";
import {
  Search, Filter, ChevronLeft, ChevronRight, Phone, LogOut, Mic,
  PhoneForwarded, Flag, TrendingUp, Clock, CheckCircle2, PhoneOff, Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import reflectLogo from "@/assets/reflect-health-logo.png";

const INTENT_STYLES: Record<string, string> = {
  eligibility: "bg-blue-100 text-blue-800",
  claims: "bg-purple-100 text-purple-800",
  prior_auth: "bg-orange-100 text-orange-800",
  general: "bg-gray-100 text-gray-600",
  other: "bg-gray-100 text-gray-600",
  unknown: "bg-gray-100 text-gray-600",
};

const OUTCOME_STYLES: Record<string, string> = {
  resolved: "bg-emerald-100 text-emerald-800",
  transferred: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  not_found: "bg-gray-100 text-gray-600",
  auth_failed: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-600",
};

export default function CallLogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: kpis } = useKPIs();

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
  const handleLogout = useLogout();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={reflectLogo}
              alt="Reflect Health"
              className="h-8 cursor-pointer"
              onClick={() => navigate("/")}
            />
            <span className="text-[10px] text-muted-foreground border-l border-border pl-3">
              Call Log
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => navigate("/")}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground" onClick={handleLogout}>
              <LogOut className="h-3 w-3 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-5 space-y-4">
        {/* KPI Summary Bar */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Calls</p>
                  <p className="text-lg font-bold font-mono">{kpis.total_calls}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deflection Rate</p>
                  <p className="text-lg font-bold font-mono">{(kpis.deflection_rate * 100).toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <PhoneOff className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Transfer Rate</p>
                  <p className="text-lg font-bold font-mono">{(kpis.transfer_rate * 100).toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Handle Time</p>
                  <p className="text-lg font-bold font-mono">
                    {Math.floor(kpis.avg_handle_time_seconds / 60)}:{String(Math.round(kpis.avg_handle_time_seconds % 60)).padStart(2, "0")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search provider, patient, or call ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={intent} onValueChange={(v) => { setIntent(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intents</SelectItem>
                  <SelectItem value="eligibility">Eligibility</SelectItem>
                  <SelectItem value="claims">Claims</SelectItem>
                  <SelectItem value="prior_auth">Prior Auth</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={outcome} onValueChange={(v) => { setOutcome(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-[140px] text-xs"
                  placeholder="Start date"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-[140px] text-xs"
                  placeholder="End date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              {data ? `${data.total} Calls` : "Loading..."}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive text-sm">
                Failed to load calls. Is the backend running?
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] w-[30px]"></TableHead>
                      <TableHead className="text-[11px]">Time</TableHead>
                      <TableHead className="text-[11px]">Source</TableHead>
                      <TableHead className="text-[11px]">Provider</TableHead>
                      <TableHead className="text-[11px]">Patient</TableHead>
                      <TableHead className="text-[11px]">Intent</TableHead>
                      <TableHead className="text-[11px]">Outcome</TableHead>
                      <TableHead className="text-[11px]">Duration</TableHead>
                      <TableHead className="text-[11px]">Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.map((call) => (
                      <TableRow
                        key={call.call_id}
                        className="cursor-pointer hover:bg-secondary/50"
                        onClick={() => navigate(`/calls/${call.call_id}`)}
                      >
                        <TableCell className="pr-0">
                          {call.flagged && (
                            <Flag className="h-3 w-3 text-red-500 fill-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">
                          {call.started_at
                            ? format(new Date(call.started_at), "MMM d, h:mm a")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {(call.source === "elevenlabs" || call.call_id?.startsWith("el_")) ? (
                            <Badge variant="outline" className="text-[8px] bg-purple-50 text-purple-700 border-purple-200 gap-0.5">
                              <Mic className="h-2 w-2" /> Browser
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px] bg-gray-50 text-gray-600 gap-0.5">
                              <Phone className="h-2 w-2" /> Phone
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px]">{call.provider_name || "—"}</TableCell>
                        <TableCell className="text-[11px]">{call.patient_name || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] ${INTENT_STYLES[call.intent] || INTENT_STYLES.unknown}`}
                          >
                            {call.intent?.replace("_", " ") || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="secondary"
                              className={`text-[9px] ${OUTCOME_STYLES[call.outcome] || OUTCOME_STYLES.unknown}`}
                            >
                              {call.outcome || "—"}
                            </Badge>
                            {call.transferred && (
                              <PhoneForwarded className="h-3 w-3 text-amber-600" title={call.transfer_reason || "Transferred to human"} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono">
                          {call.duration_seconds
                            ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, "0")}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {call.tags?.slice(0, 2).map((t) => (
                              <Badge key={t} variant="outline" className="text-[8px]">{t}</Badge>
                            ))}
                            {(call.tags?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-[8px]">+{call.tags.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data?.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                            <p className="text-sm font-medium text-muted-foreground">No calls found</p>
                            <p className="text-xs text-muted-foreground/70">
                              {search || intent !== "all" || outcome !== "all" || startDate || endDate
                                ? "Try adjusting your filters to see more results."
                                : "Calls will appear here once the AI agent handles them."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                    <span className="text-[11px] text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline" size="sm" disabled={page <= 1}
                        onClick={() => setPage(page - 1)} className="h-7 text-[10px]"
                      >
                        <ChevronLeft className="h-3 w-3" /> Prev
                      </Button>
                      <Button
                        variant="outline" size="sm" disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)} className="h-7 text-[10px]"
                      >
                        Next <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
