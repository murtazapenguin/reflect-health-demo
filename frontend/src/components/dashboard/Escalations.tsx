import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCalls } from "@/hooks/use-api";
import { format } from "date-fns";
import {
  AlertTriangle, Clock, Phone, User, ArrowRight, MessageSquare,
  ShieldAlert, Frown, HelpCircle, ExternalLink, PhoneForwarded,
  Mic, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const REASON_ICONS: Record<string, typeof Frown> = {
  frustration: Frown,
  "auth-failed": ShieldAlert,
  "out-of-scope": HelpCircle,
};

function getReasonCategory(reason?: string | null, tags?: string[]): string {
  if (!reason && !tags) return "out-of-scope";
  const lower = (reason || "").toLowerCase();
  const tagStr = (tags || []).join(" ").toLowerCase();
  if (lower.includes("frustrat") || tagStr.includes("frustration")) return "frustration";
  if (lower.includes("auth") || tagStr.includes("auth-failed")) return "auth-failed";
  return "out-of-scope";
}

const REASON_LABELS: Record<string, string> = {
  frustration: "Caller Frustrated",
  "auth-failed": "Auth Failed",
  "out-of-scope": "Out of AI Scope",
};

const REASON_COLORS: Record<string, string> = {
  frustration: "bg-red-100 text-red-800 border-red-200",
  "auth-failed": "bg-amber-100 text-amber-800 border-amber-200",
  "out-of-scope": "bg-blue-100 text-blue-800 border-blue-200",
};

export function Escalations() {
  const navigate = useNavigate();
  const [page] = useState(1);

  const { data, isLoading } = useCalls({
    page,
    page_size: 50,
    outcome: "transferred",
  });

  const calls = data?.items || [];

  const frustrationCount = calls.filter(
    (c) => getReasonCategory(c.transfer_reason, c.tags) === "frustration"
  ).length;
  const authFailCount = calls.filter(
    (c) => getReasonCategory(c.transfer_reason, c.tags) === "auth-failed"
  ).length;
  const scopeCount = calls.filter(
    (c) => getReasonCategory(c.transfer_reason, c.tags) === "out-of-scope"
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <PhoneForwarded className="h-4 w-4 text-amber-700" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Escalation Queue
            {calls.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-[9px]">
                {calls.length} transfers
              </Badge>
            )}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Calls transferred to human agents — review context, transcript, and resolution
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <PhoneForwarded className="w-3.5 h-3.5 text-amber-600" />
              <span className="type-micro text-muted-foreground uppercase">Total Escalations</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{data?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Frown className="w-3.5 h-3.5 text-red-600" />
              <span className="type-micro text-muted-foreground uppercase">Frustration</span>
            </div>
            <p className="text-2xl font-bold font-mono text-red-600">{frustrationCount}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span className="type-micro text-muted-foreground uppercase">Auth Failed</span>
            </div>
            <p className="text-2xl font-bold font-mono text-amber-600">{authFailCount}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span className="type-micro text-muted-foreground uppercase">Out of Scope</span>
            </div>
            <p className="text-2xl font-bold font-mono text-blue-600">{scopeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalation list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Escalated Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PhoneForwarded className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No escalated calls yet</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Calls that get transferred to a human agent will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => {
                const category = getReasonCategory(call.transfer_reason, call.tags);
                const ReasonIcon = REASON_ICONS[category] || HelpCircle;
                const isElevenlabs = call.source === "elevenlabs" || call.call_id?.startsWith("el_");

                return (
                  <div
                    key={call.call_id}
                    className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer"
                    onClick={() => navigate(`/calls/${call.call_id}`)}
                  >
                    {/* Reason icon */}
                    <div className={`shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${
                      category === "frustration" ? "bg-red-100" :
                      category === "auth-failed" ? "bg-amber-100" : "bg-blue-100"
                    }`}>
                      <ReasonIcon className={`h-4 w-4 ${
                        category === "frustration" ? "text-red-600" :
                        category === "auth-failed" ? "text-amber-600" : "text-blue-600"
                      }`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">
                          {call.provider_name || "Unknown Provider"}
                        </span>
                        <Badge variant="secondary" className={`text-[8px] border ${REASON_COLORS[category]}`}>
                          {REASON_LABELS[category]}
                        </Badge>
                        {isElevenlabs ? (
                          <Badge variant="outline" className="text-[8px] bg-purple-50 text-purple-700 border-purple-200">
                            <Mic className="h-2 w-2 mr-0.5" /> In-Browser
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[8px] bg-gray-50 text-gray-600">
                            <Phone className="h-2 w-2 mr-0.5" /> Phone
                          </Badge>
                        )}
                      </div>

                      {call.transfer_reason && (
                        <p className="text-[11px] text-muted-foreground mb-1 truncate">
                          {call.transfer_reason}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {call.started_at
                            ? format(new Date(call.started_at), "MMM d, h:mm a")
                            : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {call.duration_seconds}s
                        </span>
                        {call.intent && (
                          <span className="flex items-center gap-1">
                            <ArrowRight className="h-2.5 w-2.5" />
                            {call.intent.replace("_", " ")}
                          </span>
                        )}
                        {call.patient_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {call.patient_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0 flex items-center self-center">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-amber-600 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
